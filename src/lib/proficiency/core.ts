import {
	PROFICIENCY_SCORE_ATTEMPTED_PENALTY,
	PROFICIENCY_SCORE_FAMILIAR_PENALTY,
	PROFICIENCY_THRESHOLD_FAMILIAR,
	PROFICIENCY_THRESHOLD_PROFICIENT
} from "@/lib/constants/progress"

interface CalculateProficiencyParams {
	/** The percentage of correct answers, expressed as a float from 0.0 to 1.0. */
	percentageCorrect: number
	/** The type of the assessment (e.g., "unittest", "coursechallenge"). */
	lessonType: string
	/** The user's current proficiency score for the skill, if it exists. */
	currentScore?: number
}

/**
 * Calculates a new proficiency score based on performance, assessment type, and current score.
 * This is a pure function that encapsulates all business logic for proficiency updates.
 *
 * @param params - The input parameters for the calculation.
 * @returns The new proficiency score.
 */
export function calculateProficiencyScore({
	percentageCorrect,
	lessonType,
	currentScore
}: CalculateProficiencyParams): number {
	const isSummative = lessonType === "unittest" || lessonType === "coursechallenge"

	// Calculate proficiency score for this exercise
	let proficiencyScore = percentageCorrect * 100 // Store the EXACT percentage (0-100), not discrete levels

	// Softer penalty for missing a unit test question
	if (isSummative && percentageCorrect === 0) {
		if (typeof currentScore === "number" && currentScore > 0) {
			// Apply softer penalty based on current proficiency level
			if (currentScore >= PROFICIENCY_THRESHOLD_PROFICIENT) {
				// Was proficient (100%) → Drop to familiar (70%)
				proficiencyScore = PROFICIENCY_SCORE_FAMILIAR_PENALTY
			} else if (currentScore >= PROFICIENCY_THRESHOLD_FAMILIAR) {
				// Was familiar (70-99%) → Drop to attempted (50%)
				proficiencyScore = PROFICIENCY_SCORE_ATTEMPTED_PENALTY
			}
		}
	}

	return proficiencyScore
}
