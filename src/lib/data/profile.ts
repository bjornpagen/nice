import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { getActiveEnrollmentsForUser, getClass, getCourse, getUnitsForCourses } from "@/lib/data/fetchers/oneroster"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import { ComponentMetadataSchema, CourseMetadataSchema } from "@/lib/metadata/oneroster"
import type { ProfileCourse, Unit } from "@/lib/types/domain"
import type { ProfileCoursesPageData } from "@/lib/types/page"
import type { ClassReadSchemaType } from "../oneroster"

export async function fetchUserEnrolledCourses(userSourcedId: string): Promise<ProfileCourse[]> {
	// Fetch active enrollments for the user
	const enrollmentsResult = await errors.try(getActiveEnrollmentsForUser(userSourcedId))
	if (enrollmentsResult.error) {
		logger.error("failed to fetch user enrollments", { error: enrollmentsResult.error, userSourcedId })
		throw errors.wrap(enrollmentsResult.error, "user enrollments: unable to retrieve")
	}

	if (enrollmentsResult.data.length === 0) {
		return []
	}

	// Extract unique class IDs from enrollments
	const classSourcedIds = [...new Set(enrollmentsResult.data.map((enrollment) => enrollment.class.sourcedId))]

	const classPromises = classSourcedIds.map(async (classSourcedId) => {
		const classResult = await errors.try(getClass(classSourcedId))
		if (classResult.error) {
			logger.error("failed to fetch class details", { error: classResult.error, classSourcedId })
			return null
		}
		return classResult.data
	})

	const classResults = await Promise.all(classPromises)
	const classes = classResults.filter((c): c is ClassReadSchemaType => c !== null)

	const courseSourcedIds = [...new Set(classes.map((c) => c.course.sourcedId))]
	const unitsByCourseSourcedId = new Map<string, Unit[]>()

	if (courseSourcedIds.length > 0) {
		const allUnitsResult = await errors.try(getUnitsForCourses(courseSourcedIds))
		if (allUnitsResult.error) {
			logger.error("failed to fetch units for enrolled courses", { error: allUnitsResult.error, courseSourcedIds })
		} else {
			for (const unit of allUnitsResult.data) {
				if (unit.parent) continue
				const courseSourcedId = unit.course.sourcedId
				if (!unitsByCourseSourcedId.has(courseSourcedId)) {
					unitsByCourseSourcedId.set(courseSourcedId, [])
				}

				// Validate component metadata with Zod
				const componentMetadataResult = ComponentMetadataSchema.safeParse(unit.metadata)
				if (!componentMetadataResult.success) {
					logger.error("fatal: invalid unit metadata for enrolled user", {
						unitSourcedId: unit.sourcedId,
						userSourcedId,
						error: componentMetadataResult.error
					})
					throw errors.wrap(componentMetadataResult.error, "invalid unit metadata")
				}
				const unitMetadata = componentMetadataResult.data

				unitsByCourseSourcedId.get(courseSourcedId)?.push({
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
		const courseUnits = unitsByCourseSourcedId.get(cls.course.sourcedId)
		if (!courseUnits) {
			logger.error("CRITICAL: No units found for course", {
				courseSourcedId: cls.course.sourcedId,
				classSourcedId: cls.sourcedId
			})
			throw errors.new("course units: required data missing")
		}

		// Fetch course metadata for the ProfileCourse
		const courseResult = await errors.try(getCourse(cls.course.sourcedId))
		if (courseResult.error) {
			logger.error("failed to fetch course metadata", {
				courseSourcedId: cls.course.sourcedId,
				error: courseResult.error
			})
			continue // Skip this course
		}

		const course = courseResult.data
		if (!course) {
			logger.error("course data is undefined", { courseSourcedId: cls.course.sourcedId })
			continue // Skip this course
		}

		// Validate course metadata with Zod
		const courseMetadataResult = CourseMetadataSchema.safeParse(course.metadata)
		if (!courseMetadataResult.success) {
			logger.warn("skipping course with invalid metadata for enrolled user", {
				courseSourcedId: course.sourcedId,
				userSourcedId,
				error: courseMetadataResult.error,
				metadata: course.metadata
			})
			continue // Skip this course instead of throwing
		}
		const courseMetadata = courseMetadataResult.data

		// Use the actual subject slug from the course metadata
		const subject = courseMetadata.khanSubjectSlug

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

	if (!user.publicMetadata) {
		logger.error("CRITICAL: User public metadata missing", { userId: user.id })
		throw errors.new("user public metadata missing")
	}

	const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!metadataValidation.success) {
		logger.error("CRITICAL: Invalid user metadata", {
			userId: user.id,
			error: metadataValidation.error
		})
		throw errors.wrap(metadataValidation.error, "user metadata validation failed")
	}

	const metadata = metadataValidation.data

	// Import from actions since that's where the function is defined (from upstream)
	const { getOneRosterCoursesForExplore } = await import("@/lib/actions/courses")

	// Get available subjects for explore dropdown
	const subjectsPromise = getOneRosterCoursesForExplore()

	// sourceId is optional - users without it simply have no enrolled courses yet
	if (!metadata.sourceId) {
		logger.info("user has no sourceId yet, returning empty enrolled courses", { userId: user.id })
		const subjects = await subjectsPromise
		return { subjects, userCourses: [], needsSync: true }
	}
	const sourceId = metadata.sourceId

	// Get user's enrolled courses
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
