import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { redisCache } from "@/lib/cache"
import type { AssessmentItem } from "@/lib/qti"
import { getAssessmentItemRaw, getAssessmentItemsRaw, getAssessmentTestRaw } from "@/lib/qti/raw/api"

// Removed: non-1EdTech-compliant /questions endpoint wrapper

export async function getAssessmentTest(identifier: string) {
	logger.info("getAssessmentTest called", { identifier })
	const operation = () => getAssessmentTestRaw(identifier)
	return redisCache(operation, ["qti-getAssessmentTest", identifier], { revalidate: 3600 * 24 }) // 24-hour cache
}

// Fetch a single assessment item with caching
export async function getAssessmentItem(identifier: string): Promise<AssessmentItem> {
	logger.info("getAssessmentItem called", { identifier })
	const operation = () => getAssessmentItemRaw(identifier)
	return redisCache(operation, ["qti-getAssessmentItem", identifier], { revalidate: 3600 * 24 })
}

// Fetch multiple assessment items, preserving input order
export async function getAssessmentItems(identifiers: string[]): Promise<AssessmentItem[]> {
	logger.info("getAssessmentItems called", { count: identifiers.length })
	const uniqueIds = Array.from(new Set(identifiers))
	const cached = await Promise.all(
		uniqueIds.map((id) =>
			redisCache(() => getAssessmentItemRaw(id), ["qti-getAssessmentItem", id], { revalidate: 3600 * 24 })
		)
	)
	const map = new Map(uniqueIds.map((id, index) => [id, cached[index]]))
	return identifiers.map((id) => {
		const item = map.get(id)
		if (!item) {
			logger.error("qti assessment item not found", { id })
			throw errors.new(`qti assessment item not found: ${id}`)
		}
		return item
	})
}
