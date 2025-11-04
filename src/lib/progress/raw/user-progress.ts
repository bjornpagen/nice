import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { AssessmentResult } from "@/lib/oneroster"
import { oneroster } from "@/lib/clients"
import { getResourceIdFromLineItem } from "@/lib/utils/assessment-line-items"
import { isInteractiveAttemptResult, isPassiveContentResult } from "@/lib/utils/assessment-results"

export type AssessmentProgress = {
	completed: boolean
	score?: number
	proficiency?: "attempted" | "familiar" | "proficient" | "mastered"
}

export interface UnitProficiency {
	unitId: string
	proficiencyPercentage: number
	proficientExercises: number
	totalExercises: number
}

export async function getUserUnitProgressRaw(
	userId: string,
	onerosterCourseSourcedId: string
): Promise<Map<string, AssessmentProgress>> {
	logger.info("fetching user unit progress from API", { userId, onerosterCourseSourcedId })

	const progressMap = new Map<string, AssessmentProgress>()

	const calculateProficiency = (score: number): "attempted" | "familiar" | "proficient" | "mastered" => {
		if (score >= 100) return "proficient"
		if (score >= 70) return "familiar"
		return "attempted"
	}

	const resultsResponse = await errors.try(
		oneroster.getAllResults({
			filter: `student.sourcedId='${userId}'`
		})
	)

	if (resultsResponse.error) {
		logger.error("failed to fetch user progress", { userId, error: resultsResponse.error })
		throw errors.wrap(resultsResponse.error, "fetch user progress")
	}

	// Track latest interactive attempts and latest passive content results separately.
	const latestInteractiveByResource = new Map<string, AssessmentResult>()
	const latestPassiveByResource = new Map<string, AssessmentResult>()

	function getTime(r: AssessmentResult | undefined): number {
		return r ? new Date(r.scoreDate || 0).getTime() : Number.NEGATIVE_INFINITY
	}

	for (const result of resultsResponse.data) {
		const lineItemId = result.assessmentLineItem.sourcedId
		if (!lineItemId.endsWith("_ali")) {
			continue
		}

		const isInteractive = isInteractiveAttemptResult(result, userId, lineItemId)
		const isPassive = isPassiveContentResult(result, userId, lineItemId)

		if (!isInteractive && !isPassive) {
			continue
		}

		const resourceId = getResourceIdFromLineItem(lineItemId)

		if (isInteractive) {
			const prevInteractive = latestInteractiveByResource.get(resourceId)
			if (!prevInteractive || getTime(result) > getTime(prevInteractive)) {
				latestInteractiveByResource.set(resourceId, result)
			}
		} else if (isPassive) {
			const prevPassive = latestPassiveByResource.get(resourceId)
			if (!prevPassive || getTime(result) > getTime(prevPassive)) {
				latestPassiveByResource.set(resourceId, result)
			}
		}
	}

	// Prefer latest interactive attempts when available; otherwise fall back to passive.
	for (const resourceId of new Set<string>([
		...latestPassiveByResource.keys(),
		...latestInteractiveByResource.keys()
	])) {
		const interactive = latestInteractiveByResource.get(resourceId)
		const passive = latestPassiveByResource.get(resourceId)
		const latest = interactive ?? passive
		if (!latest) continue

		if (latest.scoreStatus === "fully graded" && typeof latest.score === "number") {
			const normalizedScore = Math.round(latest.score)
			progressMap.set(resourceId, {
				completed: true,
				score: normalizedScore,
				proficiency: calculateProficiency(normalizedScore)
			})
		} else if (latest.scoreStatus === "partially graded" && typeof latest.score === "number") {
			const normalizedScore = Math.round(latest.score)
			progressMap.set(resourceId, {
				completed: false,
				score: normalizedScore
			})
		} else if (latest.scoreStatus === "fully graded") {
			progressMap.set(resourceId, {
				completed: true
			})
		}
	}

	logger.info("fetched user progress", {
		userId,
		onerosterCourseSourcedId,
		completedCount: Array.from(progressMap.values()).filter((p) => p.completed).length,
		partialCount: Array.from(progressMap.values()).filter((p) => !p.completed && p.score !== undefined).length
	})

	return progressMap
}
