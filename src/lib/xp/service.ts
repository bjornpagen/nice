import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { checkExistingProficiency } from "@/lib/actions/assessment"
import { updateStreak } from "@/lib/actions/streak"
import {
	caliperAggregatedTimeForResources,
	caliperBankedXpForResources,
	caliperEventsByActor,
	caliperTimeSpentForResources,
	invalidateCache
} from "@/lib/cache"
import { awardBankedXpForExercise, findEligiblePassiveResourcesForExercise } from "@/lib/xp/bank"
import { calculateAssessmentXp, type XpCalculationResult } from "@/lib/xp/core"
import { constructActorId } from "@/lib/utils/actor-id"

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
			reason: "XP farming prevention: user already proficient"
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
		// --- START OF NEW CACHE INVALIDATION LOGIC ---
		const identificationResult = await errors.try(
			findEligiblePassiveResourcesForExercise({
				exerciseResourceSourcedId: options.assessmentResourceId,
				onerosterCourseSourcedId: options.courseSourcedId,
				onerosterUserSourcedId: options.userSourcedId
			})
		)

		if (identificationResult.error) {
			logger.error("failed to identify passive resources for cache invalidation", {
				error: identificationResult.error,
				assessmentId: options.componentResourceId,
				userId: options.userSourcedId
			})
		} else {
			const eligibleResources = identificationResult.data
			if (eligibleResources.length > 0) {
				const actorId = constructActorId(options.userSourcedId)
				const resourceIds = eligibleResources.map((r) => r.sourcedId)

				const keysToInvalidate = [
					caliperEventsByActor(actorId),
					caliperTimeSpentForResources(actorId, resourceIds),
					caliperAggregatedTimeForResources(actorId, resourceIds),
					// IMPORTANT: final compute key matches compute-layer hash of sourcedId:expectedXp
					caliperBankedXpForResources(actorId, eligibleResources)
				]

				await invalidateCache(keysToInvalidate)
				logger.info("invalidated related caliper caches before xp banking", { keyCount: keysToInvalidate.length })
			}
		}

		// Now, call the banking function to calculate and award with fresh data.
		const xpBankResult = await errors.try(
			awardBankedXpForExercise({
				exerciseResourceSourcedId: options.assessmentResourceId,
				onerosterUserSourcedId: options.userSourcedId,
				onerosterCourseSourcedId: options.courseSourcedId
			})
		)
		// --- END OF NEW CACHE INVALIDATION LOGIC ---

		if (xpBankResult.error) {
			logger.error("failed to process xp bank", {
				error: xpBankResult.error,
				assessmentId: options.componentResourceId,
				userId: options.userSourcedId
			})
		} else {
			bankedXp = xpBankResult.data.bankedXp
			finalXp += bankedXp
			logger.info("awarded banked xp", {
				assessmentId: options.componentResourceId,
				bankedXp,
				awardedCount: xpBankResult.data.awardedResourceIds.length
			})
		}
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
