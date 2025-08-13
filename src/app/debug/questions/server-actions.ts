"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions, niceQuestionsAnalysis } from "@/db/schemas/nice"
import { qti } from "@/lib/clients"

export async function upsertQuestionAnalysis(
	questionId: string,
	analysisNotes: string | null,
	severity: "major" | "minor" | "patch" | null = null
): Promise<void> {
	logger.debug("upserting question analysis", { questionId, hasNotes: analysisNotes !== null, severity })

	const result = await errors.try(
		db
			.insert(niceQuestionsAnalysis)
			.values({
				questionId,
				analysisNotes,
				severity
			})
			.onConflictDoUpdate({
				target: niceQuestionsAnalysis.questionId,
				set: {
					analysisNotes,
					severity
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

export async function getQuestionDetails(
	questionId: string
): Promise<{ id: string; xml: string; parsedData: unknown }> {
	logger.debug("fetching question details", { questionId })

	const result = await errors.try(
		db
			.select({ id: niceQuestions.id, xml: niceQuestions.xml, parsedData: niceQuestions.parsedData })
			.from(niceQuestions)
			.where(eq(niceQuestions.id, questionId))
			.limit(1)
	)
	if (result.error) {
		logger.error("failed to fetch question details", { error: result.error, questionId })
		throw errors.wrap(result.error, "fetch question details")
	}

	const row = result.data[0]
	if (!row || row.xml === null) {
		throw errors.new("question not found or has no xml")
	}

	return { id: row.id, xml: row.xml, parsedData: row.parsedData }
}
