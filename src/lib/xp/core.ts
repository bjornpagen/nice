// Constants defining the XP award thresholds and multipliers.
export const BONUS_MULTIPLIER = 1.25 // 25% bonus for perfect scores
export const MASTERY_THRESHOLD = 0.8 // 80% accuracy for full XP
export const MIN_SECONDS_PER_QUESTION = 5 // Minimum reasonable time per question

/**
 * XP calculation result with detailed breakdown for logging and metadata.
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
 * It is a pure function with no side effects.
 *
 * @param baseXp The baseline XP for the activity (from resource.metadata.xp).
 * @param accuracy The student's score as a percentage (0-100).
 * @param attemptNumber The attempt number (1 = first attempt, 2+ = retries).
 * @param totalQuestions The total number of questions in the assessment.
 * @param durationInSeconds The time taken to complete the assessment in seconds.
 * @returns XP calculation result with detailed breakdown.
 */
export function calculateAssessmentXp(
	baseXp: number,
	accuracy: number,
	attemptNumber: number,
	totalQuestions?: number,
	durationInSeconds?: number
): XpCalculationResult {
	// Check for insincere effort: rushing with poor performance
	if (
		totalQuestions &&
		durationInSeconds &&
		durationInSeconds / totalQuestions < MIN_SECONDS_PER_QUESTION &&
		accuracy < 50
	) {
		const dynamicPenalty = -Math.max(1, Math.floor(totalQuestions))
		const result: XpCalculationResult = {
			finalXp: dynamicPenalty,
			multiplier: 0,
			baseXp,
			accuracy,
			penaltyApplied: true,
			reason: "Rush penalty: insincere effort detected"
		}

		return result
	}

	// PowerPath-style attempt-based multipliers
	let multiplier = 0
	let reason = ""

	if (attemptNumber === 1) {
		if (accuracy === 100) {
			multiplier = BONUS_MULTIPLIER
			reason = "First attempt: 100% accuracy bonus"
		} else if (accuracy >= MASTERY_THRESHOLD * 100) {
			multiplier = 1.0
			reason = "First attempt: mastery achieved"
		} else {
			multiplier = 0
			reason = "First attempt: below mastery threshold"
		}
	} else {
		if (accuracy === 100) {
			multiplier = 1.0
			reason = `Attempt ${attemptNumber}: 100% accuracy`
		} else if (accuracy >= MASTERY_THRESHOLD * 100) {
			multiplier = 0.5
			reason = `Attempt ${attemptNumber}: mastery achieved (reduced XP)`
		} else {
			multiplier = 0
			reason = `Attempt ${attemptNumber}: below mastery threshold`
		}
	}

	const finalXp = Math.round(baseXp * multiplier)

	const result: XpCalculationResult = {
		finalXp,
		multiplier,
		baseXp,
		accuracy,
		penaltyApplied: false,
		reason
	}

	return result
}
