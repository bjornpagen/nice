import { XP_PROFICIENCY_THRESHOLD } from "@/lib/constants/progress"

/**
 * Determines if a user requires a retry to achieve mastery.
 *
 * BUSINESS RULES:
 * 1. If totalQuestions is 0 (all reported/skipped), mastery is NOT demonstrated → requires retry
 * 2. If accuracy >= 80% (XP_PROFICIENCY_THRESHOLD), mastery achieved → no retry needed
 * 3. If accuracy < 80% BUT user was already proficient from a prior attempt → no retry needed
 * 4. If accuracy < 80% AND user was NOT previously proficient → requires retry
 *
 * This is a pure function with no side effects, making it easy to test.
 *
 * @param accuracy The current attempt's accuracy (0-100)
 * @param totalQuestions Total scorable questions (0 if all were reported/skipped)
 * @param wasAlreadyProficient Whether user achieved 80%+ on ANY previous attempt
 * @returns true if retry is required, false if mastery is achieved or was previously achieved
 */
export function determineRequiresRetry(
	accuracy: number,
	totalQuestions: number,
	wasAlreadyProficient: boolean
): boolean {
	// No scorable questions = no mastery demonstrated
	if (totalQuestions === 0) {
		return true
	}

	// Check if current attempt achieves mastery
	const isProficient = accuracy >= XP_PROFICIENCY_THRESHOLD

	// Retry required only if: not proficient now AND wasn't proficient before
	return !isProficient && !wasAlreadyProficient
}

