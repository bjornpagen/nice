import * as logger from "@superbuilders/slog"

// Constants defining the XP award thresholds and multipliers.
export const BONUS_MULTIPLIER = 1.25 // 25% bonus for perfect scores
export const MASTERY_THRESHOLD = 0.8 // 80% accuracy for full XP
// Deprecated: fixed penalty has been replaced by dynamic per-assessment penalty
export const PENALTY_XP = -5 // legacy fallback (unused in new logic)
export const MIN_SECONDS_PER_QUESTION = 5 // Minimum reasonable time per question

//ploo
/**
 * XP calculation result with detailed breakdown
 */
export interface XpCalculationResult {
	finalXp: number
	multiplier: number
	baseXp: number
	accuracy: number
	penaltyApplied: boolean
	reason: string
}

/**
 * SINGLE SOURCE OF TRUTH for all XP calculations.
 * This function handles PowerPath-style attempt-based multipliers with rush penalty detection.
 *
 * @param baseXp The baseline XP for the activity (from resource.metadata.xp)
 * @param accuracy The student's score as a percentage (0-100)
 * @param attemptNumber The attempt number (1 = first attempt, 2+ = retries)
 * @param totalQuestions The total number of questions in the assessment
 * @param durationInSeconds The time taken to complete the assessment in seconds
 * @param shouldAwardXp Whether XP should be awarded (for XP farming prevention)
 * @returns XP calculation result with detailed breakdown
 */
export function calculateAssessmentXp(
	baseXp: number,
	accuracy: number,
	attemptNumber: number,
	totalQuestions?: number,
	durationInSeconds?: number,
	shouldAwardXp = true
): XpCalculationResult {
	logger.debug("calculating assessment xp", {
		baseXp,
		accuracy,
		attemptNumber,
		totalQuestions,
		durationInSeconds,
		shouldAwardXp
	})

	// If XP should not be awarded (already proficient), return zero
	if (!shouldAwardXp) {
		const result = {
			finalXp: 0,
			multiplier: 0,
			baseXp,
			accuracy,
			penaltyApplied: false,
			reason: "XP farming prevention: user already proficient"
		}

		logger.info("xp calculation blocked", {
			baseXp,
			accuracy,
			attemptNumber,
			reason: result.reason,
			finalXp: result.finalXp
		})

		return result
	}

	// Convert accuracy to decimal for calculations
	const accuracyDecimal = accuracy / 100

	// Check for insincere effort: rushing with poor performance
	if (
		totalQuestions &&
		durationInSeconds &&
		durationInSeconds / totalQuestions < MIN_SECONDS_PER_QUESTION && // Less than 5 seconds per question
		accuracyDecimal < 0.5 // Less than 50% accuracy
	) {
		// User is rushing and performing poorly - likely random clicking
		const timePerQuestion = durationInSeconds / totalQuestions
		const dynamicPenalty = -Math.max(1, Math.floor(totalQuestions))
		const result = {
			finalXp: dynamicPenalty,
			multiplier: 0,
			baseXp,
			accuracy,
			penaltyApplied: true,
			reason: "Rush penalty: insincere effort detected"
		}

		logger.warn("rush penalty applied", {
			baseXp,
			accuracy,
			attemptNumber,
			totalQuestions,
			durationInSeconds,
			timePerQuestion,
			minSecondsPerQuestion: MIN_SECONDS_PER_QUESTION,
			penaltyXp: dynamicPenalty,
			finalXp: result.finalXp
		})

		return result
	}

	// PowerPath-style attempt-based multipliers
	let multiplier = 0
	let reason = ""

	if (attemptNumber === 1) {
		// First attempt multipliers
		if (accuracy === 100) {
			multiplier = 1.25
			reason = "First attempt: 100% accuracy bonus"
		} else if (accuracy >= 80) {
			multiplier = 1.0
			reason = "First attempt: mastery achieved"
		} else {
			multiplier = 0
			reason = "First attempt: below mastery threshold"
		}
	} else {
		// Second+ attempt multipliers
		if (accuracy === 100) {
			multiplier = 1.0
			reason = `Attempt ${attemptNumber}: 100% accuracy`
		} else if (accuracy >= 80) {
			multiplier = 0.5
			reason = `Attempt ${attemptNumber}: mastery achieved (reduced XP)`
		} else {
			multiplier = 0
			reason = `Attempt ${attemptNumber}: below mastery threshold`
		}
	}

	const finalXp = Math.round(baseXp * multiplier)

	const result = {
		finalXp,
		multiplier,
		baseXp,
		accuracy,
		penaltyApplied: false,
		reason
	}

	logger.info("xp calculation completed", {
		baseXp,
		accuracy,
		attemptNumber,
		totalQuestions,
		durationInSeconds,
		multiplier,
		finalXp,
		reason
	})

	return result
}

/**
 * LEGACY FUNCTION - DEPRECATED
 * Use calculateAssessmentXp() instead for new code.
 * Kept for backward compatibility with existing Caliper code.
 *
 * @deprecated Use calculateAssessmentXp() for new implementations
 */
export function calculateAwardedXp(
	expectedXp: number,
	accuracy: number,
	totalQuestions?: number,
	durationInSeconds?: number
): number {
	// Check for insincere effort: rushing with poor performance
	if (
		totalQuestions &&
		durationInSeconds &&
		durationInSeconds / totalQuestions < MIN_SECONDS_PER_QUESTION && // Less than 5 seconds per question
		accuracy < 0.5 // Less than 50% accuracy
	) {
		// User is rushing and performing poorly - likely random clicking
		return -Math.max(1, Math.floor(totalQuestions))
	}

	if (accuracy === 1.0) {
		// Perfect score: Award a 25% bonus.
		return Math.ceil(expectedXp * BONUS_MULTIPLIER)
	}
	if (accuracy >= MASTERY_THRESHOLD) {
		// Mastery: Award the full expected XP.
		return expectedXp
	}
	// Below 80% = 0 XP (we don't award partial XP below mastery threshold)
	return 0
}
