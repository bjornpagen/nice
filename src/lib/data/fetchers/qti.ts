import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { redisCache } from "@/lib/cache"
import { qti } from "@/lib/clients"
import type { AssessmentItem } from "@/lib/qti"

// Removed: non-1EdTech-compliant /questions endpoint wrapper

export async function getAssessmentTest(identifier: string) {
	logger.info("getAssessmentTest called", { identifier })
	const operation = () => qti.getAssessmentTest(identifier)
	return redisCache(operation, ["qti-getAssessmentTest", identifier], { revalidate: 3600 * 24 }) // 24-hour cache
}

// Fetch a single assessment item with caching
export async function getAssessmentItem(identifier: string): Promise<AssessmentItem> {
	logger.info("getAssessmentItem called", { identifier })
	const operation = () => qti.getAssessmentItem(identifier)
	return redisCache(operation, ["qti-getAssessmentItem", identifier], { revalidate: 3600 * 24 })
}

// Fetch multiple assessment items, preserving input order
export async function getAssessmentItems(identifiers: string[]): Promise<AssessmentItem[]> {
	logger.info("getAssessmentItems called", { count: identifiers.length })
	const uniqueIds = Array.from(new Set(identifiers))
	// Fetch all unique ids in parallel; individual calls are cached
	const results = await Promise.all(
		uniqueIds.map(async (id) => {
			const itemResult = await getAssessmentItem(id)
			return { id, item: itemResult }
		})
	)
	const map = new Map(results.map((r) => [r.id, r.item]))
	// Return in the same order as the input identifiers (including duplicates if any)
	return identifiers.map((id) => {
		const item = map.get(id)
		if (!item) {
			logger.error("qti assessment item not found", { id })
			throw errors.new(`qti assessment item not found: ${id}`)
		}
		return item
	})
}
