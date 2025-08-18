import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { redis } from "@/lib/redis"

const ASSESSMENT_STATE_TTL_SECONDS = 60 * 60 * 24 * 7 // 1 week

// --- Exported Errors for Type-Safe Handling ---
export const ErrAssessmentStateNotFound = errors.new("assessment state not found")
export const ErrRedisUnavailable = errors.new("assessment service unavailable")

// --- State Shape ---
export interface AssessmentQuestionState {
	isCorrect: boolean | null // null for reported questions
	response: unknown
	isReported?: boolean
}

export interface AssessmentState {
	attemptNumber: number
	currentQuestionIndex: number
	totalQuestions: number
	startedAt: string // ISO 8601
	questions: Record<number, AssessmentQuestionState>
	isFinalized: boolean
	finalizationError: string | null
	finalSummary: {
		score: number
		correctAnswersCount: number | null
		totalQuestions: number | null
		xpPenaltyInfo?: { penaltyXp: number; reason: string; avgSecondsPerQuestion?: number }
	} | null
}

// --- Zod Schemas for Runtime Validation ---
const AssessmentQuestionStateSchema = z.object({
	isCorrect: z.boolean().nullable(),
	response: z.unknown(),
	isReported: z.boolean().optional()
})

const AssessmentStateWithoutQuestionsSchema = z.object({
	attemptNumber: z.number(),
	currentQuestionIndex: z.number(),
	totalQuestions: z.number(),
	startedAt: z.string(),
	isFinalized: z.boolean(),
	finalizationError: z.string().nullable(),
	finalSummary: z
		.object({
			score: z.number(),
			correctAnswersCount: z.number().nullable(),
			totalQuestions: z.number().nullable(),
			xpPenaltyInfo: z
				.object({
					penaltyXp: z.number(),
					reason: z.string(),
					avgSecondsPerQuestion: z.number().optional()
				})
				.optional()
		})
		.nullable()
})

// --- Key Schema ---
function getCacheKey(userId: string, assessmentId: string, attemptNumber: number): string {
	// Key Schema: assess:state:{userId}:{assessmentId}:{attempt}
	return `assess:state:${userId}:${assessmentId}:${attemptNumber}`
}

function getQuestionsHashKey(userId: string, assessmentId: string, attemptNumber: number): string {
	// Key Schema: assess:questions:{userId}:{assessmentId}:{attempt}
	return `assess:questions:${userId}:${assessmentId}:${attemptNumber}`
}

export async function getAssessmentState(
	userId: string,
	assessmentId: string,
	attemptNumber: number
): Promise<AssessmentState | null> {
	if (!redis) {
		logger.error("redis not available for getAssessmentState")
		throw ErrRedisUnavailable
	}

	const key = getCacheKey(userId, assessmentId, attemptNumber)
	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)

	const stateResult = await errors.try(redis.get(key))
	if (stateResult.error) {
		logger.error("failed to get assessment state from redis", { key, error: stateResult.error })
		throw errors.wrap(stateResult.error, "redis get state")
	}

	if (!stateResult.data) {
		return null
	}

	const stateData = stateResult.data
	const parsedState = errors.trySync(() => JSON.parse(stateData))
	if (parsedState.error) {
		logger.error("failed to parse assessment state JSON", { error: parsedState.error })
		throw errors.wrap(parsedState.error, "parse assessment state")
	}

	const stateValidation = AssessmentStateWithoutQuestionsSchema.safeParse(parsedState.data)
	if (!stateValidation.success) {
		logger.error("invalid assessment state format", { error: stateValidation.error })
		throw errors.wrap(stateValidation.error, "validate assessment state")
	}

	const state = stateValidation.data

	// Get all questions from the hash
	const questionsResult = await errors.try(redis.hGetAll(questionsKey))
	if (questionsResult.error) {
		logger.error("failed to get assessment questions from redis", { questionsKey, error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "redis get questions")
	}

	const questions: Record<number, AssessmentQuestionState> = {}
	for (const [index, value] of Object.entries(questionsResult.data)) {
		const parsedQuestion = errors.trySync(() => JSON.parse(value))
		if (parsedQuestion.error) {
			logger.error("failed to parse question JSON", { index, error: parsedQuestion.error })
			throw errors.wrap(parsedQuestion.error, `parse question ${index}`)
		}

		const questionValidation = AssessmentQuestionStateSchema.safeParse(parsedQuestion.data)
		if (!questionValidation.success) {
			logger.error("invalid question state format", { index, error: questionValidation.error })
			throw errors.wrap(questionValidation.error, `validate question ${index}`)
		}

		// After successful validation, we know the data conforms to AssessmentQuestionState
		const validatedQuestion: AssessmentQuestionState = {
			isCorrect: questionValidation.data.isCorrect,
			response: questionValidation.data.response,
			isReported: questionValidation.data.isReported
		}
		questions[Number(index)] = validatedQuestion
	}

	// Refresh TTL on read
	await redis.expire(key, ASSESSMENT_STATE_TTL_SECONDS)
	await redis.expire(questionsKey, ASSESSMENT_STATE_TTL_SECONDS)

	return { ...state, questions }
}

