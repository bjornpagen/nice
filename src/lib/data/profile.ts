import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import type { CaliperEventSchema } from "@/lib/caliper"
import { getAllEventsForUser } from "@/lib/data/fetchers/caliper"
import { getActiveEnrollmentsForUser, getClass, getCourse, getUnitsForCourses } from "@/lib/data/fetchers/oneroster"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import { ComponentMetadataSchema, CourseMetadataSchema } from "@/lib/metadata/oneroster"
import type { ProfileCourse, Unit } from "@/lib/types/domain"
import type { ProfileCoursesPageData } from "@/lib/types/page"
import type { ClassReadSchemaType } from "../oneroster"

// Helper function to remove "Nice Academy - " prefix from course titles
function removeNiceAcademyPrefix(title: string): string {
	const prefix = "Nice Academy - "
	if (title.startsWith(prefix)) {
		return title.substring(prefix.length).trim()
	}
	return title
}

/**
 * Fetches earned XP for a specific course from Caliper events
 * Filters events by course slug (not title) since Caliper uses slugs
 */
async function fetchCourseEarnedXP(actorId: string, courseSlug: string): Promise<number> {
	logger.debug("fetching earned XP for course", { actorId, courseSlug })

	const eventsResult = await errors.try(getAllEventsForUser(actorId))
	if (eventsResult.error) {
		logger.error("failed to fetch caliper events for course XP", {
			actorId,
			courseSlug,
			error: eventsResult.error
		})
		return 0
	}

	const events = eventsResult.data
	let totalEarnedXP = 0

	// Debug: Log all unique course names found in events
	const uniqueCourseNames = new Set<string>()
	for (const event of events) {
		if (event.object.course?.name) {
			uniqueCourseNames.add(event.object.course.name)
		}
	}
	logger.debug("unique course names found in Caliper events", {
		uniqueCourseNames: Array.from(uniqueCourseNames),
		targetCourseSlug: courseSlug,
		totalEvents: events.length
	})

	// Filter events for this specific course using slug matching
	const courseEvents = events.filter((event: z.infer<typeof CaliperEventSchema>) => {
		// Match by course slug in the event object
		const eventCourseSlug = event.object.course?.name
		if (!eventCourseSlug) return false

		// Direct slug comparison (no prefix removal needed for slugs)
		const matches = eventCourseSlug === courseSlug

		logger.debug("comparing course slugs", {
			eventCourseSlug,
			targetCourseSlug: courseSlug,
			matches
		})

		return matches
	})

	// Sum XP from completed activities in this course
	for (const event of courseEvents) {
		if (event.action === "Completed") {
			const xpEarnedItem = event.generated.items.find((item) => item.type === "xpEarned")
			const xpEarned = xpEarnedItem?.value ?? 0

			// Only count positive XP (not penalties)
			if (xpEarned > 0) {
				totalEarnedXP += xpEarned
			}

			logger.debug("found completed event with XP", {
				eventId: event.id,
				activityName: event.object.activity?.name,
				xpEarned,
				totalEarnedXP
			})
		}
	}

	logger.debug("calculated earned XP for course", {
		actorId,
		courseSlug,
		totalEarnedXP,
		courseEventsCount: courseEvents.length,
		completedEventsCount: courseEvents.filter((e) => e.action === "Completed").length
	})

	return totalEarnedXP
}

/**
 * Calculates total possible XP for a course by fetching from our local database
 * Uses the same XP calculation logic as fetchCoursePageData
 */
async function fetchCourseTotalXP(courseSourcedId: string): Promise<number> {
	logger.debug("calculating total XP for course from local database", { courseSourcedId })

	// Import the course data fetching function
	const { fetchCoursePageData } = await import("@/lib/data/course")
	const { CourseMetadataSchema } = await import("@/lib/metadata/oneroster")
	const { getCourse } = await import("@/lib/data/fetchers/oneroster")

	// First get the course metadata to extract the subject and course slugs
	const courseResult = await errors.try(getCourse(courseSourcedId))
	if (courseResult.error) {
		logger.error("failed to fetch course metadata for XP calculation", {
			courseSourcedId,
			error: courseResult.error
		})
		return 0
	}

	const course = courseResult.data
	if (!course) {
		logger.error("course not found for XP calculation", { courseSourcedId })
		return 0
	}

	// Validate course metadata with Zod
	const courseMetadataResult = CourseMetadataSchema.safeParse(course.metadata)
	if (!courseMetadataResult.success) {
		logger.error("invalid course metadata for XP calculation", {
			courseSourcedId,
			error: courseMetadataResult.error
		})
		return 0
	}
	const courseMetadata = courseMetadataResult.data

	// Use the course metadata to fetch detailed course data with XP
	const coursePageDataResult = await errors.try(
		fetchCoursePageData({
			subject: courseMetadata.khanSubjectSlug,
			course: courseMetadata.khanSlug
		})
	)
	if (coursePageDataResult.error) {
		logger.error("failed to fetch course page data for XP calculation", {
			courseSourcedId,
			subject: courseMetadata.khanSubjectSlug,
			courseSlug: courseMetadata.khanSlug,
			error: coursePageDataResult.error
		})
		return 0
	}

	const totalXP = coursePageDataResult.data.totalXP

	logger.debug("calculated total XP for course from local database", {
		courseSourcedId,
		totalXP,
		subject: courseMetadata.khanSubjectSlug,
		courseSlug: courseMetadata.khanSlug
	})

	return totalXP
}

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
			title: removeNiceAcademyPrefix(course.title),
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

	// Fetch XP data for each course in parallel
	const actorId = `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${sourceId}`

	logger.info("fetching XP data for user courses", {
		userId: user.id,
		sourceId,
		courseCount: userCourses.length
	})

	const userCoursesWithXP = await Promise.all(
		userCourses.map(async (course) => {
			// Extract course slug from path (e.g., "/math/early-math" -> "early-math")
			const courseSlug = course.path.split("/").pop()
			if (!courseSlug) {
				logger.error("failed to extract course slug from path", {
					courseId: course.id,
					coursePath: course.path
				})
				return { ...course, earnedXP: 0, totalXP: 0 }
			}

			const [earnedXP, totalXP] = await Promise.all([
				fetchCourseEarnedXP(actorId, courseSlug),
				fetchCourseTotalXP(course.id)
			])

			return {
				...course,
				earnedXP,
				totalXP
			}
		})
	)

	logger.info("XP data fetched for user courses", {
		userId: user.id,
		courseCount: userCoursesWithXP.length,
		totalEarnedXP: userCoursesWithXP.reduce((sum, course) => sum + (course.earnedXP ?? 0), 0),
		totalPossibleXP: userCoursesWithXP.reduce((sum, course) => sum + (course.totalXP ?? 0), 0)
	})

	return { subjects, userCourses: userCoursesWithXP }
}

export async function fetchProfileCoursesDataWithUser(sourceId: string): Promise<ProfileCoursesPageData> {
	// Import from actions since that's where the function is defined (from upstream)
	const { getOneRosterCoursesForExplore } = await import("@/lib/actions/courses")

	const subjectsPromise = getOneRosterCoursesForExplore()
	const userCoursesPromise = fetchUserEnrolledCourses(sourceId)

	const [subjects, userCourses] = await Promise.all([subjectsPromise, userCoursesPromise])

	return { subjects, userCourses }
}
