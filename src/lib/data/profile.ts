import { clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { oneroster } from "@/lib/clients"
import { getActiveEnrollmentsForUser, getClass, getCourse } from "@/lib/data/fetchers/oneroster"
import { fetchCoursePageData } from "@/lib/data/course"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import { CourseMetadataSchema } from "@/lib/metadata/oneroster"
import type { Lesson, ProfileCourse, Quiz, Unit, UnitTest } from "@/lib/types/domain"
import type { ProfileCoursesPageData } from "@/lib/types/page"
import { getResourceIdFromLineItem } from "@/lib/utils/assessment-line-items"
import type { ClassReadSchemaType } from "../oneroster"
import { requireUser } from "@/lib/auth/require-user"

// NEW: Interface for unit proficiency tracking
export interface UnitProficiency {
	unitId: string
	proficiencyPercentage: number
	proficientExercises: number
	totalExercises: number
}
/**
 * Deprecated: Caliper-based XP aggregation. Kept temporarily for reference.
 */
/* async function fetchCourseEarnedXP(actorId: string, courseSlug: string): Promise<number> {
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
} */

/**
 * NEW: Sums earned XP from OneRoster assessment results for a given student and course.
 * We read fully graded results for the student within the course and sum positive `metadata.xp`.
 * Only assessment line items using the new `_ali` convention are considered.
 */
async function fetchCourseEarnedXPFromResults(userSourcedId: string, courseSourcedId: string): Promise<number> {
	logger.debug("fetching earned XP from results", { userSourcedId, courseSourcedId })

	const resultsResponse = await errors.try(
		oneroster.getAllResults({
			// Filter by student and by assessment line items that belong to this course.
			// The API does not support direct course filter on results, so we fetch all for the student
			// and filter client-side by course sourced id embedded in metadata.
			filter: `student.sourcedId='${userSourcedId}'`
		})
	)

	if (resultsResponse.error) {
		logger.error("failed to fetch assessment results for earned XP", {
			userSourcedId,
			courseSourcedId,
			error: resultsResponse.error
		})
		return 0
	}

	// Keep only the newest fully graded result per assessment line item
	const latestByLineItem = new Map<string, { scoreDateMs: number; xp: number }>()

	for (const result of resultsResponse.data) {
		const lineItemId = result.assessmentLineItem?.sourcedId
		if (typeof lineItemId !== "string" || !lineItemId.endsWith("_ali")) continue
		if (result.scoreStatus !== "fully graded") continue

		const MetaSchema = z.object({ xp: z.number().optional(), courseSourcedId: z.string().optional() }).passthrough()
		const parsedMeta = MetaSchema.safeParse(result.metadata)
		const xpValue = parsedMeta.success && typeof parsedMeta.data.xp === "number" ? parsedMeta.data.xp : 0
		const metaCourseId =
			parsedMeta.success && typeof parsedMeta.data.courseSourcedId === "string" ? parsedMeta.data.courseSourcedId : ""
		if (metaCourseId !== courseSourcedId || xpValue <= 0) continue

		const scoreDateMs = new Date(result.scoreDate || 0).getTime()
		const existing = latestByLineItem.get(lineItemId)
		if (!existing || scoreDateMs > existing.scoreDateMs) {
			latestByLineItem.set(lineItemId, { scoreDateMs, xp: xpValue })
		}
	}

	const totalEarnedXP = Array.from(latestByLineItem.values()).reduce((sum, v) => sum + v.xp, 0)

	logger.debug("calculated earned XP from results", { userSourcedId, courseSourcedId, totalEarnedXP })

	return totalEarnedXP
}

/**
 * Fetches unit proficiency data for a user across all units in a course.
 * Only exercises, quizzes, and unit tests with 100% scores count as "proficient".
 *
 * @param userSourcedId - The user's OneRoster sourcedId
 * @param courseData - The complete course data with units and their content
 * @returns Array of unit proficiency percentages
 */
async function fetchUnitProficiencies(
	userSourcedId: string,
	courseData: { units: Unit[] }
): Promise<UnitProficiency[]> {
	logger.info("🎯 STARTING fetchUnitProficiencies", { userSourcedId, unitCount: courseData.units.length })

	// Get all assessment results for this user
	// We'll filter client-side to only include new '_ali' format line items
	const resultsResponse = await errors.try(
		oneroster.getAllResults({
			filter: `student.sourcedId='${userSourcedId}'`
		})
	)
	if (resultsResponse.error) {
		logger.error("failed to fetch assessment results for proficiency calculation", {
			userSourcedId,
			error: resultsResponse.error
		})
		// Return empty proficiencies rather than failing - graceful degradation
		return courseData.units.map((unit) => ({
			unitId: unit.id,
			proficiencyPercentage: 0,
			proficientExercises: 0,
			totalExercises: 0
		}))
	}

	// Create a map of resourceId -> assessment result for quick lookup
	// Only process results with new '_ali' format line items
	const resultsMap = new Map<string, { score: number; isFullyGraded: boolean }>()
	for (const result of resultsResponse.data) {
		// Skip results from old assessment line items (without '_ali' suffix)
		if (!result.assessmentLineItem.sourcedId.endsWith("_ali")) {
			continue
		}

		if (result.scoreStatus === "fully graded" && typeof result.score === "number") {
			const resourceId = getResourceIdFromLineItem(result.assessmentLineItem.sourcedId)
			const normalizedScore = result.score <= 1.1 ? result.score * 100 : result.score
			resultsMap.set(resourceId, {
				score: normalizedScore,
				isFullyGraded: true
			})
		}
	}

	logger.debug("processed assessment results", {
		userSourcedId,
		totalResults: resultsResponse.data.length,
		fullyGradedResults: resultsMap.size
	})

	// Calculate proficiency for each unit
	const unitProficiencies: UnitProficiency[] = []

	for (const unit of courseData.units) {
		const assessableContentIds: string[] = []

		logger.info("🔍 Processing unit for proficiency", {
			unitId: unit.id,
			unitTitle: unit.title,
			childrenCount: unit.children.length,
			childrenTypes: unit.children.map((c) => c.type)
		})

		// Collect all assessable content IDs from this unit
		for (const child of unit.children) {
			if (child.type === "Lesson") {
				logger.debug("Processing lesson", {
					lessonId: child.id,
					lessonTitle: child.title,
					contentCount: child.children.length,
					contentTypes: child.children.map((c) => c.type)
				})
				// Add exercises from within lessons
				for (const content of child.children) {
					if (content.type === "Exercise") {
						assessableContentIds.push(content.id)
						logger.debug("Found exercise in lesson", {
							exerciseId: content.id,
							exerciseTitle: content.title,
							lessonTitle: child.title
						})
					}
				}
			} else if (child.type === "Quiz" || child.type === "UnitTest") {
				// Add unit-level quizzes and tests
				assessableContentIds.push(child.id)
				logger.debug("Found unit-level assessment", {
					assessmentId: child.id,
					assessmentTitle: child.title,
					assessmentType: child.type
				})
			}
		}

		// Count how many of these assessable items the user has completed with 100% score
		let proficientCount = 0
		logger.debug("Checking proficiency for assessable content", {
			unitTitle: unit.title,
			assessableContentIds,
			totalAssessable: assessableContentIds.length,
			availableResultIds: Array.from(resultsMap.keys()).slice(0, 10) // First 10 for brevity
		})

		for (const contentId of assessableContentIds) {
			const result = resultsMap.get(contentId)
			if (result?.isFullyGraded && result.score >= 100) {
				proficientCount++
				logger.debug("Found proficient result", {
					contentId,
					score: result.score,
					unitTitle: unit.title
				})
			} else if (result) {
				logger.debug("Found non-proficient result", {
					contentId,
					score: result.score,
					isFullyGraded: result.isFullyGraded,
					unitTitle: unit.title
				})
			}
		}

		// Calculate proficiency percentage
		const proficiencyPercentage =
			assessableContentIds.length > 0 ? Math.round((proficientCount / assessableContentIds.length) * 100) : 0

		unitProficiencies.push({
			unitId: unit.id,
			proficiencyPercentage,
			proficientExercises: proficientCount,
			totalExercises: assessableContentIds.length
		})

		logger.debug("calculated unit proficiency", {
			unitId: unit.id,
			unitTitle: unit.title,
			proficiencyPercentage,
			proficientCount,
			totalAssessable: assessableContentIds.length
		})
	}

	logger.info("🏁 COMPLETED unit proficiency calculation", {
		userSourcedId,
		unitCount: unitProficiencies.length,
		averageProficiency:
			unitProficiencies.length > 0
				? Math.round(
						unitProficiencies.reduce((sum, up) => sum + up.proficiencyPercentage, 0) / unitProficiencies.length
					)
				: 0,
		proficiencies: unitProficiencies.map((up) => ({
			unitId: up.unitId,
			percentage: up.proficiencyPercentage,
			proficient: up.proficientExercises,
			total: up.totalExercises
		}))
	})

	return unitProficiencies
}

export async function fetchUserEnrolledCourses(userSourcedId: string): Promise<ProfileCourse[]> {
	const enrollmentsResult = await errors.try(getActiveEnrollmentsForUser(userSourcedId))
	if (enrollmentsResult.error) {
		logger.error("failed to fetch user enrollments", { error: enrollmentsResult.error, userSourcedId })
		throw errors.wrap(enrollmentsResult.error, "user enrollments: unable to retrieve")
	}

	if (enrollmentsResult.data.length === 0) {
		return []
	}

	const classSourcedIds = [...new Set(enrollmentsResult.data.map((enrollment) => enrollment.class.sourcedId))]
	const classResults = await Promise.all(
		classSourcedIds.map(async (classSourcedId) => {
			const classResult = await errors.try(getClass(classSourcedId))
			if (classResult.error) {
				logger.error("failed to fetch class details", { error: classResult.error, classSourcedId })
				return null
			}
			return classResult.data
		})
	)

	const classes = classResults.filter((c): c is ClassReadSchemaType => c !== null)
	const courseSourcedIds = [...new Set(classes.map((cls) => cls.course.sourcedId))]

	const profileCourses: ProfileCourse[] = []

	for (const courseSourcedId of courseSourcedIds) {
		const courseResult = await errors.try(getCourse(courseSourcedId))
		if (courseResult.error) {
			logger.error("failed to fetch course details", { error: courseResult.error, courseSourcedId })
			continue
		}

		const course = courseResult.data
		if (!course) continue

		const courseMetadataResult = CourseMetadataSchema.safeParse(course.metadata)
		if (!courseMetadataResult.success) {
			logger.error("invalid course metadata for profile", {
				courseSourcedId,
				error: courseMetadataResult.error
			})
			continue
		}

		const courseMetadata = courseMetadataResult.data
		const coursePageData = await fetchCoursePageData(
			{ subject: courseMetadata.khanSubjectSlug, course: courseMetadata.khanSlug },
			{ skipQuestions: true }
		)

		profileCourses.push({
			id: coursePageData.course.id,
			title: coursePageData.course.title,
			description: coursePageData.course.description,
			path: coursePageData.course.path,
			units: coursePageData.course.units,
			subject: courseMetadata.khanSubjectSlug,
			courseSlug: courseMetadata.khanSlug,
			totalXP: coursePageData.totalXP
		})
	}

	return profileCourses
}


export async function fetchProfileCoursesData(): Promise<ProfileCoursesPageData> {
	// dynamic opt-in is handled at the page level
// Cannot use "use cache" here because requireUser()/currentUser accesses dynamic headers
	const user = await requireUser()

	// Normalize and validate metadata deterministically (no brittle string checks)
	const parsedMetadata = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!parsedMetadata.success) {
		logger.error("CRITICAL: invalid user metadata structure", {
			userId: user.id,
			error: parsedMetadata.error
		})
		throw errors.wrap(parsedMetadata.error, "user metadata validation failed")
	}

	const normalizedMetadata = parsedMetadata.data

	// Persist normalized shape back to Clerk on first encounter (idempotent)
	let needsNormalization = false
	const raw = user.publicMetadata
	const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null
	function getProp(v: unknown, key: string): unknown {
		if (!isRecord(v)) return undefined
		const rec: Record<string, unknown> = v
		return rec[key]
	}
	if (!isRecord(raw)) {
		needsNormalization = true
	} else {
		if (typeof getProp(raw, "nickname") !== "string") needsNormalization = true
		if (typeof getProp(raw, "username") !== "string") needsNormalization = true
		if (typeof getProp(raw, "bio") !== "string") needsNormalization = true

		const streakValue = getProp(raw, "streak")
		if (!isRecord(streakValue)) {
			needsNormalization = true
		} else {
			const lad = getProp(streakValue, "lastActivityDate")
			if (!(lad === null || lad === undefined || typeof lad === "string")) {
				needsNormalization = true
			}
			const cnt = getProp(streakValue, "count")
			if (!(cnt === undefined || typeof cnt === "number")) {
				needsNormalization = true
			}
		}

		const sid = getProp(raw, "sourceId")
		if (!(sid === undefined || typeof sid === "string")) {
			needsNormalization = true
		}
	}

	if (needsNormalization) {
		const clerk = await clerkClient()
		const updateResult = await errors.try(
			clerk.users.updateUserMetadata(user.id, { publicMetadata: normalizedMetadata })
		)
		if (updateResult.error) {
			logger.error("failed to normalize user metadata", { userId: user.id, error: updateResult.error })
			throw errors.wrap(updateResult.error, "metadata normalization failed")
		}
		logger.info("normalized user public metadata", { userId: user.id })
	}

	const metadata = normalizedMetadata

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

	logger.info("fetching XP data for user courses", {
		userId: user.id,
		sourceId,
		courseCount: userCourses.length
	})

	const userCoursesWithXP = await Promise.all(
		userCourses.map(async (course) => {
			const courseSlug = course.path.split("/").pop()
			if (!courseSlug) {
				logger.error("failed to extract course slug from path", {
					courseId: course.id,
					coursePath: course.path
				})
				return { ...course, earnedXP: 0, totalXP: course.totalXP ?? 0, unitProficiencies: [] }
			}

			const [earnedXP, unitProficiencies] = await Promise.all([
				fetchCourseEarnedXPFromResults(sourceId, course.id),
				fetchUnitProficiencies(sourceId, course)
			])

			return {
				...course,
				earnedXP,
				totalXP: course.totalXP ?? 0,
				unitProficiencies
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
