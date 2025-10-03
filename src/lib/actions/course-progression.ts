"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { currentUser } from "@clerk/nextjs/server"
import { powerpath } from "@/lib/clients"
import { mergeLessonPlanWithProgress, HARDCODED_SCIENCE_COURSE_IDS, MASTERY_THRESHOLD } from "@/lib/powerpath-progress"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import { getActiveEnrollmentsForUser } from "@/lib/data/fetchers/oneroster"
import { enrollUserInCoursesByCourseId } from "@/lib/actions/courses"

export type CourseProgressionStatus = {
	currentCourseId: string
	currentCourseProgress: number
	shouldEnrollNext: boolean
	nextCourseId?: string
	alreadyEnrolledInNext: boolean
}

async function getEnrolledCourseIds(sourceId: string): Promise<Set<string>> {
	const enrollmentsResult = await errors.try(getActiveEnrollmentsForUser(sourceId))
	if (enrollmentsResult.error) {
		logger.error("failed to fetch enrollments", { error: enrollmentsResult.error, sourceId })
		throw errors.wrap(enrollmentsResult.error, "enrollments fetch")
	}

	const uniqueClassIds = [...new Set(enrollmentsResult.data.map((e) => e.class.sourcedId))]

	const { getClass } = await import("@/lib/data/fetchers/oneroster")
	const classResults = await Promise.all(
		uniqueClassIds.map(async (classId) => {
			const result = await errors.try(getClass(classId))
			if (result.error) {
				logger.error("failed to get class", { error: result.error, classId })
				return undefined
			}
			return result.data
		})
	)

	return new Set(
		classResults
			.filter((cls): cls is NonNullable<typeof cls> => cls !== undefined)
			.map((cls) => cls.course.sourcedId)
	)
}

function hasRelevantEnrollments(enrolledCourseIds: Set<string>, courseSequence: readonly string[]): boolean {
	return courseSequence.some((courseId) => enrolledCourseIds.has(courseId))
}

async function getCourseOverallProgress(courseId: string, userId: string): Promise<number> {
	const lessonPlanResult = await errors.try(powerpath.getLessonPlanTreeForStudent(courseId, userId))
	if (lessonPlanResult.error) {
		logger.error("failed to fetch lesson plan for progression check", {
			error: lessonPlanResult.error,
			courseId,
			userId
		})
		throw errors.wrap(lessonPlanResult.error, "lesson plan fetch")
	}

	const progressResult = await errors.try(powerpath.getCourseProgress(courseId, userId))
	if (progressResult.error) {
		logger.error("failed to fetch course progress for progression check", {
			error: progressResult.error,
			courseId,
			userId
		})
		throw errors.wrap(progressResult.error, "course progress fetch")
	}

	const merged = mergeLessonPlanWithProgress(lessonPlanResult.data, progressResult.data)

	if (merged.components.length === 0) return 0

	const avgProgress =
		merged.components.reduce((sum, c) => sum + c.componentProgress.progress, 0) / merged.components.length

	return avgProgress
}

export async function checkAndProgressCourses(): Promise<CourseProgressionStatus[]> {
	const user = await currentUser()
	if (!user) {
		logger.error("user not authenticated for course progression")
		throw errors.new("user not authenticated")
	}

	const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!metadataValidation.success) {
		logger.error("invalid user metadata for course progression", {
			userId: user.id,
			error: metadataValidation.error
		})
		throw errors.wrap(metadataValidation.error, "user metadata validation")
	}

	const sourceId = metadataValidation.data.sourceId
	if (!sourceId) {
		logger.debug("user has no sourceId, skipping course progression", { userId: user.id })
		return []
	}

	const enrolledCourseIdsResult = await errors.try(getEnrolledCourseIds(sourceId))
	if (enrolledCourseIdsResult.error) {
		logger.error("failed to get enrolled courses for progression", {
			error: enrolledCourseIdsResult.error,
			userId: user.id,
			sourceId
		})
		throw errors.wrap(enrolledCourseIdsResult.error, "enrolled courses fetch")
	}

	const enrolledCourseIds = enrolledCourseIdsResult.data

	if (!hasRelevantEnrollments(enrolledCourseIds, HARDCODED_SCIENCE_COURSE_IDS)) {
		logger.debug("user not enrolled in any science sequence courses, skipping progression", {
			userId: user.id,
			sourceId,
			enrolledCourseCount: enrolledCourseIds.size
		})
		return []
	}

	logger.info("checking course progression", {
		userId: user.id,
		sourceId,
		enrolledCourseCount: enrolledCourseIds.size,
		scienceCourseCount: HARDCODED_SCIENCE_COURSE_IDS.length
	})

	const statuses: CourseProgressionStatus[] = []

	for (let i = 0; i < HARDCODED_SCIENCE_COURSE_IDS.length; i++) {
		const courseId = HARDCODED_SCIENCE_COURSE_IDS[i]
		if (!courseId) continue
		
		const nextCourseId = HARDCODED_SCIENCE_COURSE_IDS[i + 1]

		if (!enrolledCourseIds.has(courseId)) {
			logger.debug("user not enrolled in course, skipping", { courseId, sourceId })
			continue
		}

		const progressResult = await errors.try(getCourseOverallProgress(courseId, sourceId))
		if (progressResult.error) {
			logger.error("failed to get course progress", { error: progressResult.error, courseId, sourceId })
			continue
		}

		const progress = progressResult.data
		const meetsThreshold = progress >= MASTERY_THRESHOLD
		const hasNextCourse = nextCourseId !== undefined
		const alreadyEnrolledInNext = nextCourseId ? enrolledCourseIds.has(nextCourseId) : false

		const status: CourseProgressionStatus = {
			currentCourseId: courseId,
			currentCourseProgress: progress,
			shouldEnrollNext: meetsThreshold && hasNextCourse && !alreadyEnrolledInNext,
			nextCourseId,
			alreadyEnrolledInNext
		}

		statuses.push(status)

		logger.info("course progression status", {
			courseId,
			progress,
			meetsThreshold,
			nextCourseId,
			alreadyEnrolledInNext,
			willEnroll: status.shouldEnrollNext
		})

		if (status.shouldEnrollNext && nextCourseId) {
			logger.info("enrolling user in next course", {
				userId: user.id,
				sourceId,
				currentCourseId: courseId,
				nextCourseId,
				currentProgress: progress
			})

			const enrollResult = await errors.try(enrollUserInCoursesByCourseId([nextCourseId]))
			if (enrollResult.error) {
				logger.error("failed to auto-enroll in next course", {
					error: enrollResult.error,
					userId: user.id,
					nextCourseId
				})
				continue
			}

			logger.info("successfully enrolled user in next course", {
				userId: user.id,
				nextCourseId,
				changed: enrollResult.data.changed
			})

			enrolledCourseIds.add(nextCourseId)
		}
	}

	return statuses
}

