import * as logger from "@superbuilders/slog"
import { qti } from "@/lib/clients"
import type { AssessmentItem } from "@/lib/qti"

export function getAssessmentTestRaw(identifier: string) {
	logger.debug("qti raw: fetching assessment test", { identifier })
	return qti.getAssessmentTest(identifier)
}

export function getAssessmentItemRaw(identifier: string): Promise<AssessmentItem> {
	logger.debug("qti raw: fetching assessment item", { identifier })
	return qti.getAssessmentItem(identifier)
}

export async function getAssessmentItemsRaw(identifiers: string[]): Promise<AssessmentItem[]> {
	logger.debug("qti raw: fetching multiple assessment items", { count: identifiers.length })
	const uniqueIds = Array.from(new Set(identifiers))
	const results = await Promise.all(uniqueIds.map((id) => getAssessmentItemRaw(id).then((item) => ({ id, item }))))
	const map = new Map(results.map((entry) => [entry.id, entry.item]))
	return identifiers.map((id) => {
		const item = map.get(id)
		if (!item) {
			throw new Error(`qti assessment item not found: ${id}`)
		}
		return item
	})
}
