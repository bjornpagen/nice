import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
import { CALIPER_SUBJECT_MAPPING } from "@/lib/constants/subjects"
import type { SaveAssessmentResultCommand } from "@/lib/dtos/assessment"
import * as analytics from "@/lib/ports/analytics"
import * as gradebook from "@/lib/ports/gradebook"
import * as cache from "@/lib/services/cache"
import * as streak from "@/lib/services/streak"
import { constructActorId } from "@/lib/utils/actor-id"
import { generateResultSourcedId } from "@/lib/utils/assessment-identifiers"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
import { calculateAssessmentXp } from "@/lib/xp/core"
import * as xp from "@/lib/xp/service"

export async function saveResult(command: SaveAssessmentResultCommand): Promise<unknown> {
	const {
		onerosterResourceSourcedId: resourceId,
		score: assessmentScore,
		correctAnswers,
		totalQuestions,
		onerosterUserSourcedId: userId,
		onerosterCourseSourcedId: courseId,
		isInteractiveAssessment = false,
		attemptNumber,
		correlationId
	} = command

	logger.info("saving assessment result [service]", { correlationId, resourceId, userId })

	// 1. Calculate XP (includes proficiency check and banking)
	// userEmail is now required by the DTO schema, no need to check
	const xpResult = await xp.awardXpForAssessment({
		userSourcedId: userId,
		assessmentResourceId: resourceId,
		componentResourceId: command.onerosterComponentResourceSourcedId,
		courseSourcedId: courseId,
		baseXp: command.expectedXp,
		correctQuestions: correctAnswers,
		totalQuestions: totalQuestions,
		attemptNumber: attemptNumber,
		durationInSeconds: command.durationInSeconds,
		isExercise: command.contentType === "Exercise",
		userEmail: command.userEmail,
		subjectSlug: command.subjectSlug,
		courseSlug: command.courseSlug
	})

	// 2. Prepare and save the primary result to the gradebook (MUST SUCCEED)
	const resultSourcedId = generateResultSourcedId(userId, resourceId, isInteractiveAssessment, attemptNumber)
	const lineItemSourcedId = getAssessmentLineItemId(resourceId)

	// Build the comment based on attempt number
	const comment =
		attemptNumber && attemptNumber > 1
			? `${correctAnswers}/${totalQuestions} correct on attempt ${attemptNumber}`
			: `${correctAnswers}/${totalQuestions} correct on first attempt`

	// Build metadata for the result using legacy rules
	const accuracyPercent = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 100
	const calculateMasteredUnits = () => {
		if (command.contentType === "Test") return accuracyPercent >= 90 ? 1 : 0
		if (command.contentType === "Exercise" || command.contentType === "Quiz") return accuracyPercent >= 80 ? 1 : 0
		return 0
	}
	const masteredUnits = calculateMasteredUnits()

	// Atomic: for Exercises, store exercise-only XP in the result metadata.
	// Other content types (Quiz/Test) do not bank, so total is the same as exercise XP.
	const exerciseOnlyXp = calculateAssessmentXp(
		command.expectedXp,
		accuracyPercent,
		attemptNumber,
		totalQuestions,
		command.durationInSeconds
	).finalXp

	const metadata = {
		masteredUnits,
		totalQuestions: totalQuestions,
		correctQuestions: correctAnswers,
		accuracy: accuracyPercent,
		xp: command.contentType === "Exercise" ? exerciseOnlyXp : xpResult.finalXp,
		multiplier: xpResult.multiplier,
		penaltyApplied: xpResult.penaltyApplied,
		xpReason: xpResult.reason,
		completedAt: new Date().toISOString(),
		courseSourcedId: courseId,
		attempt: attemptNumber,
		durationInSeconds: command.durationInSeconds,
		lessonType: command.contentType?.toLowerCase(),
		timeTrackingMethod: command.timeTrackingMethod
	}

	const gradebookResult = await errors.try(
		gradebook.saveResult({
			resultSourcedId,
			lineItemSourcedId,
			userSourcedId: userId,
			score: assessmentScore,
			comment,
			metadata,
			correlationId
		})
	)

	if (gradebookResult.error) {
		logger.error("failed to save assessment result to gradebook", { error: gradebookResult.error, correlationId })
		throw errors.wrap(gradebookResult.error, "failed to save primary assessment result")
	}

	// 3. Trigger best-effort background tasks.
	const sideEffectPromises = []

	// Cache invalidation
	sideEffectPromises.push(cache.invalidateUserCourseProgress(userId, courseId))

	// Streak update if XP was awarded
	if (xpResult.finalXp > 0 && command.userPublicMetadata) {
		sideEffectPromises.push(streak.update(command.clerkUserId, command.userPublicMetadata))
	}


	// Analytics event if we have required data
	if (command.unitData && command.assessmentPath && command.assessmentTitle && command.userEmail) {
		const subjectSlug = command.subjectSlug
		const mappedSubject = CALIPER_SUBJECT_MAPPING[subjectSlug]
		if (!mappedSubject) {
			logger.error("caliper subject mapping missing", { subjectSlug, correlationId })
			// Skip analytics if subject mapping is missing
		} else {
			// Build Caliper actor (legacy shape)
			const actor = {
				id: constructActorId(userId),
				type: "TimebackUser" as const,
				email: command.userEmail
			}

			// Build Caliper context to match legacy payloads used by progress analytics
			const context = {
				id: `${env.NEXT_PUBLIC_APP_DOMAIN}${command.assessmentPath}`,
				type: "TimebackActivityContext" as const,
				subject: mappedSubject,
				app: { name: "Nice Academy" },
				course: {
					name: command.courseSlug,
					id: `${env.TIMEBACK_ONEROSTER_SERVER_URL}/ims/oneroster/rostering/v1p2/courses/${courseId}`
				},
				activity: { name: command.assessmentTitle, id: resourceId },
				process: false
			}

			// Send analytics events (activity completed + optional time spent)
			sideEffectPromises.push(
				analytics.sendActivityCompletedEvent({
					actor,
					context,
					performance: {
						totalQuestions,
						correctQuestions: correctAnswers,
						masteredUnits
					},
					// Atomic: exercise-only XP (exclude banked XP)
					finalXp: calculateAssessmentXp(
						command.expectedXp,
						accuracyPercent,
						attemptNumber,
						totalQuestions,
						command.durationInSeconds
					).finalXp,
					durationInSeconds: command.durationInSeconds,
					correlationId
				})
			)
			if (command.durationInSeconds && command.durationInSeconds >= 1) {
				sideEffectPromises.push(
					analytics.sendTimeSpentEvent({
						actor,
						context,
						durationInSeconds: command.durationInSeconds,
						correlationId
					})
				)
			}
		}
	}

	// Wait for all side effects to complete
	const settled = await Promise.allSettled(sideEffectPromises)

	// Log any failures for observability
	settled.forEach((result, index) => {
		if (result.status === "rejected") {
			logger.error("side effect failed in assessment service", {
				index,
				error: result.reason,
				correlationId
			})
		}
	})

	return { onerosterResultSourcedId: resultSourcedId, xp: xpResult }
}
