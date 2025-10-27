"use server"

import { randomUUID } from "node:crypto"
// Note: services are framework-agnostic. Do not import auth or Next APIs here.
import { auth, clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import {
	type AssessmentQuestionState,
	type AssessmentState,
	createAssessmentState,
	deleteAssessmentState,
	ErrAssessmentStateNotFound,
	getAssessmentState,
	markAssessmentFinalizationFailed,
	markAssessmentFinalized,
	updateStateAndQuestion
} from "@/lib/assessment-cache"
import { getCurrentUserSourcedId, isUserAuthorizedForQuestion } from "@/lib/authorization"
import { oneroster, qti } from "@/lib/clients"
import { XP_PROFICIENCY_THRESHOLD } from "@/lib/constants/progress"
import { isSubjectSlug } from "@/lib/constants/subjects"
import { fetchAndResolveQuestions } from "@/lib/data/fetchers/interactive-helpers"
import type { SaveAssessmentResultCommand } from "@/lib/dtos/assessment"
import { applyQtiSelectionAndOrdering } from "@/lib/qti-selection"
import * as assessment from "@/lib/services/assessment"
import * as attempt from "@/lib/services/attempt"
import type { Question, Unit } from "@/lib/types/domain"
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
 * Retrieves a deterministic list of questions for an assessment based on user, assessment, and attempt.
 * This ensures the same questions are shown for a specific attempt, even after page refresh.
 */
async function getDeterministicQuestionList(
	userSourcedId: string,
	assessmentResourceSourcedId: string,
	attemptNumber: number
): Promise<Question[]> {
	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(assessmentResourceSourcedId)

	const questions = applyQtiSelectionAndOrdering(assessmentTest, resolvedQuestions, {
		baseSeed: `${userSourcedId}:${assessmentResourceSourcedId}`,
		attemptNumber,
		userSourceId: userSourcedId,
		resourceSourcedId: assessmentResourceSourcedId
	})

	return questions
}

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
	const { userId } = await auth()
	if (!userId) {
		logger.error("processQuestionResponse failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
	logger.debug("processing question response", {
		qtiItemId,
		responseIdentifier,
		onerosterUserSourcedId,
		onerosterComponentResourceSourcedId,
		isInteractiveAssessment,
		assessmentAttemptNumber
	})

	// Fetch authoritative response declarations to validate identifiers
	/**
	 * IMPORTANT: Temporary compatibility with AE Studios' OTI/QTI service
	 *
	 * We currently rely on the provider's JSON representation of assessment items
	 * (e.g., `responseDeclarations` on the GET /assessment-items/:id response) to
	 * derive the set of declared response identifiers for validation and filtering.
	 * This is necessary to harden against the iframe/player emitting undeclared
	 * identifiers (e.g., a stray "RESPONSE").
	 *
	 * TODO(migration): When we migrate off the current AE Studios implementation
	 * of OTI/QTI, REWRITE this logic to parse the raw XML (`rawXml`) directly
	 * to extract response declarations, their identifiers, cardinalities, and
	 * base types. Do not depend on provider-specific JSON shapes. The XML parse
	 * must be the single source of truth to avoid vendor lock-in and drift.
	 *
	 * Migration acceptance criteria:
	 * - Parse <qti-response-declaration> nodes from XML and compute `allowedIds`
	 * - Respect record vs single/multiple/ordered cardinality for how we submit
	 * - Keep unknown identifiers strictly rejected (no fallbacks)
	 * - Preserve the behavior documented by tests in
	 *   `tests/actions/assessment/response-filtering.test.ts`
	 */
	const itemResult = await errors.try(qti.getAssessmentItem(qtiItemId))
	if (itemResult.error) {
		logger.error("failed to get qti assessment item for response processing", { error: itemResult.error, qtiItemId })
		throw errors.wrap(itemResult.error, "qti get assessment item")
	}
	const declarations = itemResult.data.responseDeclarations ?? []
	const allowedIds = new Set(declarations.map((d) => d.identifier))
	if (allowedIds.size === 0) {
		logger.error("qti item has no response declarations", { qtiItemId })
		throw errors.new("qti item: no response declarations")
	}

	// Handle fill-in-the-blank questions with multiple responses
	if (typeof selectedResponse === "object" && !Array.isArray(selectedResponse) && selectedResponse !== null) {
		const originalEntries = Object.entries(selectedResponse)
		const responseEntries = originalEntries.filter(([id]) => allowedIds.has(id))

		logger.info("processing multi-input question", {
			qtiItemId,
			responseCount: responseEntries.length,
			responseIdentifiers: responseEntries.map(([id]) => id),
			ignoredIdentifiers: originalEntries.filter(([id]) => !allowedIds.has(id)).map(([id]) => id)
		})

		if (responseEntries.length === 0) {
			logger.error("no declared response identifiers present in selected response", {
				qtiItemId,
				allowedIdentifiers: Array.from(allowedIds),
				originalIdentifiers: originalEntries.map(([id]) => id)
			})
			throw errors.new("no declared response identifiers")
		}

		const results = await Promise.all(
			responseEntries.map(async ([identifier, value]) => {
				const normalizedValue = Array.isArray(value) ? value : String(value)
				const result = await errors.try(
					qti.processResponse(qtiItemId, {
						responseIdentifier: identifier,
						value: normalizedValue
					})
				)
				if (result.error) {
					return result
				}
				return result
			})
		)

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

		const isAllCorrect = results.every((r) => r.data && r.data.score > 0)
		logger.info("multi-input question processing complete", {
			qtiItemId,
			isCorrect: isAllCorrect,
			individualScores: results.map((r, idx) => ({
				identifier: responseEntries[idx]?.[0],
				score: r.data?.score
			}))
		})

		return {
			isCorrect: isAllCorrect,
			score: isAllCorrect ? 1 : 0,
			feedback: isAllCorrect ? "Correct!" : "Not quite right. Try again."
		} as const
	}

	// Single response or array response (multi-select)
	if (!allowedIds.has(responseIdentifier)) {
		logger.error("undeclared response identifier for single response", {
			qtiItemId,
			responseIdentifier,
			allowedIdentifiers: Array.from(allowedIds)
		})
		throw errors.new("undeclared response identifier")
	}

	const qtiResult = await errors.try(qti.processResponse(qtiItemId, { responseIdentifier, value: selectedResponse }))
	if (qtiResult.error) {
		logger.error("qti response processing failed", { error: qtiResult.error, qtiItemId })
		throw errors.wrap(qtiResult.error, "qti response processing")
	}

	const isCorrect = qtiResult.data.score > 0
	return {
		isCorrect,
		score: isCorrect ? 1 : 0,
		feedback: isCorrect ? "Correct!" : "Not quite right. Try again."
	} as const
}

/**
 * Gets or creates the assessment state in Redis.
 * If the assessment is already finalized or completed, triggers finalization and returns the finalized state.
 * Otherwise returns the current state to resume from.
 */
export async function getOrCreateAssessmentState(onerosterResourceSourcedId: string): Promise<AssessmentState> {
	const { userId } = await auth()
	if (!userId) {
		logger.error("getOrCreateAssessmentState failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)

	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
	const existingState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)

	if (existingState) {
		// If the state exists and is already finalized, simply return it.
		// The client will use this to display the summary screen.
		if (existingState.isFinalized) {
			logger.info("resuming an already finalized assessment state", {
				onerosterUserSourcedId,
				onerosterResourceSourcedId,
				attemptNumber
			})
			return existingState
		}
		// This is a valid, in-progress state that can be resumed.
		return existingState
	}

	const questions = await getDeterministicQuestionList(
		onerosterUserSourcedId,
		onerosterResourceSourcedId,
		attemptNumber
	)
	return createAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber, questions.length)
}

/**
 * Submits the **first and only graded answer** for a question.
 *
 * This action is central to the assessment's integrity. It is called only on the user's
 * first attempt for a given question. It determines correctness, records the result and response
 * into the Redis state, and then **atomically advances the server's `currentQuestionIndex`**.
 *
 * This immediate advancement ensures that even if the user refreshes the page, their first
 * answer is locked in, preventing any attempts to "game" the system. Subsequent attempts on the
 * client-side are for formative feedback only and use the compute-only `processQuestionResponse` function.
 *
 * @returns An object containing the new, advanced `AssessmentState` and the `isCorrect` boolean.
 */
export async function submitAnswer(
	onerosterResourceSourcedId: string,
	questionId: string,
	questionIndex: number,
	responseValue: string | unknown[] | Record<string, unknown>,
	responseIdentifier: string
): Promise<{ state: AssessmentState; isCorrect: boolean }> {
	const { userId } = await auth()
	if (!userId) {
		logger.error("submitAnswer failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)

	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
	const state = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
	if (!state) {
		logger.error("assessment state not found", { onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber })
		throw ErrAssessmentStateNotFound
	}
	if (state.currentQuestionIndex !== questionIndex) {
		logger.error("out-of-order answer submission", {
			currentIndex: state.currentQuestionIndex,
			submittedIndex: questionIndex
		})
		throw errors.new("out-of-order answer submission")
	}

	const questionList = await getDeterministicQuestionList(
		onerosterUserSourcedId,
		onerosterResourceSourcedId,
		state.attemptNumber
	)
	if (questionList[questionIndex]?.id !== questionId) {
		logger.error("question id mismatch", {
			expectedId: questionList[questionIndex]?.id,
			receivedId: questionId,
			questionIndex
		})
		throw errors.new("question id mismatch")
	}

	// Process the response to determine correctness
	/**
	 * IMPORTANT: Temporary compatibility with AE Studios' OTI/QTI service
	 *
	 * See note in `processQuestionResponse` above. The same migration work applies
	 * here when we remove reliance on provider JSON and parse `rawXml` instead
	 * to obtain declared response identifiers and cardinalities.
	 */
	let isCorrect = false

	// Fetch authoritative response declarations to validate identifiers
	/**
	 * IMPORTANT: Temporary compatibility with AE Studios' OTI/QTI service
	 *
	 * We currently rely on the provider's JSON representation of assessment items
	 * (e.g., `responseDeclarations` on the GET /assessment-items/:id response) to
	 * derive the set of declared response identifiers for validation and filtering.
	 * This is necessary to harden against the iframe/player emitting undeclared
	 * identifiers (e.g., a stray "RESPONSE").
	 *
	 * TODO(migration): When we migrate off the current AE Studios implementation
	 * of OTI/QTI, REWRITE this logic to parse the raw XML (`rawXml`) directly
	 * to extract response declarations, their identifiers, cardinalities, and
	 * base types. Do not depend on provider-specific JSON shapes. The XML parse
	 * must be the single source of truth to avoid vendor lock-in and drift.
	 *
	 * Migration acceptance criteria:
	 * - Parse <qti-response-declaration> nodes from XML and compute `allowedIds`
	 * - Respect record vs single/multiple/ordered cardinality for how we submit
	 * - Keep unknown identifiers strictly rejected (no fallbacks)
	 * - Preserve the behavior documented by tests in
	 *   `tests/actions/assessment/response-filtering.test.ts`
	 */
	const itemResult = await errors.try(qti.getAssessmentItem(questionId))
	if (itemResult.error) {
		logger.error("failed to get qti assessment item for submit", { error: itemResult.error, questionId })
		throw errors.wrap(itemResult.error, "qti get assessment item")
	}
	const declarations = itemResult.data.responseDeclarations ?? []
	const allowedIds = new Set(declarations.map((d) => d.identifier))
	if (allowedIds.size === 0) {
		logger.error("qti item has no response declarations", { questionId })
		throw errors.new("qti item: no response declarations")
	}

	// Handle fill-in-the-blank questions with multiple responses
	if (typeof responseValue === "object" && !Array.isArray(responseValue) && responseValue !== null) {
		const originalEntries = Object.entries(responseValue)
		const responseEntries = originalEntries.filter(([id]) => allowedIds.has(id))

		logger.info("processing multi-input question", {
			qtiItemId: questionId,
			responseCount: responseEntries.length,
			responseIdentifiers: responseEntries.map(([id]) => id),
			ignoredIdentifiers: originalEntries.filter(([id]) => !allowedIds.has(id)).map(([id]) => id)
		})

		if (responseEntries.length === 0) {
			logger.error("no declared response identifiers present in selected response", {
				qtiItemId: questionId,
				allowedIdentifiers: Array.from(allowedIds),
				originalIdentifiers: originalEntries.map(([id]) => id)
			})
			throw errors.new("no declared response identifiers")
		}

		const results = await Promise.all(
			responseEntries.map(async ([identifier, value]) => {
				const normalizedValue = Array.isArray(value) ? value : String(value)
				const result = await errors.try(
					qti.processResponse(questionId, {
						responseIdentifier: identifier,
						value: normalizedValue
					})
				)
				if (result.error) {
					return result
				}
				return result
			})
		)

		const anyErrors = results.some((r) => r.error)
		if (anyErrors) {
			const failedResponses = results.filter((r) => r.error)
			logger.error("one or more qti response processing calls failed for multi-input question", {
				failedResponses: failedResponses.map((r, _idx) => ({
					identifier: responseEntries[results.indexOf(r)]?.[0],
					error: r.error
				})),
				qtiItemId: questionId,
				selectedResponse: responseValue
			})
			throw errors.new("qti response processing failed for multi-input question")
		}

		// The entire question is correct only if ALL individual responses are correct.
		isCorrect = results.every((r) => r.data && r.data.score > 0)

		logger.info("multi-input question processing complete", {
			qtiItemId: questionId,
			isCorrect,
			individualScores: results.map((r, idx) => ({
				identifier: responseEntries[idx]?.[0],
				score: r.data?.score
			}))
		})
	} else {
		// Single response or array response (multi-select)
		if (!allowedIds.has(responseIdentifier)) {
			logger.error("undeclared response identifier for single response", {
				qtiItemId: questionId,
				responseIdentifier,
				allowedIdentifiers: Array.from(allowedIds)
			})
			throw errors.new("undeclared response identifier")
		}

		const qtiResult = await errors.try(qti.processResponse(questionId, { responseIdentifier, value: responseValue }))
		if (qtiResult.error) {
			logger.error("qti response processing failed", { error: qtiResult.error, qtiItemId: questionId })
			throw errors.wrap(qtiResult.error, "qti response processing")
		}

		isCorrect = qtiResult.data.score > 0
	}

	await updateStateAndQuestion(onerosterUserSourcedId, onerosterResourceSourcedId, state.attemptNumber, questionIndex, {
		isCorrect,
		response: responseValue,
		isReported: false
	})

	// Refresh local state object based on what was just written
	state.questions[questionIndex] = { isCorrect, response: responseValue, isReported: false }
	state.currentQuestionIndex = questionIndex + 1

	// Note: We don't auto-finalize here since we don't have all required params
	// The client will need to call finalizeAssessment when ready

	return { state, isCorrect }
}

/**
 * Skips the current question, marking it as INCORRECT
 *
 * This action records the question with `isCorrect: false` in the Redis state.
 * The question will count towards the denominator (total questions) and will
 * negatively impact the final score, which is consistent with the user-facing
 * messaging. This behavior is distinct from reporting a question.
 *
 * @returns An object containing the new, advanced `AssessmentState`.
 */
export async function skipQuestion(
	onerosterResourceSourcedId: string,
	questionId: string,
	questionIndex: number
): Promise<{ state: AssessmentState }> {
	const { userId } = await auth()
	if (!userId) {
		logger.error("skipQuestion failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
	const state = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
	if (!state) {
		logger.error("assessment state not found for skip", {
			onerosterUserSourcedId,
			onerosterResourceSourcedId,
			attemptNumber
		})
		throw ErrAssessmentStateNotFound
	}
	// Allow idempotent replays after the server has already advanced past this index.
	if (state.currentQuestionIndex > questionIndex) {
		logger.info("skip already processed", {
			currentIndex: state.currentQuestionIndex,
			submittedIndex: questionIndex,
			questionId
		})
		return { state }
	}

	if (state.currentQuestionIndex < questionIndex) {
		logger.error("future skip received", { currentIndex: state.currentQuestionIndex, submittedIndex: questionIndex })
		throw errors.new("out-of-order skip")
	}

	const questionList = await getDeterministicQuestionList(
		onerosterUserSourcedId,
		onerosterResourceSourcedId,
		state.attemptNumber
	)
	if (questionList[questionIndex]?.id !== questionId) {
		logger.error("question id mismatch on skip", {
			expectedId: questionList[questionIndex]?.id,
			receivedId: questionId,
			questionIndex
		})
		throw errors.new("question id mismatch")
	}

	// This is the key business logic change. A skipped question is an incorrect question.
	const skipState: AssessmentQuestionState = { isCorrect: false, response: null, isReported: false }
	await updateStateAndQuestion(
		onerosterUserSourcedId,
		onerosterResourceSourcedId,
		state.attemptNumber,
		questionIndex,
		skipState
	)

	// Update local state
	state.questions[questionIndex] = skipState
	state.currentQuestionIndex = questionIndex + 1

	logger.info("question skipped", { questionId, questionIndex })
	return { state }
}

/**
 * Reports an issue with a question and advances the user past it, EXCLUDING it from the final score.
 *
 * This action implements the "report and skip" business logic:
 * 1. It atomically updates the question's state in Redis, setting `isReported: true` and `isCorrect: null`.
 * 2. It advances the `currentQuestionIndex`, removing the question from the user's active assessment path.
 * 3. It then flags the question in an external service with the user's report.
 *
 * During finalization, any question with `isReported: true` or `isCorrect: null` is
 * excluded from both the numerator (correct answers) and the denominator (total questions) of the score.
 *
 * @returns An object containing the new, advanced `AssessmentState`.
 */
export async function reportQuestion(
	onerosterResourceSourcedId: string,
	questionId: string,
	questionIndex: number,
	report: string
): Promise<{ state: AssessmentState }> {
	const { userId } = await auth()
	if (!userId) {
		logger.error("reportQuestion failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)

	const currentState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
	if (!currentState) {
		logger.error("assessment state not found for report", {
			onerosterUserSourcedId,
			onerosterResourceSourcedId,
			attemptNumber
		})
		throw ErrAssessmentStateNotFound
	}

	// Prepare the updated question state. A reported question is neither correct nor incorrect for scoring purposes.
	const existingQuestionState = currentState.questions[questionIndex]
	const updatedQuestionState: AssessmentQuestionState = {
		...existingQuestionState,
		isCorrect: null, // Always nullify correctness when reported to exclude from scoring.
		response: existingQuestionState?.response ?? null,
		isReported: true
	}

	// CRITICAL: First, update the user's state in Redis to ensure they are unblocked and their progress is saved.
	const updateResult = await errors.try(
		updateStateAndQuestion(
			onerosterUserSourcedId,
			onerosterResourceSourcedId,
			currentState.attemptNumber,
			questionIndex,
			updatedQuestionState,
			true // Overwrite any existing state for this question.
		)
	)
	if (updateResult.error) {
		logger.error("failed to update redis state for reported question", {
			error: updateResult.error,
			questionId,
			questionIndex
		})
		throw errors.wrap(updateResult.error, "update redis state for reported question")
	}

	// NON-CRITICAL: After the user's state is secured, call the external reporting service.
	// A failure here is logged but does not affect the user's experience.
	const flagResult = await errors.try(flagQuestionAsReported(questionId, report))
	if (flagResult.error) {
		logger.error("non-critical: failed to flag question in external service after state update", {
			error: flagResult.error,
			questionId
		})
	} else {
		logger.info("question reported to external service", { questionId })
	}

	// Fetch and return the latest state to ensure the client UI is consistent.
	const newState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
	if (!newState) {
		logger.error("failed to get state after reporting question", {
			onerosterUserSourcedId,
			onerosterResourceSourcedId,
			attemptNumber
		})
		throw ErrAssessmentStateNotFound
	}

	return { state: newState }
}

/**
 * Computes the next attempt number for a user on an assessment resource using OneRoster.
 * Attempt number is defined as 1 + count of existing AssessmentResults for the line item.
 */
export async function getNextAttemptNumber(
	userSourcedId: string,
	resourceSourcedId: string
): Promise<number> {
	return attempt.getNext(userSourcedId, resourceSourcedId)
}

/**
 * Checks if a user has already achieved proficiency (80%+) on an assessment.
 * This is used to prevent XP farming by checking BEFORE saving a new result.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterAssessmentSourcedId - The OneRoster assessment resource sourcedId
 * @returns Whether the user is already proficient (true) or not (false)
 */
export async function checkExistingProficiency(onerosterAssessmentSourcedId: string): Promise<boolean> {
	const { userId } = await auth()
	if (!userId) {
		logger.error("checkExistingProficiency failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
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
 * Orchestrates the finalization of an assessment.
 *
 * This is the culminating action called when a user completes the last question. It reads the
 * **server-authoritative state from Redis** (not from client input), calculates the final score,
 * saves the official result to OneRoster via the assessment service, and awards XP.
 *
 * **CRITICAL BUSINESS LOGIC:**
 * - The Redis state is the SINGLE SOURCE OF TRUTH for assessment results
 * - Redis only stores the FIRST ATTEMPT for each question (subsequent attempts are for formative feedback only)
 * - Reported questions (where isReported=true or isCorrect=null) are EXCLUDED from scoring
 * - The final score = (correct answers / scorable questions) × 100, where scorable questions exclude reported ones
 *
 * After all permanent storage is updated, it marks the assessment state in Redis as `isFinalized: true`.
 * This makes the finalization step idempotent; if called again on an already-finalized state, it will
 * simply return the calculated summary without performing duplicate writes.
 *
 * @param options Contextual data for the assessment (no session results are passed from the client).
 * @returns A summary payload for the client's SummaryView, including score and any XP penalties.
 */
export async function finalizeAssessment(options: {
	onerosterResourceSourcedId: string
	onerosterComponentResourceSourcedId: string
	onerosterCourseSourcedId: string
	expectedXp: number
	assessmentTitle: string
	assessmentPath: string
	unitData?: Unit
	contentType: "Exercise" | "Quiz" | "Test" | "CourseChallenge"
}) {
	const correlationId = randomUUID()
	const { userId: clerkUserId } = await auth()
	if (!clerkUserId) {
		logger.error("finalize assessment: user not authenticated", { correlationId })
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(clerkUserId)
	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, options.onerosterResourceSourcedId)

	const state = await getAssessmentState(onerosterUserSourcedId, options.onerosterResourceSourcedId, attemptNumber)
	if (!state) {
		logger.error("assessment state not found for finalization", {
			onerosterUserSourcedId,
			onerosterResourceSourcedId: options.onerosterResourceSourcedId,
			attemptNumber
		})
		throw ErrAssessmentStateNotFound
	}

	// Wrap finalization logic in an async function to use errors.try
	const performFinalization = async () => {
		// IDEMPOTENCY: If the summary has already been calculated and stored, return it immediately.
		if (state.finalSummary) {
			logger.info("finalizeAssessment called on an already finalized state, returning stored summary.", {
				correlationId
			})
			return state.finalSummary
		}

		// Calculate server-authoritative duration
		const durationInSeconds = Math.round((Date.now() - new Date(state.startedAt).getTime()) / 1000)

		// Reconstruct sessionResults from Redis state
		const questionList = await getDeterministicQuestionList(
			onerosterUserSourcedId,
			options.onerosterResourceSourcedId,
			attemptNumber
		)
		const sessionResults = Object.entries(state.questions).map(([indexStr, qState]) => {
			const index = Number(indexStr)
			const questionId = questionList[index]?.id

			if (!questionId) {
				logger.error("critical state inconsistency: question ID not found at expected index during finalization", {
					onerosterUserSourcedId,
					onerosterResourceSourcedId: options.onerosterResourceSourcedId,
					attemptNumber,
					failedIndex: index,
					totalQuestionsInList: questionList.length,
					totalQuestionsInState: Object.keys(state.questions).length,
					correlationId
				})
				throw errors.new("critical state inconsistency: could not map question state to a question ID")
			}

			return {
				qtiItemId: questionId,
				isCorrect: qState.isCorrect,
				isReported: qState.isReported
			}
		})

		// The sessionResults from Redis are authoritative. We only need to filter out
		// reported questions (where isCorrect is null) for scoring.
		const scorableResults = sessionResults.filter((r) => typeof r.isCorrect === "boolean")

		const correctAnswers = scorableResults.filter((r) => r.isCorrect).length
		const totalQuestions = scorableResults.length
		const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 100
		const avgSecondsPerQuestion =
			durationInSeconds && totalQuestions > 0 ? durationInSeconds / totalQuestions : undefined

		logger.info("finalizing assessment", {
			userSourcedId: onerosterUserSourcedId,
			resourceSourcedId: options.onerosterResourceSourcedId,
			correlationId
		})

		const { userId: clerkUserId } = await auth()
		if (!clerkUserId) {
			logger.error("finalize assessment: user not authenticated", { correlationId })
			throw errors.new("user not authenticated")
		}

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

		// Email is now required for Caliper analytics
		const userEmail = user.emailAddresses[0]?.emailAddress
		if (!userEmail) {
			logger.error("user email required for assessment finalization", {
				clerkUserId,
				correlationId
			})
			throw errors.new("user email required for assessment")
		}
		// Treat all assessment content types as interactive for attempt tracking/proficiency.
		const isInteractiveAssessmentFlag = true
		logger.info("derived interactive assessment flag", {
			contentType: options.contentType,
			isInteractiveAssessment: isInteractiveAssessmentFlag,
			correlationId
		})

		const command: SaveAssessmentResultCommand = {
			...options,
			onerosterUserSourcedId,
			// Persist the scorable results to ensure downstream consumers use consistent data
			sessionResults: scorableResults,
			attemptNumber,
			score: assertPercentageInteger(score, "assessment score"),
			correctAnswers,
			totalQuestions,
			durationInSeconds,
			isInteractiveAssessment: isInteractiveAssessmentFlag,
			clerkUserId,
			correlationId,
			// zod schema now validates subjectSlug against SUBJECT_SLUGS; pass through
			subjectSlug,
			courseSlug,
			userPublicMetadata: user.publicMetadata,
			userEmail
		}

		const saveResult = await errors.try(assessment.saveResult(command))
		if (saveResult.error) {
			logger.error("failed to save final assessment result", {
				error: saveResult.error,
				resourceSourcedId: options.onerosterResourceSourcedId
			})
			throw errors.wrap(saveResult.error, "failed to save final assessment result")
		}

		const extractXpInfo = (): { finalXp: number; penaltyApplied: boolean; reason: string } | undefined => {
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
				return {
					finalXp: xp.finalXp,
					penaltyApplied: xp.penaltyApplied,
					reason: xp.reason
				}
			}
			return undefined
		}
		const xpInfo = extractXpInfo()

		const finalSummary = {
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

		await markAssessmentFinalized(
			onerosterUserSourcedId,
			options.onerosterResourceSourcedId,
			attemptNumber,
			finalSummary
		)

		return finalSummary
	}

	// Execute finalization with error handling
	const finalizationResult = await errors.try(performFinalization())
	if (finalizationResult.error) {
		const errorMessage =
			finalizationResult.error instanceof Error
				? finalizationResult.error.toString()
				: "An unknown error occurred during finalization."

		// NEW: Mark state as failed before re-throwing
		await markAssessmentFinalizationFailed(
			onerosterUserSourcedId,
			options.onerosterResourceSourcedId,
			attemptNumber,
			errorMessage
		)

		logger.error("assessment finalization failed unexpectedly", { correlationId, error: finalizationResult.error })
		throw finalizationResult.error // Re-throw to ensure client knows it failed
	}

	return finalizationResult.data
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

	const userSourcedId = await getCurrentUserSourcedId(clerkUserId)

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

/**
 * Clears the current assessment state from Redis for a user, allowing getOrCreateAssessmentState
 * to generate a new attempt on the next page load.
 *
 * CRITICAL BUSINESS LOGIC:
 * This action clears ANY existing assessment state from Redis, regardless of finalization status.
 * The purpose is to clear the way for a new attempt. Since Redis is our ephemeral progress cache
 * and finalized attempts are already persisted in OneRoster (the source of truth), it's safe
 * to clear even finalized states from Redis. This makes the action's behavior consistent and
 * less brittle - it always succeeds in clearing the way for a new attempt.
 *
 * @param onerosterResourceSourcedId - The OneRoster resource ID for the assessment
 * @returns Success status (always true unless an error occurs)
 */
export async function startNewAssessmentAttempt(onerosterResourceSourcedId: string): Promise<{ success: boolean }> {
	const { userId } = await auth()
	if (!userId) {
		logger.error("startNewAssessmentAttempt failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)

	const existingState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)

	// FIX: Remove the !existingState.isFinalized check.
	// The purpose of this action is to clear the way for a new attempt.
	// If a state exists in Redis (our ephemeral progress cache), it should be cleared.
	// The finalized attempt is already persisted in OneRoster, which is the source of truth.
	// This makes the action's behavior consistent and less brittle.
	if (existingState) {
		await deleteAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
		logger.info("cleared previous assessment state to start new one", {
			onerosterUserSourcedId,
			onerosterResourceSourcedId,
			attemptNumber,
			wasFinalized: existingState.isFinalized
		})
		return { success: true }
	}

	// If no state exists, there's nothing to do.
	return { success: true }
}
