"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { db } from "@/db"
import { niceQuestionsAnalysis } from "@/db/schemas/nice"

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
