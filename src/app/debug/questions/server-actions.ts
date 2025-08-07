"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { db } from "@/db"
import { niceQuestionsAnalysis } from "@/db/schemas/nice"
import { qti } from "@/lib/clients"

export async function upsertQuestionAnalysis(questionId: string, analysisNotes: string | null): Promise<void> {
	logger.debug("upserting question analysis", { questionId, hasNotes: analysisNotes !== null })

	const result = await errors.try(
		db
			.insert(niceQuestionsAnalysis)
			.values({
				questionId,
				analysisNotes
			})
			.onConflictDoUpdate({
				target: niceQuestionsAnalysis.questionId,
				set: {
					analysisNotes
				}
			})
	)
	if (result.error) {
		logger.error("failed to upsert question analysis", { error: result.error, questionId })
		throw errors.wrap(result.error, "upsert question analysis")
	}

	logger.info("upserted question analysis", { questionId })
}

export async function validateQuestionXml(xml: string): Promise<{ success: boolean; validationErrors: string[] }> {
	logger.debug("validating question xml")

	const result = await errors.try(
		qti.validateXml({
			xml,
			schema: "item"
		})
	)
	if (result.error) {
		logger.error("failed to validate xml", { error: result.error })
		throw errors.wrap(result.error, "xml validation request")
	}

	const validation = result.data
	logger.info("xml validation completed", {
		success: validation.success,
		errorCount: validation.validationErrors.length
	})

	return {
		success: validation.success,
		validationErrors: validation.validationErrors
	}
}
