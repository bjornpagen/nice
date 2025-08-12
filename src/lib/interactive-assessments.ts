import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { cookies } from "next/headers"
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

	// 2) Auto-rollover on entry: use one-shot cookie OR finalized
	let attemptNumber = progressResult.data.attempt
	const isFinalized = Boolean(progressResult.data.finalized)
	let forceRollover = false
	const cookieStoreResult = await errors.try(cookies())
	if (cookieStoreResult.error) {
		logger.error("failed to obtain cookie store for rollover marker read", {
			error: cookieStoreResult.error,
			componentResourceSourcedId
		})
	} else {
		const store = cookieStoreResult.data
		const marker = store.get(`nice_force_rollover_${componentResourceSourcedId}`)
		forceRollover = Boolean(marker?.value === "1")
	}

	if (isFinalized || forceRollover) {
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
				// Clear the marker cookie on success
				const clearStoreResult = await errors.try(cookies())
				if (clearStoreResult.error) {
					logger.error("failed to obtain cookie store for rollover marker clear", {
						error: clearStoreResult.error,
						componentResourceSourcedId
					})
				} else {
					clearStoreResult.data.set(`nice_force_rollover_${componentResourceSourcedId}`, "", {
						httpOnly: true,
						path: "/",
						maxAge: 0
					})
					logger.info("cleared rollover marker cookie", { componentResourceSourcedId })
				}
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
