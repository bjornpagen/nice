import { auth, currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"
import type { OneRosterClassReadSchemaType } from "@/lib/oneroster"
import { Content } from "./content"

// Define types based on OneRoster data
export type Course = OneRosterClassReadSchemaType & {
	units: Unit[]
	subject?: string
	courseSlug?: string
	courseDescription?: string
	coursePath?: string
	metadata?: Record<string, unknown>
} // A "Course" is now a OneRoster "Class"
export type Unit = {
	id: string
	title: string
	path: string
	courseId: string
	ordering: number
	description: string | null
	slug: string
}
export type AllSubject = {
	slug: string
	title: string
	courses: AllCourse[]
}
export type AllCourse = {
	id: string // This will now be the class's sourcedId
	slug: string
	title: string
	path: string
}

const ONEROSTER_ORG_ID = "nice-academy"

// Helper function to extract slug from sourcedId (e.g., "nice:some-slug:exercise" -> "some-slug")
function extractSlugFromSourcedId(sourcedId: string): string {
	let slug = sourcedId.startsWith("nice:") ? sourcedId.substring(5) : sourcedId
	// Remove colon-based type suffix (e.g., ":exercise", ":video", ":article")
	slug = slug.replace(/:(exercise|video|article)$/, "")
	return slug
}

// Helper function to extract metadata value
function getMetadataValue(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
	if (!metadata) return undefined
	const value = metadata[key]
	return typeof value === "string" ? value : undefined
}

// New data fetching function for enrolled classes
async function getUserEnrolledClasses(userId: string): Promise<Course[]> {
	const user = await currentUser()
	if (!user) {
		throw errors.new("user not authenticated")
	}
	const sourceId = typeof user.publicMetadata.sourceId === "string" ? user.publicMetadata.sourceId : undefined
	if (!sourceId) {
		logger.warn("user missing sourceId, cannot fetch enrolled classes", { userId })
		return []
	}

	// Get user's current active enrollments to filter classes
	const [classesResult, enrollmentsResult, allCoursesResult] = await Promise.all([
		errors.try(oneroster.getClassesForUser(sourceId)),
		errors.try(oneroster.getEnrollmentsForUser(sourceId)),
		errors.try(oneroster.getAllCourses())
	])

	if (classesResult.error) {
		logger.error("failed to fetch classes for user", { sourceId, error: classesResult.error })
		return []
	}
	if (enrollmentsResult.error) {
		logger.error("failed to fetch enrollments for user", { sourceId, error: enrollmentsResult.error })
		return []
	}
	if (allCoursesResult.error) {
		logger.error("failed to fetch all courses", { error: allCoursesResult.error })
		return []
	}

	const allClasses = classesResult.data
	const activeEnrollments = enrollmentsResult.data
	const allCourses = allCoursesResult.data

	// Create a set of class IDs that have active enrollments
	const activeClassIds = new Set(activeEnrollments.map((e) => e.class.sourcedId))

	// Filter classes to only those with active enrollments
	const classes = allClasses.filter((cls) => activeClassIds.has(cls.sourcedId))

	logger.info("filtered user classes by active enrollments", {
		sourceId,
		totalClasses: allClasses.length,
		activeEnrollments: activeEnrollments.length,
		filteredClasses: classes.length,
		activeClassIds: Array.from(activeClassIds),
		classIds: classes.map((c) => c.sourcedId)
	})

	// Get all courses to extract subject information
	const coursesMap = new Map(allCourses.map((c) => [c.sourcedId, c]))

	// Fetch course components (units) for each class
	const coursesWithUnits = await Promise.all(
		classes.map(async (oneRosterClass) => {
			const courseSourcedId = oneRosterClass.course.sourcedId
			const course = coursesMap.get(courseSourcedId)

			// Extract subject and course slug for proper path generation
			const subject = course?.subjects?.[0] || "unknown"
			const courseSlug = extractSlugFromSourcedId(courseSourcedId)
			const courseDescription = getMetadataValue(course?.metadata, "description")
			const coursePath = getMetadataValue(course?.metadata, "path")

			// Fetch course components for this course (these will be our units)
			const courseComponentsResult = await errors.try(oneroster.getCourseComponentsForCourse(courseSourcedId))

			let units: Unit[] = []
			if (courseComponentsResult.error) {
				logger.warn("failed to fetch course components for class", {
					classId: oneRosterClass.sourcedId,
					courseId: courseSourcedId,
					error: courseComponentsResult.error
				})
			} else {
				// Map course components to Unit structure with paths from OneRoster metadata
				units = courseComponentsResult.data.map((component, index) => {
					const unitSlug = extractSlugFromSourcedId(component.sourcedId)
					// Prioritize OneRoster metadata path, fallback to generated path only if needed
					const metadataPath = getMetadataValue(component.metadata, "path")
					const fallbackPath = `/${subject}/${courseSlug}/${unitSlug}`

					return {
						id: component.sourcedId,
						title: component.title,
						// Use OneRoster metadata path first, fallback to generated path
						path: metadataPath || fallbackPath,
						courseId: courseSourcedId,
						ordering: component.sortOrder || index,
						description: component.metadata?.description ? String(component.metadata.description) : "",
						slug: unitSlug
					}
				})
			}

			return {
				...oneRosterClass,
				units,
				// Add subject and courseSlug for use in course card
				subject,
				courseSlug,
				courseDescription,
				coursePath,
				metadata: course?.metadata
			}
		})
	)

	return coursesWithUnits
}

// New data fetching function for the course selector
async function getClassesForSelector(): Promise<AllSubject[]> {
	logger.info("fetching course selector data from oneroster api", { orgId: ONEROSTER_ORG_ID })

	const [classesResult, coursesResult] = await Promise.all([
		errors.try(oneroster.getClassesForSchool(ONEROSTER_ORG_ID)),
		errors.try(oneroster.getAllCourses())
	])

	if (classesResult.error) {
		logger.error("failed to fetch classes from oneroster", { error: classesResult.error })
		return []
	}
	if (coursesResult.error) {
		logger.error("failed to fetch courses from oneroster", { error: coursesResult.error })
		return []
	}

	const allClasses = classesResult.data
	const allCourses = coursesResult.data
	const coursesMap = new Map(allCourses.map((c) => [c.sourcedId, c]))
	const coursesBySubject = new Map<string, AllCourse[]>()

	for (const oneRosterClass of allClasses) {
		const course = coursesMap.get(oneRosterClass.course.sourcedId)
		if (!course || !course.subjects || course.subjects.length === 0) continue

		// Extract subject and course slug for proper path generation
		const subject = course.subjects[0]
		const courseSlug = extractSlugFromSourcedId(oneRosterClass.course.sourcedId)

		// Prioritize OneRoster course metadata path, fallback to generated path
		const metadataPath = getMetadataValue(course.metadata, "path")
		const fallbackPath = `/${subject}/${courseSlug}`
		const coursePath = metadataPath || fallbackPath

		const courseForSelector: AllCourse = {
			id: oneRosterClass.sourcedId, // Use class sourcedId as the unique ID
			slug: courseSlug,
			title: oneRosterClass.title,
			path: coursePath
		}

		for (const subject of course.subjects) {
			if (!coursesBySubject.has(subject)) {
				coursesBySubject.set(subject, [])
			}
			const subjectCourses = coursesBySubject.get(subject)
			if (subjectCourses && !subjectCourses.some((c) => c.id === courseForSelector.id)) {
				subjectCourses.push(courseForSelector)
			}
		}
	}

	return Array.from(coursesBySubject.entries())
		.map(([subjectTitle, courses]) => ({
			slug: subjectTitle.toLowerCase().replace(/\s+/g, "-"),
			title: subjectTitle,
			courses: courses.sort((a, b) => a.title.localeCompare(b.title))
		}))
		.sort((a, b) => a.title.localeCompare(b.title))
}

export default function CoursesPage() {
	const authPromise = auth()

	const coursesPromise = authPromise.then(({ userId }) => {
		if (!userId) throw errors.new("User not authenticated")
		return getUserEnrolledClasses(userId)
	})

	const allSubjectsAndCoursesPromise = getClassesForSelector()

	return <Content coursesPromise={coursesPromise} allSubjectsPromise={allSubjectsAndCoursesPromise} />
}