export async function createAssessmentState(
	userId: string,
	assessmentId: string,
	attemptNumber: number,
	totalQuestions: number
): Promise<AssessmentState> {
	if (!redis) {
		logger.error("redis not available")
		throw ErrRedisUnavailable
	}
	const key = getCacheKey(userId, assessmentId, attemptNumber)
	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)

	const newState: Omit<AssessmentState, "questions"> = {
		attemptNumber,
		currentQuestionIndex: 0,
		totalQuestions,
		startedAt: new Date().toISOString(),
		isFinalized: false,
		finalizationError: null,
		finalSummary: null
	}

	const multi = redis.multi()
	multi.set(key, JSON.stringify(newState), { EX: ASSESSMENT_STATE_TTL_SECONDS })
	multi.expire(questionsKey, ASSESSMENT_STATE_TTL_SECONDS) // Ensure hash key also has TTL

	const result = await errors.try(multi.exec())
	if (result.error) {
		logger.error("failed to create assessment state in redis", { key, error: result.error })
		throw errors.wrap(result.error, "redis create state transaction")
	}

	return { ...newState, questions: {} }
}

export async function updateStateAndQuestion(
	userId: string,
	assessmentId: string,
	attemptNumber: number,
	questionIndex: number,
	questionState: AssessmentQuestionState,
	overwrite = false
): Promise<{ wasWritten: boolean }> {
	if (!redis) {
		logger.error("redis not available")
		throw ErrRedisUnavailable
	}

	const stateKey = getCacheKey(userId, assessmentId, attemptNumber)
	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)

	let attempts = 0
	while (attempts < 3) {
		await redis.watch(stateKey)

		const stateResult = await errors.try(redis.get(stateKey))
		if (stateResult.error) {
			await redis.unwatch() // Ensure unwatch on failure
			logger.error("redis get failed for atomic update", { stateKey, error: stateResult.error })
			throw errors.wrap(stateResult.error, "redis get for atomic update")
		}
		if (!stateResult.data) {
			await redis.unwatch() // Ensure unwatch on failure
			logger.error("assessment state not found for atomic update", { stateKey })
			throw ErrAssessmentStateNotFound
		}

		// (Existing parsing and validation logic remains unchanged)
		const stateData = stateResult.data
		const parsedState = errors.trySync(() => JSON.parse(stateData))
		if (parsedState.error) {
			await redis.unwatch()
			logger.error("failed to parse assessment state JSON for update", { error: parsedState.error })
			throw errors.wrap(parsedState.error, "parse assessment state for update")
		}

		const stateValidation = AssessmentStateWithoutQuestionsSchema.safeParse(parsedState.data)
		if (!stateValidation.success) {
			await redis.unwatch()
			logger.error("invalid assessment state format for update", { error: stateValidation.error })
			throw errors.wrap(stateValidation.error, "validate assessment state for update")
		}

		const state = stateValidation.data

		// CRITICAL CHECK: Ensure we are not processing an out-of-order request
		if (state.currentQuestionIndex !== questionIndex) {
			await redis.unwatch()
			logger.error("out-of-order answer submission detected during atomic update", {
				stateKey,
				currentIndex: state.currentQuestionIndex,
				submittedIndex: questionIndex
			})
			throw errors.new("out-of-order answer submission")
		}

		state.currentQuestionIndex = questionIndex + 1

		const multi = redis.multi()
		if (overwrite) {
			multi.hSet(questionsKey, String(questionIndex), JSON.stringify(questionState))
		} else {
			multi.hSetNX(questionsKey, String(questionIndex), JSON.stringify(questionState))
		}
		multi.set(stateKey, JSON.stringify(state), { EX: ASSESSMENT_STATE_TTL_SECONDS })
		multi.expire(questionsKey, ASSESSMENT_STATE_TTL_SECONDS)

		const execResult = await errors.try(multi.exec())

		if (execResult.data !== null) {
			if (execResult.error) {
				logger.error("atomic state/question update failed", { error: execResult.error })
				throw errors.wrap(execResult.error, "redis multi exec")
			}
			const wasWritten = overwrite ? true : Boolean(execResult.data?.[0] && Number(execResult.data[0]) === 1)
			return { wasWritten }
		}

		// If execResult.data is null, WATCH conflict occurred. Retry.
		await redis.unwatch()
		attempts++
		if (attempts < 3) {
			const delay = 2 ** attempts * 50 // Exponential backoff: 100ms, 200ms
			await new Promise((resolve) => setTimeout(resolve, delay))
		}
	}

	// If loop finishes, all retries failed.
	logger.error("failed to update assessment state due to concurrent modification after retries", { stateKey })
	throw errors.new("concurrent modification after retries")
}

