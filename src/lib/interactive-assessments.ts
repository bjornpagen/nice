import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { createNewAssessmentAttempt } from "@/lib/actions/assessment"
import { powerpath } from "@/lib/clients"
import type { AssessmentTest, TestQuestionsResponse } from "@/lib/qti"
import { applyQtiSelectionAndOrdering } from "@/lib/qti-selection"
import type { Question } from "@/lib/types/domain"

export type RotationMode = "deterministic" | "random"

interface PrepareOptions {
	userSourceId: string
	resourceSourcedId: string
	componentResourceSourcedId: string
	assessmentTest: AssessmentTest
	resolvedQuestions: TestQuestionsResponse["questions"]
	rotationMode: RotationMode
}

export async function prepareInteractiveAssessment(options: PrepareOptions): Promise<{
	questions: Question[]
	attemptNumber: number
}> {
	const {
		userSourceId,
		resourceSourcedId,
		componentResourceSourcedId,
		assessmentTest,
		resolvedQuestions,
		rotationMode
	} = options

	// 1) Read current progress/attempt
	const progressResult = await errors.try(powerpath.getAssessmentProgress(userSourceId, componentResourceSourcedId))
	if (progressResult.error) {
		logger.error("failed to fetch assessment progress for selection", {
			error: progressResult.error,
			componentResourceSourcedId
		})
		throw errors.wrap(progressResult.error, "powerpath assessment progress")
	}

	// 2) Auto-rollover if finalized
	let attemptNumber = progressResult.data.attempt
	const isFinalized = Boolean(progressResult.data.finalized)
	if (isFinalized) {
		const newAttempt = await errors.try(createNewAssessmentAttempt(userSourceId, componentResourceSourcedId))
		if (newAttempt.error) {
			logger.error("failed to auto-create new attempt on page load", {
				error: newAttempt.error,
				componentResourceSourcedId
			})
		} else {
			const newAttemptNumber = newAttempt.data.attempt.attempt
			if (typeof newAttemptNumber === "number") {
				attemptNumber = newAttemptNumber
				logger.info("auto-created new attempt on page load", {
					componentResourceSourcedId,
					attemptNumber
				})
			}
		}
	}

	if (typeof attemptNumber !== "number") {
		logger.error("assessment attempt number missing", { componentResourceSourcedId })
		throw errors.new("assessment attempt number missing")
	}

	// 3) Select questions per rotation mode
	let questions: Question[]
	if (rotationMode === "deterministic") {
		questions = applyQtiSelectionAndOrdering(assessmentTest, resolvedQuestions, {
			baseSeed: `${userSourceId}:${resourceSourcedId}`,
			attemptNumber
		})
	} else {
		// random: rely on internal shuffle when baseSeed is not provided
		questions = applyQtiSelectionAndOrdering(assessmentTest, resolvedQuestions)
	}

	return { questions, attemptNumber }
}
