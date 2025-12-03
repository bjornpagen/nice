"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"
import { SCIENCE_COURSE_SEQUENCE } from "@/lib/powerpath-progress"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import { getActiveEnrollmentsForUser, getClass } from "@/lib/oneroster/redis/api"
import { enrollUserInCoursesByCourseId } from "@/lib/actions/courses"
import { requireUser } from "@/lib/auth/require-user"
import { checkExistingProficiency } from "@/lib/actions/assessment"

export type CourseProgressionStatus = {
	currentCourseId: string
	currentCourseProgress: number
	shouldEnrollNext: boolean
	nextCourseId?: string
	alreadyEnrolledInNext: boolean
	unenrolledCurrent?: boolean
	currentCourseTitle?: string
	nextCourseTitle?: string
}

type EnrollmentData = {
	enrollments: Awaited<ReturnType<typeof getActiveEnrollmentsForUser>>
	classToCourseMap: Map<string, string>
	enrolledCourseIds: Set<string>
}

/**
 * Fetches all active enrollments and maps them to courses.
 * CRITICAL: Throws if ANY data is missing to prevent partial-state operations.
 * This is a safety measure - we must have complete information before modifying enrollments.
 */
async function getUserEnrollmentData(sourceId: string): Promise<EnrollmentData> {
	const enrollmentsResult = await errors.try(getActiveEnrollmentsForUser(sourceId))
	if (enrollmentsResult.error) {
		logger.error("enrollments fetch failed", { error: enrollmentsResult.error, sourceId })
		throw errors.wrap(enrollmentsResult.error, "enrollments fetch")
	}

	const enrollments = enrollmentsResult.data
	const uniqueClassIds = [...new Set(enrollments.map((e) => e.class.sourcedId))]

	// Parallel fetch of class details - Fail Fast on ANY error
	const classResults = await Promise.all(
		uniqueClassIds.map(async (classId) => {
			const result = await errors.try(getClass(classId))
			if (result.error) {
				// CRITICAL: If we can't resolve a class, we can't safely unenroll students.
				// We must abort the entire operation rather than act on partial info.
				logger.error("class resolution failed", { classId, error: result.error })
				throw errors.wrap(result.error, `class resolution: ${classId}`)
			}
			return { classId, data: result.data }
		})
	)

	// Create mapping: classId -> courseId
	const classToCourseMap = new Map<string, string>()
	for (const item of classResults) {
		if (item.data?.course?.sourcedId) {
			classToCourseMap.set(item.classId, item.data.course.sourcedId)
		}
	}

	const enrolledCourseIds = new Set<string>(classToCourseMap.values())

	return { enrollments, classToCourseMap, enrolledCourseIds }
}