export async function markAssessmentFinalized(
	userId: string,
	assessmentId: string,
	attemptNumber: number,
	summary: AssessmentState["finalSummary"]
): Promise<void> {
	if (!redis) {
		logger.error("redis not available for markAssessmentFinalized")
		throw ErrRedisUnavailable
	}

	const key = getCacheKey(userId, assessmentId, attemptNumber)
	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)

	const stateResult = await errors.try(redis.get(key))
	if (stateResult.error) {
		logger.error("failed to get assessment state for finalization", { key, error: stateResult.error })
		throw errors.wrap(stateResult.error, "redis get state for finalization")
	}
	if (!stateResult.data) {
		logger.warn("assessment state not found, cannot mark as finalized", { key })
		// Do not throw; the absence of state implies it might have been cleaned up already.
		return
	}

	const stateData = stateResult.data
	const parsedState = errors.trySync(() => JSON.parse(stateData))
	if (parsedState.error) {
		logger.error("failed to parse assessment state JSON for finalization", { error: parsedState.error })
		throw errors.wrap(parsedState.error, "parse assessment state for finalization")
	}

	const stateValidation = AssessmentStateWithoutQuestionsSchema.safeParse(parsedState.data)
	if (!stateValidation.success) {
		logger.error("invalid assessment state format for finalization", { error: stateValidation.error })
		throw errors.wrap(stateValidation.error, "validate assessment state for finalization")
	}

	const state = stateValidation.data
	state.isFinalized = true
	state.finalSummary = summary

	// Use a pipeline to set the state and refresh TTL on both keys
	const multi = redis.multi()
	multi.set(key, JSON.stringify(state), { EX: ASSESSMENT_STATE_TTL_SECONDS }) // Reset TTL
	multi.expire(questionsKey, ASSESSMENT_STATE_TTL_SECONDS)

	const result = await errors.try(multi.exec())
	if (result.error) {
		logger.error("failed to mark assessment state as finalized in redis", { key, error: result.error })
		throw errors.wrap(result.error, "redis set finalized state")
	}

	logger.info("assessment state marked as finalized", { userId, assessmentId, attemptNumber })
}

export async function deleteAssessmentState(
	userId: string,
	assessmentId: string,
	attemptNumber: number
): Promise<void> {
	if (!redis) {
		logger.error("redis not available")
		throw ErrRedisUnavailable
	}

	const stateKey = getCacheKey(userId, assessmentId, attemptNumber)
	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)

	const multi = redis.multi()
	multi.del(stateKey)
	multi.del(questionsKey)

	const result = await errors.try(multi.exec())
	if (result.error) {
		logger.error("failed to delete assessment state from redis", { stateKey, questionsKey, error: result.error })
		throw errors.wrap(result.error, "redis delete state")
	}

	logger.info("assessment state deleted", { userId, assessmentId, attemptNumber })
}

export async function markAssessmentFinalizationFailed(
	userId: string,
	assessmentId: string,
	attemptNumber: number,
	errorMessage: string
): Promise<void> {
	if (!redis) {
		logger.error("redis not available for markAssessmentFinalizationFailed")
		throw ErrRedisUnavailable
	}

	const key = getCacheKey(userId, assessmentId, attemptNumber)
	const stateResult = await errors.try(redis.get(key))
	if (stateResult.error || !stateResult.data) {
		logger.error("failed to get assessment state to mark as failed", { key, error: stateResult.error })
		// Do not throw; if state is gone, there's nothing to mark.
		return
	}

	const stateData = stateResult.data
	const parsedState = errors.trySync(() => JSON.parse(stateData))
	const stateValidation = AssessmentStateWithoutQuestionsSchema.safeParse(parsedState.data)

	if (parsedState.error || !stateValidation.success) {
		logger.error("failed to parse existing state to mark as failed", { key })
		return // Cannot safely modify, so we abort.
	}

	const state = stateValidation.data
	state.finalizationError = errorMessage

	const setResult = await errors.try(redis.set(key, JSON.stringify(state), { KEEPTTL: true }))
	if (setResult.error) {
		logger.error("failed to set finalizationError in redis", { key, error: setResult.error })
		throw errors.wrap(setResult.error, "redis set finalizationError")
	}
}
