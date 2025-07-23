// Constants defining the XP award thresholds and multipliers.
export const BONUS_MULTIPLIER = 1.25 // 25% bonus for perfect scores
export const MASTERY_THRESHOLD = 0.8 // 80% accuracy for full XP
export const PENALTY_XP = -5 // Penalty to discourage guessing
export const MIN_SECONDS_PER_QUESTION = 5 // Minimum reasonable time per question

/**
 * Calculates the awarded XP based on the expected XP and the student's accuracy.
 * This function enforces the scoring rules from the XP brainlift document.
 *
 * Our system differs from MathAcademy: we don't award partial XP below 80%
 * because "we don't believe the student has learned at the rigor necessary
 * for a mastery based system."
 *
 * @param expectedXp The baseline XP for the activity.
 * @param accuracy The student's score as a decimal (0.0 to 1.0).
 * @param totalQuestions The total number of questions in the assessment.
 * @param durationInSeconds The time taken to complete the assessment in seconds.
 * @returns The final awarded XP, including any bonuses or penalties.
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
		totalQuestions > 5 && // Only penalize if there are enough questions for statistical significance
		durationInSeconds / totalQuestions < MIN_SECONDS_PER_QUESTION && // Less than 5 seconds per question
		accuracy < 0.5 // Less than 50% accuracy
	) {
		// User is rushing and performing poorly - likely random clicking
		return PENALTY_XP
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
