import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { desc } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestionRenderReviews } from "@/db/schemas/nice"

export interface QuestionRenderReviewRow {
	questionId: string
	analysisNotes: string
	severity: "major" | "minor" | "patch" | null
	model: string
	raw: unknown | null
	productionScreenshotUrl: string
	perseusScreenshotUrl: string
	reviewedAt: string
}

export async function getQuestionRenderReviews(): Promise<QuestionRenderReviewRow[]> {
	logger.debug("fetching question render reviews")

	const result = await errors.try(
		db
			.select({
				questionId: niceQuestionRenderReviews.questionId,
				analysisNotes: niceQuestionRenderReviews.analysisNotes,
				severity: niceQuestionRenderReviews.severity,
				model: niceQuestionRenderReviews.model,
				raw: niceQuestionRenderReviews.raw,
				productionScreenshotUrl: niceQuestionRenderReviews.productionScreenshotUrl,
				perseusScreenshotUrl: niceQuestionRenderReviews.perseusScreenshotUrl,
				reviewedAt: niceQuestionRenderReviews.reviewedAt
			})
			.from(niceQuestionRenderReviews)
			.orderBy(desc(niceQuestionRenderReviews.reviewedAt))
	)
	if (result.error) {
		logger.error("failed to fetch question render reviews", { error: result.error })
		throw errors.wrap(result.error, "fetch question render reviews")
	}

	const rows = result.data
	logger.info("fetched question render reviews", { count: rows.length })
	return rows
}
