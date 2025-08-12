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

	// 2) Auto-rollover on entry: based on finalized only (marker logic removed)
	let attemptNumber = progressResult.data.attempt
	const isFinalized = Boolean(progressResult.data.finalized)
	if (!isFinalized) {
		// Poll briefly to reduce SSR latency; client-side init will catch longer lags
		const backoffMs = [100, 200, 400, 800, 1600]
		for (const delay of backoffMs) {
			await new Promise((resolve) => setTimeout(resolve, delay))
			const retryProgress = await errors.try(powerpath.getAssessmentProgress(userSourceId, componentResourceSourcedId))
			if (retryProgress.error) {
				logger.error("progress polling failed", { error: retryProgress.error, componentResourceSourcedId })
				continue
			}
			if (retryProgress.data.finalized) {
				logger.info("progress finalized after polling", { componentResourceSourcedId, delay })
				break
			}
		}
	}

	// Re-check and attempt to create next attempt when finalized
	const progressAfter = isFinalized
		? progressResult
		: await errors.try(powerpath.getAssessmentProgress(userSourceId, componentResourceSourcedId))
	if (!progressAfter.error && Boolean(progressAfter.data.finalized)) {
		// Try to create; if 422, retry with small backoff once
		let createResult = await errors.try(createNewAssessmentAttempt(userSourceId, componentResourceSourcedId))
		if (createResult.error) {
			logger.error("failed to auto-create new attempt on page load", {
				error: createResult.error,
				componentResourceSourcedId
			})
			// Retry once if backend says not completed yet
			const msg = String(createResult.error)
			if (msg.includes("not completed") || msg.includes("422")) {
				await new Promise((r) => setTimeout(r, 200))
				createResult = await errors.try(createNewAssessmentAttempt(userSourceId, componentResourceSourcedId))
				if (createResult.error) {
					logger.error("retry: failed to auto-create new attempt on page load", {
						error: createResult.error,
						componentResourceSourcedId
					})
				}
			}
		}
		if (!createResult.error) {
			const newAttemptNumber = createResult.data.attempt.attempt
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
