"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { powerpath } from "@/lib/clients"
import { mergeLessonPlanWithProgress, type MergedLessonPlan } from "@/lib/powerpath-progress"

export async function testPollingAction(): Promise<{ status: "success" | "failure"; timestamp: string }> {
	const shouldFail = Math.random() > 0.5

	logger.info("test polling action called", { shouldFail })

	if (shouldFail) {
		logger.error("test polling action: simulated failure")
		throw errors.new("simulated random failure")
	}

	const result = {
		status: "success" as const,
		timestamp: new Date().toISOString()
	}

	logger.info("test polling action succeeded", { timestamp: result.timestamp })

	return result
}

export async function fetchStudentCourseProgress(
	courseId: string,
	userId: string
): Promise<MergedLessonPlan> {
	logger.info("fetching student course progress", { courseId, userId })

	// fetch lesson plan structure
	const lessonPlanResult = await errors.try(powerpath.getLessonPlanTreeForStudent(courseId, userId))
	if (lessonPlanResult.error) {
		logger.error("failed to fetch lesson plan", { error: lessonPlanResult.error, courseId, userId })
		throw errors.wrap(lessonPlanResult.error, "lesson plan fetch")
	}

	logger.debug("lesson plan structure fetched", {
		courseId,
		userId,
		subComponentCount: lessonPlanResult.data.lessonPlan.subComponents?.length ?? 0
	})

	// fetch progress data
	const progressResult = await errors.try(powerpath.getCourseProgress(courseId, userId))
	if (progressResult.error) {
		logger.error("failed to fetch course progress", { error: progressResult.error, courseId, userId })
		throw errors.wrap(progressResult.error, "course progress fetch")
	}

	logger.debug("course progress data fetched", {
		courseId,
		userId,
		lineItemCount: progressResult.data.lineItems.length,
		componentLineItems: progressResult.data.lineItems.filter(item => item.type === "component").length,
		resourceLineItems: progressResult.data.lineItems.filter(item => item.type === "resource").length
	})

	// merge progress into lesson plan structure
	const merged = mergeLessonPlanWithProgress(lessonPlanResult.data, progressResult.data)

	logger.info("merged lesson plan with progress", {
		courseId,
		userId,
		componentCount: merged.components.length
	})

	return merged
}

