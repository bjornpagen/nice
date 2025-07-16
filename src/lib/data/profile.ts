import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { getActiveEnrollmentsForUser, getClass, getCourse, getUnitsForCourses } from "@/lib/data/fetchers/oneroster"
import { ComponentMetadataSchema, CourseMetadataSchema } from "@/lib/metadata/oneroster"
import type { ProfileCoursesPageData } from "@/lib/types/page"
import type { ProfileCourse } from "@/lib/types/profile"
import type { Unit } from "@/lib/types/structure"
import type { ClassReadSchemaType } from "../oneroster"

export async function fetchUserEnrolledCourses(userId: string): Promise<ProfileCourse[]> {
	// Get enrollments for the user
	const enrollmentsResult = await errors.try(getActiveEnrollmentsForUser(userId))
	if (enrollmentsResult.error) {
		logger.error("failed to fetch user enrollments", { error: enrollmentsResult.error, userId })
		throw errors.wrap(enrollmentsResult.error, "fetch user enrollments")
	}

	// Early return if no enrollments (from upstream)
	if (enrollmentsResult.data.length === 0) {
		return []
	}

	const classIds = [...new Set(enrollmentsResult.data.map((enrollment) => enrollment.class.sourcedId))]

	const classPromises = classIds.map(async (classId) => {
		const classResult = await errors.try(getClass(classId))
		if (classResult.error) {
			logger.error("failed to fetch class details", { error: classResult.error, classId })
			return null
		}
		return classResult.data
	})

	const classes = (await Promise.all(classPromises)).filter((c): c is ClassReadSchemaType => c !== null)

	const courseIds = [...new Set(classes.map((c) => c.course.sourcedId))]
	const unitsByCourseId = new Map<string, Unit[]>()

	if (courseIds.length > 0) {
		const allUnitsResult = await errors.try(getUnitsForCourses(courseIds))
		if (allUnitsResult.error) {
			logger.error("failed to fetch units for enrolled courses", { error: allUnitsResult.error, courseIds })
		} else {
			for (const unit of allUnitsResult.data) {
				if (unit.parent) continue
				const courseId = unit.course.sourcedId
				if (!unitsByCourseId.has(courseId)) {
					unitsByCourseId.set(courseId, [])
				}

				// Validate component metadata with Zod
				const componentMetadataResult = ComponentMetadataSchema.safeParse(unit.metadata)
				if (!componentMetadataResult.success) {
					logger.error("fatal: invalid unit metadata for enrolled user", {
						unitId: unit.sourcedId,
						userId,
						error: componentMetadataResult.error
					})
					throw errors.wrap(componentMetadataResult.error, "invalid unit metadata")
				}
				const unitMetadata = componentMetadataResult.data

				unitsByCourseId.get(courseId)?.push({
					id: unit.sourcedId,
					title: unit.title,
					path: "", // Path will be constructed when we have course slug
					ordering: unit.sortOrder,
					description: unitMetadata.khanDescription,
					slug: unitMetadata.khanSlug,
					children: [] // Initialize with empty children
				})
			}
		}
	}

	// Map to ProfileCourse format and attach units
	const courses: ProfileCourse[] = []

	for (const cls of classes) {
		const courseUnits = unitsByCourseId.get(cls.course.sourcedId)
		if (!courseUnits) {
			logger.error("CRITICAL: No units found for course", {
				courseId: cls.course.sourcedId,
				classId: cls.sourcedId
			})
			throw errors.new("course units: required data missing")
		}

		// Fetch course metadata for the ProfileCourse
		const courseResult = await errors.try(getCourse(cls.course.sourcedId))
		if (courseResult.error) {
			logger.error("failed to fetch course metadata", {
				courseId: cls.course.sourcedId,
				error: courseResult.error
			})
			continue // Skip this course
		}

		const course = courseResult.data
		if (!course) {
			logger.error("course data is undefined", { courseId: cls.course.sourcedId })
			continue // Skip this course
		}

		// Validate course metadata with Zod
		const courseMetadataResult = CourseMetadataSchema.safeParse(course.metadata)
		if (!courseMetadataResult.success) {
			logger.error("fatal: invalid course metadata for enrolled user", {
				courseId: course.sourcedId,
				userId,
				error: courseMetadataResult.error
			})
			throw errors.wrap(courseMetadataResult.error, "invalid course metadata")
		}
		const courseMetadata = courseMetadataResult.data

		// We no longer have path in metadata, so we'll use a sensible default
		// This could be improved by passing subject context from somewhere else
		const subject = "courses" // Default subject for enrolled courses

		// Now update unit paths with the course slug
		const unitsWithCorrectPaths = courseUnits.map((unit) => ({
			...unit,
			path: `/${subject}/${courseMetadata.khanSlug}/${unit.slug}`
		}))

		courses.push({
			id: course.sourcedId,
			title: course.title,
			description: courseMetadata.khanDescription,
			path: `/${subject}/${courseMetadata.khanSlug}`, // Construct path from slugs
			units: unitsWithCorrectPaths
		})
	}

	return courses
}

export async function fetchProfileCoursesData(): Promise<ProfileCoursesPageData> {
	// Cannot use "use cache" here because currentUser() accesses dynamic headers
	const user = await currentUser()
	if (!user) {
		throw errors.new("user not authenticated")
	}

	// Use fallback to user.id if sourceId not in metadata (from upstream)
	const sourceId = typeof user.publicMetadata.sourceId === "string" ? user.publicMetadata.sourceId : user.id

	// Import from actions since that's where the function is defined (from upstream)
	const { getOneRosterCoursesForExplore } = await import("@/lib/actions/courses")

	const subjectsPromise = getOneRosterCoursesForExplore()
	const userCoursesPromise = fetchUserEnrolledCourses(sourceId)

	const [subjects, userCourses] = await Promise.all([subjectsPromise, userCoursesPromise])

	return { subjects, userCourses }
}

export async function fetchProfileCoursesDataWithUser(sourceId: string): Promise<ProfileCoursesPageData> {
	// Import from actions since that's where the function is defined (from upstream)
	const { getOneRosterCoursesForExplore } = await import("@/lib/actions/courses")

	const subjectsPromise = getOneRosterCoursesForExplore()
	const userCoursesPromise = fetchUserEnrolledCourses(sourceId)

	const [subjects, userCourses] = await Promise.all([subjectsPromise, userCoursesPromise])

	return { subjects, userCourses }
}
