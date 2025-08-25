// Constants defining the XP award thresholds and multipliers.
export const BONUS_MULTIPLIER = 1.25 // 25% bonus for perfect scores
export const MASTERY_THRESHOLD = 80 // 80% accuracy for full XP
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

	// Attempt decay: 1st = 1.0x, 2nd = 0.5x, 3rd = 0.25x, 4th+ = 0x
	let attemptFactor = 0
	if (attemptNumber === 1) {
		attemptFactor = 1.0
	} else if (attemptNumber === 2) {
		attemptFactor = 0.5
	} else if (attemptNumber === 3) {
		attemptFactor = 0.25
	} else {
		attemptFactor = 0
	}

	if (attemptFactor === 0) {
		multiplier = 0
		reason = `Attempt ${attemptNumber}: no xp`
	} else if (accuracy === 100) {
		multiplier = BONUS_MULTIPLIER * attemptFactor
		reason = `Attempt ${attemptNumber}: 100% accuracy with attempt decay`
	} else if (accuracy >= MASTERY_THRESHOLD) {
		multiplier = 1.0 * attemptFactor
		reason = `Attempt ${attemptNumber}: mastery achieved with attempt decay`
	} else {
		multiplier = 0
		reason = `Attempt ${attemptNumber}: below mastery threshold`
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