export async function checkAndProgressCourses(): Promise<CourseProgressionStatus[]> {
	const user = await requireUser()

	const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!metadataValidation.success) {
		logger.error("invalid user metadata for course progression", { userId: user.id, error: metadataValidation.error })
		throw errors.wrap(metadataValidation.error, "user metadata validation")
	}

	const sourceId = metadataValidation.data.sourceId
	if (!sourceId) {
		logger.debug("user has no sourceId, skipping course progression", { userId: user.id })
		return []
	}

	// Optimized: Single fetch for both checking and unenrollment data
	// Any failure here will throw and stop the poller for this cycle (safe)
	const enrollmentDataResult = await errors.try(getUserEnrollmentData(sourceId))
	if (enrollmentDataResult.error) {
		logger.error("progression check failed", { error: enrollmentDataResult.error, userId: user.id })
		throw enrollmentDataResult.error
	}
	const { enrollments, classToCourseMap, enrolledCourseIds } = enrollmentDataResult.data

	logger.info("checking course progression", {
		userId: user.id,
		sourceId,
		enrolledCourseCount: enrolledCourseIds.size,
		scienceCourseCount: SCIENCE_COURSE_SEQUENCE.length
	})

	const statuses: CourseProgressionStatus[] = []

	for (let i = 0; i < SCIENCE_COURSE_SEQUENCE.length; i++) {
		const currentConfig = SCIENCE_COURSE_SEQUENCE[i]
		if (!currentConfig) continue

		const nextConfig = SCIENCE_COURSE_SEQUENCE[i + 1]

		// Skip if user is not enrolled in this specific course
		if (!enrolledCourseIds.has(currentConfig.courseId)) {
			logger.debug("user not enrolled in course, skipping", { courseId: currentConfig.courseId, sourceId })
			continue
		}

		// Skip courses without a challengeId (terminal courses with no progression trigger)
		if (!currentConfig.challengeId) {
			logger.debug("course has no challengeId, skipping progression check", { courseId: currentConfig.courseId })
			continue
		}

		// Check Proficiency (Score >= 80%) on the HARDCODED Challenge ID
		const isMasteredResult = await errors.try(checkExistingProficiency(currentConfig.challengeId))
		if (isMasteredResult.error) {
			logger.error("proficiency check failed", { error: isMasteredResult.error, challengeId: currentConfig.challengeId })
			continue
		}
		const isMastered = isMasteredResult.data

		// Progress is binary for strict mastery: 100 if mastered, 0 otherwise
		const progress = isMastered ? 100 : 0

		const hasNextCourse = !!nextConfig
		const alreadyEnrolledInNext = nextConfig ? enrolledCourseIds.has(nextConfig.courseId) : false

		// Enrollment Condition: mastered current + has next + not already enrolled
		const shouldEnrollNext = isMastered && hasNextCourse && !alreadyEnrolledInNext

		// Unenrollment Condition: mastered AND (no next course OR next is secured)
		// Safe guard: We never unenroll unless we are sure the next step is secure
		const shouldUnenrollCurrent = isMastered && (!hasNextCourse || alreadyEnrolledInNext || shouldEnrollNext)

		// Use config titles directly (zero API calls)
		const currentCourseTitle = currentConfig.title
		const nextCourseTitle = nextConfig?.title

		const status: CourseProgressionStatus = {
			currentCourseId: currentConfig.courseId,
			currentCourseProgress: progress,
			shouldEnrollNext,
			nextCourseId: nextConfig?.courseId,
			alreadyEnrolledInNext,
			unenrolledCurrent: false,
			currentCourseTitle,
			nextCourseTitle
		}

		logger.info("course progression status", {
			courseId: currentConfig.courseId,
			progress,
			isMastered,
			nextCourseId: nextConfig?.courseId,
			alreadyEnrolledInNext,
			willEnroll: shouldEnrollNext,
			willUnenroll: shouldUnenrollCurrent
		})

		// EXECUTE: Enroll in Next Course
		if (status.shouldEnrollNext && nextConfig) {
			logger.info("progression: enrolling in next course", {
				userId: user.id,
				current: currentConfig.title,
				next: nextConfig.title
			})

			const enrollResult = await errors.try(enrollUserInCoursesByCourseId([nextConfig.courseId]))
			if (enrollResult.error) {
				logger.error("progression: enrollment failed", { error: enrollResult.error, nextCourseId: nextConfig.courseId })
				// CRITICAL SAFETY: If enrollment fails, abort unenrollment to prevent "zero course" state
				statuses.push(status)
				continue
			}

			logger.info("successfully enrolled user in next course", {
				userId: user.id,
				nextCourseId: nextConfig.courseId,
				changed: enrollResult.data.changed
			})

			enrolledCourseIds.add(nextConfig.courseId)
		}

		// EXECUTE: Unenroll from Current Course
		if (shouldUnenrollCurrent) {
			// Double check safety: ensure next course is in the enrolled set before unenrolling current
			if (nextConfig && !enrolledCourseIds.has(nextConfig.courseId)) {
				logger.error("progression safety check failed: attempting to unenroll without next course confirmed", {
					userId: user.id,
					currentCourseId: currentConfig.courseId,
					nextCourseId: nextConfig.courseId
				})
			} else {
				// Identify enrollments to remove using the pre-fetched map
				const enrollmentsToRemove = enrollments.filter((e) => {
					const courseId = classToCourseMap.get(e.class.sourcedId)
					return courseId === currentConfig.courseId
				})

				if (enrollmentsToRemove.length > 0) {
					logger.info("unenrolling user from current course", {
						userId: user.id,
						courseId: currentConfig.courseId,
						enrollmentCount: enrollmentsToRemove.length
					})

					const deleteResults = await Promise.allSettled(
						enrollmentsToRemove.map((e) => oneroster.deleteEnrollment(e.sourcedId))
					)

					const failed = deleteResults.filter((r) => r.status === "rejected")
					if (failed.length === 0) {
						status.unenrolledCurrent = true
						// Update local set to reflect reality for subsequent loop iterations
						enrolledCourseIds.delete(currentConfig.courseId)
						logger.info("successfully unenrolled user from course", {
							userId: user.id,
							courseId: currentConfig.courseId
						})
					} else {
						logger.error("failed to delete some enrollments", {
							userId: user.id,
							courseId: currentConfig.courseId,
							failedCount: failed.length,
							totalCount: enrollmentsToRemove.length
						})
					}
				}
			}
		}

		statuses.push(status)
	}

	return statuses
}
