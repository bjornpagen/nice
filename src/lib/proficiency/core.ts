import {
	PROFICIENCY_SCORE_ATTEMPTED_PENALTY,
	PROFICIENCY_SCORE_FAMILIAR_PENALTY,
	PROFICIENCY_SCORE_MASTERED,
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

	// Rule 1: Mastery Upgrade on Summative Assessments
	// If a student was already proficient (>=1.0) and gets a perfect score on a summative
	// assessment, they are upgraded to "Mastered" (1.1).
	if (isSummative && percentageCorrect === 1.0) {
		if (typeof currentScore === "number" && currentScore >= PROFICIENCY_THRESHOLD_PROFICIENT) {
			return PROFICIENCY_SCORE_MASTERED
		}
	}

	// Rule 2: Softer Penalty on Summative Assessments
	// If a student gets 0% correct on a summative assessment question, apply a softer
	// penalty instead of dropping their score to zero.
	if (isSummative && percentageCorrect === 0) {
		if (typeof currentScore === "number" && currentScore > 0) {
			if (currentScore >= PROFICIENCY_THRESHOLD_PROFICIENT) {
				// Was Proficient -> Drop to Familiar
				return PROFICIENCY_SCORE_FAMILIAR_PENALTY
			}
			if (currentScore >= PROFICIENCY_THRESHOLD_FAMILIAR) {
				// Was Familiar -> Drop to Attempted
				return PROFICIENCY_SCORE_ATTEMPTED_PENALTY
			}
			// Was Attempted or lower -> No further penalty
			return currentScore
		}
	}

	// Default Rule: For all other cases (e.g., exercises, quizzes, or partial credit on
	// summative assessments), the proficiency score is the direct percentage correct.
	return percentageCorrect
}
