"use server"

import { randomUUID } from "node:crypto"
// Note: services are framework-agnostic. Do not import auth or Next APIs here.
import { auth, clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { getCurrentUserSourcedId, isUserAuthorizedForQuestion } from "@/lib/authorization"
import { oneroster, qti } from "@/lib/clients"
import { XP_PROFICIENCY_THRESHOLD } from "@/lib/constants/progress"
import { isSubjectSlug } from "@/lib/constants/subjects"
import type { SaveAssessmentResultCommand } from "@/lib/dtos/assessment"
import * as assessment from "@/lib/services/assessment"
import * as attempt from "@/lib/services/attempt"
import type { Unit } from "@/lib/types/domain"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
import { findLatestInteractiveAttempt } from "@/lib/utils/assessment-results"
import { assertPercentageInteger } from "@/lib/utils/score"

/**
 * IMPORTANT NOTE ABOUT POWERPATH TERMINOLOGY:
 *
 * PowerPath's API uses the term "lesson" for what OneRoster calls a "componentResource".
 * This is a naming mismatch between the two systems:
 * - OneRoster hierarchy: Course → CourseComponent → ComponentResource
 * - PowerPath terminology: "lesson" = OneRoster's ComponentResource
 *
 * In this file, we use OneRoster's correct terminology in our function parameters
 * (onerosterComponentResourceSourcedId) but pass it to PowerPath's "lesson" field.
 */

/**
 * Processes a question response using the QTI API.
 * This server action wraps the API calls that should never be called from client components.
 *
 * @param qtiItemId - The QTI assessment item ID (e.g., nice_question123)
 * @param selectedResponse - The user's selected response
 * @param responseIdentifier - The identifier for the response being submitted
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId - used by PowerPath
 * @param isInteractiveAssessment - Whether this is a quiz or test (vs exercise)
 * @param assessmentAttemptNumber - The attempt number (0 = first attempt)
 */
export async function processQuestionResponse(
	qtiItemId: string,
	selectedResponse: string | unknown[] | Record<string, unknown>,
	responseIdentifier: string,
	onerosterComponentResourceSourcedId?: string,
	isInteractiveAssessment?: boolean,
	assessmentAttemptNumber?: number
) {
	const onerosterUserSourcedId = await getCurrentUserSourcedId()
	logger.debug("processing question response", {
		qtiItemId,
		responseIdentifier,
		onerosterUserSourcedId,
		onerosterComponentResourceSourcedId,
		isInteractiveAssessment,
		assessmentAttemptNumber
	})

	let isCorrect = false

	// Handle fill-in-the-blank questions with multiple responses
	if (typeof selectedResponse === "object" && !Array.isArray(selectedResponse) && selectedResponse !== null) {
		// This is a fill-in-the-blank question with multiple inputs.
		// The QTI API expects each response to be processed in a separate API call.
		const responseEntries = Object.entries(selectedResponse)

		logger.info("processing multi-input question", {
			qtiItemId,
			responseCount: responseEntries.length,
			responseIdentifiers: responseEntries.map(([id]) => id)
		})

		const results = await Promise.all(
			responseEntries.map(([identifier, value]) =>
				errors.try(
					qti.processResponse(qtiItemId, {
						responseIdentifier: identifier,
						value: String(value) // Ensure value is a string
					})
				)
			)
		)

		// Check for any failed API calls
		const anyErrors = results.some((r) => r.error)
		if (anyErrors) {
			const failedResponses = results.filter((r) => r.error)
			logger.error("one or more qti response processing calls failed for multi-input question", {
				failedResponses: failedResponses.map((r, _idx) => ({
					identifier: responseEntries[results.indexOf(r)]?.[0],
					error: r.error
				})),
				qtiItemId,
				selectedResponse
			})
			throw errors.new("qti response processing failed for multi-input question")
		}

		// The entire question is correct only if ALL individual responses are correct.
		isCorrect = results.every((r) => r.data && r.data.score > 0)

		logger.info("multi-input question processing complete", {
			qtiItemId,
			isCorrect,
			individualScores: results.map((r, idx) => ({
				identifier: responseEntries[idx]?.[0],
				score: r.data?.score
			}))
		})
	} else {
		// Single response or array response (multi-select)
		const qtiResult = await errors.try(qti.processResponse(qtiItemId, { responseIdentifier, value: selectedResponse }))
		if (qtiResult.error) {
			logger.error("qti response processing failed", { error: qtiResult.error, qtiItemId })
			throw errors.wrap(qtiResult.error, "qti response processing")
		}

		isCorrect = qtiResult.data.score > 0
	}

	// External per-question logging and finalize removed

	// For fill-in-the-blank questions, we don't have a single score/feedback
	// Return a simplified response
	return {
		isCorrect,
		score: isCorrect ? 1 : 0,
		feedback: isCorrect ? "Correct!" : "Not quite right. Try again."
	} as const
}

/**
 * Creates a new attempt for an assessment in PowerPath.
 * This allows users to retake assessments multiple times.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId
 * @returns The new attempt information
 */
// createNewAssessmentAttempt removed

/**
 * Checks the current assessment progress and creates a new attempt if the assessment
 * is already finalized (completed). Returns the current attempt number.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId
 * @returns The current attempt number to use
 */
// checkAndCreateNewAttemptIfNeeded removed

/**
 * Finalizes an assessment in PowerPath to ensure all responses are graded
 * and ready for proficiency analysis.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId
 */
// finalizeAssessment removed

/**
 * Processes a skipped question by logging it as incorrect to PowerPath.
 * This is used for summative assessments (quizzes, tests) where skipping
 * should count as an incorrect answer.
 *
 * @param qtiItemId - The QTI assessment item ID that was skipped (e.g., nice_question123)
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId
 * @param attemptNumber - The current attempt number
 */
// processSkippedQuestion removed

/**
 * Computes the next attempt number for a user on an assessment resource using OneRoster.
 * Attempt number is defined as 1 + count of existing AssessmentResults for the line item.
 */
export const getNextAttemptNumber = attempt.getNext

/**
 * Checks if a user has already achieved proficiency (80%+) on an assessment.
 * This is used to prevent XP farming by checking BEFORE saving a new result.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterAssessmentSourcedId - The OneRoster assessment resource sourcedId
 * @returns Whether the user is already proficient (true) or not (false)
 */
export async function checkExistingProficiency(
	onerosterUserSourcedId: string,
	onerosterAssessmentSourcedId: string
): Promise<boolean> {
	logger.info("checking existing proficiency", {
		onerosterUserSourcedId,
		onerosterAssessmentSourcedId
	})

	const strictLineItemId = getAssessmentLineItemId(onerosterAssessmentSourcedId)

	const resultsResult = await errors.try(
		oneroster.getAllResults({
			filter: `student.sourcedId='${onerosterUserSourcedId}' AND assessmentLineItem.sourcedId='${strictLineItemId}'`
		})
	)
	if (resultsResult.error) {
		logger.error("failed to check existing proficiency", {
			onerosterUserSourcedId,
			onerosterAssessmentSourcedId,
			error: resultsResult.error
		})
		// NO FALLBACK - if we can't check, we throw
		throw errors.wrap(resultsResult.error, "proficiency check")
	}

	// CHANGED: Use the new utility to find the latest valid attempt directly.
	const latestResult = findLatestInteractiveAttempt(resultsResult.data, onerosterUserSourcedId, strictLineItemId)

	if (!latestResult) {
		logger.debug("no existing results found", {
			onerosterUserSourcedId,
			onerosterAssessmentSourcedId
		})
		return false
	}

	if (typeof latestResult.score !== "number") {
		logger.error("proficiency check: invalid score type", {
			onerosterUserSourcedId,
			onerosterAssessmentSourcedId,
			scoreType: typeof latestResult.score,
			score: latestResult.score
		})
		throw errors.new("proficiency check: score must be a number")
	}

	const normalizedScore = latestResult.score <= 1.1 ? latestResult.score * 100 : latestResult.score
	const isProficient = normalizedScore >= XP_PROFICIENCY_THRESHOLD

	logger.info("proficiency check complete", {
		onerosterUserSourcedId,
		onerosterAssessmentSourcedId,
		currentScore: normalizedScore,
		isProficient
	})

	return isProficient
}

/**
 * Orchestrates the finalization of an assessment. It calculates the score, saves
 * the result, awards XP, and updates proficiency all in one atomic server action.
 *
 * @param options - The context and raw session data for the assessment.
 * @returns A summary payload for the client's SummaryView.
 */
export async function finalizeAssessment(options: {
	onerosterResourceSourcedId: string
	onerosterComponentResourceSourcedId: string
	onerosterCourseSourcedId: string
	onerosterUserSourcedId: string
	sessionResults: Array<{ qtiItemId: string; isCorrect: boolean | null; isReported?: boolean }>
	attemptNumber: number
	durationInSeconds?: number
	expectedXp: number
	assessmentTitle: string
	assessmentPath: string
	unitData?: Unit
	userEmail?: string
	contentType: "Exercise" | "Quiz" | "Test" | "CourseChallenge"
}) {
	const correlationId = randomUUID()
	logger.info("finalizing assessment", {
		userSourcedId: options.onerosterUserSourcedId,
		resourceSourcedId: options.onerosterResourceSourcedId,
		correlationId
	})

	const { userId: clerkUserId } = await auth()
	if (!clerkUserId) {
		logger.error("finalize assessment: user not authenticated", { correlationId })
		throw errors.new("user not authenticated")
	}

	// Normalize session results for scoring:
	// - Exclude any question where a report was filed at any point
	// - Score ONLY the first attempt with a boolean correctness value per qtiItemId
	//   (subsequent retries do not convert an initially-wrong answer into correct)
	const normalizeSessionResults = (
		session: Array<{ qtiItemId: string; isCorrect: boolean | null; isReported?: boolean }>
	) => {
		// Track per-question state capturing first-attempt semantics and report flags
		const perQuestion: Map<
			string,
			{
				firstBooleanAttempt?: { qtiItemId: string; isCorrect: boolean; isReported?: boolean }
				hasReport: boolean
			}
		> = new Map()

		for (const entry of session) {
			const existing = perQuestion.get(entry.qtiItemId)
			const hasReport = Boolean(existing?.hasReport || entry.isReported)

			// Capture the first attempt that has a definitive boolean correctness
			let firstBooleanAttempt = existing?.firstBooleanAttempt
			if (!firstBooleanAttempt && typeof entry.isCorrect === "boolean") {
				firstBooleanAttempt = { qtiItemId: entry.qtiItemId, isCorrect: entry.isCorrect, isReported: entry.isReported }
			}

			perQuestion.set(entry.qtiItemId, {
				firstBooleanAttempt,
				hasReport
			})
		}

		// Collect only questions without any report, taking their first boolean attempt
		const normalized: Array<{ qtiItemId: string; isCorrect: boolean; isReported?: boolean }> = []
		for (const { firstBooleanAttempt, hasReport } of perQuestion.values()) {
			if (hasReport) continue
			if (firstBooleanAttempt) {
				normalized.push({ qtiItemId: firstBooleanAttempt.qtiItemId, isCorrect: firstBooleanAttempt.isCorrect })
			}
		}
		return normalized
	}

	const normalizedResults = normalizeSessionResults(options.sessionResults)

	const correctAnswers = normalizedResults.filter((r) => r.isCorrect).length
	const totalQuestions = normalizedResults.length
	const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 100

	// Extract subject and course slugs from assessment path
	const pathParts = options.assessmentPath.split("/")
	if (pathParts.length < 3 || !pathParts[1] || !pathParts[2]) {
		logger.error("invalid assessment path structure", { assessmentPath: options.assessmentPath, correlationId })
		throw errors.new("assessment path invalid")
	}
	const subjectSlugRaw = pathParts[1]
	if (!isSubjectSlug(subjectSlugRaw)) {
		logger.error("invalid subject slug in assessment path", {
			subjectSlug: subjectSlugRaw,
			assessmentPath: options.assessmentPath,
			correlationId
		})
		throw errors.new("subject slug invalid")
	}
	const subjectSlug = subjectSlugRaw
	const courseSlug = pathParts[2]

	// Build the command DTO for the service layer
	// Fetch user metadata for downstream services (streak)
	const clerk = await clerkClient()
	const user = await clerk.users.getUser(clerkUserId)

	const command: SaveAssessmentResultCommand = {
		...options,
		// Persist normalized session results to ensure downstream consumers use consistent data
		sessionResults: normalizedResults,
		score: assertPercentageInteger(score, "assessment score"),
		correctAnswers,
		totalQuestions,
		isInteractiveAssessment: true,
		clerkUserId,
		correlationId,
		// zod schema now validates subjectSlug against SUBJECT_SLUGS; pass through
		subjectSlug,
		courseSlug,
		userPublicMetadata: user.publicMetadata
	}

	// 2. Call the new assessment service orchestrator
	const saveResult = await errors.try(assessment.saveResult(command))
	if (saveResult.error) {
		logger.error("failed to save final assessment result", {
			error: saveResult.error,
			resourceSourcedId: options.onerosterResourceSourcedId
		})
		throw errors.wrap(saveResult.error, "failed to save final assessment result")
	}

	// 3. Return a clean summary object for the client's SummaryView.
	const extractXpInfo = () => {
		if (!saveResult.data || typeof saveResult.data !== "object" || !("xp" in saveResult.data)) {
			return undefined
		}
		const xp = saveResult.data.xp
		if (
			xp &&
			typeof xp === "object" &&
			"finalXp" in xp &&
			"penaltyApplied" in xp &&
			"reason" in xp &&
			typeof xp.finalXp === "number" &&
			typeof xp.penaltyApplied === "boolean" &&
			typeof xp.reason === "string"
		) {
			return xp
		}
		return undefined
	}
	const xpInfo = extractXpInfo()

	const avgSecondsPerQuestion =
		options.durationInSeconds && totalQuestions > 0 ? options.durationInSeconds / totalQuestions : undefined

	return {
		score: score,
		correctAnswersCount: correctAnswers,
		totalQuestions: totalQuestions,
		xpPenaltyInfo:
			xpInfo?.penaltyApplied === true
				? {
						penaltyXp: xpInfo.finalXp,
						reason: xpInfo.reason,
						avgSecondsPerQuestion
					}
				: undefined
	}
}

/**
 * Flags a question as reported in the QTI API by updating its metadata.
 * This is the primary server action for the "Report an issue" feature.
 * @param questionId The QTI AssessmentItem identifier (e.g., "nice_x...").
 * @param report The user's report message describing the issue.
 */
export async function flagQuestionAsReported(questionId: string, report: string): Promise<{ success: boolean }> {
	const { userId: clerkUserId } = await auth()
	if (!clerkUserId) {
		logger.error("flag question: user not authenticated", { questionId })
		throw errors.new("user not authenticated")
	}

	const userSourcedId = await getCurrentUserSourcedId()

	const isAuthorized = await isUserAuthorizedForQuestion(userSourcedId, questionId)
	if (!isAuthorized) {
		logger.warn("unauthorized attempt to report question", { clerkUserId, userSourcedId, questionId })
		throw errors.new("user not authorized to report this question")
	}

	logger.info("flagging question as reported", { clerkUserId, questionId, report })

	const flagQuestionOperation = async () => {
		const existingItem = await qti.getAssessmentItem(questionId)

		const updatedMetadata = {
			...existingItem.metadata,
			status: "reported",
			report: report.trim(),
			lastReported: new Date().toISOString(),
			reportedBy: clerkUserId
		}

		logger.info("updating question metadata", { questionId, updatedMetadata })

		const updatePayload = {
			identifier: existingItem.identifier,
			xml: existingItem.rawXml,
			metadata: updatedMetadata
		}

		await qti.updateAssessmentItem(updatePayload)
	}

	const flagResult = await errors.try(flagQuestionOperation())
	if (flagResult.error) {
		logger.error("failed to flag question in qti api", { clerkUserId, questionId, error: flagResult.error })
		throw errors.wrap(flagResult.error, "flagging question in qti api")
	}

	logger.info("successfully flagged question as reported", { clerkUserId, questionId })
	return { success: true }
}
