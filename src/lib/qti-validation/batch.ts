import * as errors from "@superbuilders/errors"

import { qti } from "@/lib/clients"
import type { ValidateXmlResponse } from "@/lib/qti"

export type LoggerLike = {
	debug: (message: string, attributes?: Record<string, unknown>) => void
	info: (message: string, attributes?: Record<string, unknown>) => void
	warn?: (message: string, attributes?: Record<string, unknown>) => void
	error: (message: string, attributes?: Record<string, unknown>) => void
}

type SchemaType = "item" | "test" | "stimulus"

export type BatchedValidationResult = {
	success: boolean
	response?: ValidateXmlResponse
	error?: unknown
	processingTimeMs: number
}

export type ValidateInBatchesOptions<T> = {
	schema: SchemaType
	getXml: (item: T) => string
	batchSize?: number
	delayMs?: number
	logger?: LoggerLike
}

/**
 * Validates many QTI XML payloads against the remote validator in controlled batches.
 * - Preserves input order in the results array
 * - Never throws for individual validation failures; callers can decide how to handle
 * - Logs API errors via provided logger
 */
export async function validateInBatches<T>(
	items: readonly T[],
	options: ValidateInBatchesOptions<T>
): Promise<BatchedValidationResult[]> {
	const logger = options.logger
	const batchSize = options.batchSize ?? 20
	const delayMs = options.delayMs ?? 500
	const schema: SchemaType = options.schema

	const results: BatchedValidationResult[] = []

	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize)
		logger?.debug?.("qti validation batch starting", {
			batchStart: i,
			batchSize: batch.length,
			total: items.length,
			schema
		})

		const batchResults = await Promise.all(
			batch.map(async (item, idx) => {
				const xml = options.getXml(item)
				const start = Date.now()
				const validationResult = await errors.try(qti.validateXml({ schema, xml }))
				const processingTimeMs = Date.now() - start

				if (validationResult.error) {
					logger?.error?.("qti validation api error", {
						index: i + idx,
						schema,
						error: validationResult.error,
						processingTimeMs
					})
					return { success: false, error: validationResult.error, processingTimeMs }
				}

				const response = validationResult.data
				return { success: response.success, response, processingTimeMs }
			})
		)

		results.push(...batchResults)

		if (i + batchSize < items.length) {
			// Delay between batches
			await new Promise((resolve) => setTimeout(resolve, delayMs))
		}
	}

	return results
}
