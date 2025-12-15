import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { checkExistingProficiency } from "@/lib/actions/assessment"
import { updateStreak } from "@/lib/actions/streak"
import { XP_REASON_ALREADY_PROFICIENT } from "@/lib/constants/progress"
// Removed legacy Caliper caches; banking now reads canonical OneRoster results
import { awardBankedXpForExercise } from "@/lib/xp/bank"
import { calculateAssessmentXp, type XpCalculationResult } from "@/lib/xp/core"

interface AwardXpOptions {
	userSourcedId: string
	assessmentResourceId: string
	componentResourceId: string // The contextual ID (e.g., quiz, test)
	courseSourcedId: string
	baseXp: number
	correctQuestions: number
	totalQuestions: number
	attemptNumber: number
	durationInSeconds?: number
	isExercise: boolean
	userEmail: string
	subjectSlug: string
	courseSlug: string
}

/**
 * Orchestrates the entire process of calculating and awarding XP for an assessment.
 * This is the single entry point for all XP-related logic.
 *
 * @param options - The context and performance data for the assessment.
 * @returns The final calculated XP amount.
 */
export async function awardXpForAssessment(options: AwardXpOptions): Promise<XpCalculationResult> {
	logger.info("awarding xp for assessment", {
		userSourcedId: options.userSourcedId,
		assessmentResourceId: options.assessmentResourceId,
		componentResourceId: options.componentResourceId,
		courseSourcedId: options.courseSourcedId,
		baseXp: options.baseXp,
		correctQuestions: options.correctQuestions,
		totalQuestions: options.totalQuestions,
		attemptNumber: options.attemptNumber,
		isExercise: options.isExercise
	})

	// 1. Prevent XP farming by checking for existing proficiency.
	const proficiencyResult = await errors.try(checkExistingProficiency(options.assessmentResourceId))
	if (proficiencyResult.error) {
		logger.error("proficiency check failed", { error: proficiencyResult.error })
		throw errors.wrap(proficiencyResult.error, "proficiency check")
	}
	const isAlreadyProficient = proficiencyResult.data

	if (isAlreadyProficient) {
		const result: XpCalculationResult = {
			finalXp: 0,
			multiplier: 0,
			baseXp: options.baseXp,
			accuracy: (options.correctQuestions / options.totalQuestions) * 100,
			penaltyApplied: false,
			reason: XP_REASON_ALREADY_PROFICIENT
		}
		logger.info("xp award blocked due to existing proficiency", {
			userSourcedId: options.userSourcedId,
			assessmentResourceId: options.assessmentResourceId
		})
		return result
	}

	// 2. Calculate the base assessment XP using the core pure function.
	const accuracy = options.totalQuestions > 0 ? (options.correctQuestions / options.totalQuestions) * 100 : 0
	const assessmentXpResult = calculateAssessmentXp(
		options.baseXp,
		accuracy,
		options.attemptNumber,
		options.totalQuestions,
		options.durationInSeconds
	)

	let finalXp = assessmentXpResult.finalXp
	let bankedXp = 0

	// 3. Process XP Bank for exercises if the user achieved mastery.
	if (options.isExercise && assessmentXpResult.finalXp > 0 && accuracy >= 80) {
		// Directly award banked XP using canonical nice_timeSpent from OneRoster
		const xpBankResult = await errors.try(
			awardBankedXpForExercise({
				exerciseResourceSourcedId: options.assessmentResourceId,
				onerosterUserSourcedId: options.userSourcedId,
				onerosterCourseSourcedId: options.courseSourcedId,
				userEmail: options.userEmail,
				subjectSlug: options.subjectSlug,
				courseSlug: options.courseSlug
			})
		)

		if (xpBankResult.error) {
			logger.error("failed to process xp bank", {
				error: xpBankResult.error,
				assessmentId: options.componentResourceId,
				userId: options.userSourcedId
			})
			// CRITICAL: Banking failure must halt the process per "No Fallbacks" rule
			throw errors.wrap(xpBankResult.error, "xp banking")
		}
		
		bankedXp = xpBankResult.data.bankedXp
		finalXp += bankedXp
		logger.info("awarded banked xp", {
			assessmentId: options.componentResourceId,
			bankedXp,
			awardedCount: xpBankResult.data.awardedResourceIds.length
		})
	}

	// 4. Update the user's weekly activity streak if they earned positive XP.
	if (finalXp > 0) {
		const streakResult = await errors.try(updateStreak())
		if (streakResult.error) {
			logger.error("failed to update user streak after awarding xp", {
				userId: options.userSourcedId,
				finalXp,
				error: streakResult.error
			})
			// Do not block XP award if streak update fails.
		}
	}

	const finalResult: XpCalculationResult = {
		...assessmentXpResult,
		finalXp // This now includes the banked XP.
	}

	logger.info("xp award process complete", { ...finalResult, bankedXp })
	return finalResult
}
