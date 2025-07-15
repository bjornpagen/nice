import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { ProfileCoursesPageData } from "@/lib/types/page"
import type { ProfileCourse, ProfileSubject } from "@/lib/types/profile"
import type { Unit } from "@/lib/types/structure"
import { oneroster } from "../clients"
import type { ClassReadSchemaType, CourseReadSchemaType } from "../oneroster"
import { ComponentMetadataSchema, CourseMetadataSchema } from "../oneroster-metadata"

export async function getOneRosterCoursesForExplore(): Promise<ProfileSubject[]> {
	// Get all courses from OneRoster
	const coursesResult = await errors.try(oneroster.getAllCourses({}))
	if (coursesResult.error) {
		logger.error("failed to fetch courses", { error: coursesResult.error })
		throw errors.wrap(coursesResult.error, "fetch courses")
	}

	// Group courses by subjectCode (e.g., 'math', 'ela')
	const coursesBySubject = new Map<string, CourseReadSchemaType[]>()

	for (const course of coursesResult.data) {
		if (!course.subjects || course.subjects.length === 0) {
			continue // Skip courses without subject codes
		}

		// Use the first subject code as the primary subject
		const primarySubject = course.subjects[0]
		if (!primarySubject) continue // Added explicit check
		if (!coursesBySubject.has(primarySubject)) {
			coursesBySubject.set(primarySubject, [])
		}
		coursesBySubject.get(primarySubject)?.push(course)
	}

	// Convert to the expected format
	const allSubjects: ProfileSubject[] = []

	for (const [subjectCode, courses] of coursesBySubject) {
		// Try to get a more readable subject name
		// This mapping could be expanded based on your needs
		const subjectNameMap: Record<string, string> = {
			math: "Math",
			ela: "English Language Arts",
			science: "Science",
			"social-studies": "Social Studies",
			history: "History"
			// Add more mappings as needed
		}

		const subjectName = subjectNameMap[subjectCode] || subjectCode

		allSubjects.push({
			slug: subjectCode,
			title: subjectName,
			courses: courses
				.map((course) => {
					// Validate course metadata with Zod
					const courseMetadataResult = CourseMetadataSchema.safeParse(course.metadata)
					if (!courseMetadataResult.success) {
						logger.warn("skipping course in explore dropdown due to invalid metadata", {
							courseId: course.sourcedId,
							error: courseMetadataResult.error
						})
						return null
					}
					const courseMetadata = courseMetadataResult.data

					return {
						id: course.sourcedId,
						slug: courseMetadata.khanSlug,
						title: course.title,
						path: courseMetadata.path
					}
				})
				.filter((course): course is NonNullable<typeof course> => course !== null)
		})
	}

	// Remove subjects with no valid courses
	const validSubjects = allSubjects.filter((subject) => subject.courses.length > 0)

	// Sort subjects alphabetically
	validSubjects.sort((a, b) => a.title.localeCompare(b.title))

	return validSubjects
}

export async function fetchUserEnrolledCourses(userId: string): Promise<ProfileCourse[]> {
	// Get enrollments for the user
	const filter = `user.sourcedId='${userId}' AND status='active'`
	const enrollmentsResult = await errors.try(oneroster.getAllEnrollments({ filter }))
	if (enrollmentsResult.error) {
		logger.error("failed to fetch user enrollments", { error: enrollmentsResult.error, userId })
		throw errors.wrap(enrollmentsResult.error, "fetch user enrollments")
	}

	// Get unique class IDs from enrollments
	const classIds = [...new Set(enrollmentsResult.data.map((enrollment) => enrollment.class.sourcedId))]

	// Fetch class details for each enrollment
	const classPromises = classIds.map(async (classId) => {
		const classResult = await errors.try(oneroster.getClass(classId))
		if (classResult.error) {
			logger.error("failed to fetch class details", { error: classResult.error, classId })
			// Skip failed class fetches
			return null
		}
		return classResult.data
	})

	const classes = (await Promise.all(classPromises)).filter((c): c is ClassReadSchemaType => c !== null)

	// Fetch units for all courses associated with the classes
	const courseIds = [...new Set(classes.map((c) => c.course.sourcedId))]
	const unitsByCourseId = new Map<string, Unit[]>()

	if (courseIds.length > 0) {
		const allUnitsResult = await errors.try(
			oneroster.getCourseComponents({ filter: `course.sourcedId IN ('${courseIds.join("','")}')` })
		)
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
					logger.error("unit metadata validation failed, skipping", {
						unitId: unit.sourcedId,
						error: componentMetadataResult.error
					})
					continue
				}
				const unitMetadata = componentMetadataResult.data

				unitsByCourseId.get(courseId)?.push({
					id: unit.sourcedId,
					title: unit.title,
					path: unitMetadata.path,
					ordering: unit.sortOrder,
					description: unitMetadata.description,
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
		const courseResult = await errors.try(oneroster.getCourse(cls.course.sourcedId))
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
			logger.error("course metadata validation failed, skipping", {
				courseId: course.sourcedId,
				error: courseMetadataResult.error
			})
			continue
		}
		const courseMetadata = courseMetadataResult.data

		courses.push({
			id: course.sourcedId,
			title: course.title,
			description: courseMetadata.description,
			path: courseMetadata.path,
			units: courseUnits
		})
	}

	return courses
}

// Data Fetcher for Profile Courses Page
export async function fetchProfileCoursesData(): Promise<ProfileCoursesPageData> {
	const user = await currentUser()
	if (!user) {
		throw errors.new("user not authenticated")
	}

	const subjectsPromise = getOneRosterCoursesForExplore()
	const userCoursesPromise = fetchUserEnrolledCourses(user.id)

	const [subjects, userCourses] = await Promise.all([subjectsPromise, userCoursesPromise])

	return { subjects, userCourses }
}
