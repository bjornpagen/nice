import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { eq, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions, niceQuestionsAnalysis } from "@/db/schemas"

interface QuestionAnalysisExport {
	analysisId: string
	questionId: string
	analysisNotes: string
	perseusData: unknown
	xmlData: string | null
}

async function main(): Promise<void> {
	logger.info("starting question analyses export")

	const result = await errors.try(
		db
			.select({
				analysisId: niceQuestionsAnalysis.id,
				questionId: niceQuestionsAnalysis.questionId,
				analysisNotes: niceQuestionsAnalysis.analysisNotes,
				perseusData: niceQuestions.parsedData,
				xmlData: niceQuestions.xml
			})
			.from(niceQuestionsAnalysis)
			.innerJoin(niceQuestions, eq(niceQuestionsAnalysis.questionId, niceQuestions.id))
			.where(isNotNull(niceQuestionsAnalysis.analysisNotes))
			.prepare("scripts_export_question_analyses_get_analyses")
			.execute()
	)

	if (result.error) {
		logger.error("failed to fetch question analyses", { error: result.error })
		throw errors.wrap(result.error, "database query")
	}

	// filter out empty strings since db allows empty but not null
	const nonEmptyAnalyses = result.data.filter(
		(analysis): analysis is QuestionAnalysisExport => analysis.analysisNotes !== ""
	)

	logger.info("exporting question analyses", {
		totalFound: result.data.length,
		nonEmptyCount: nonEmptyAnalyses.length
	})

	const jsonOutput = JSON.stringify(nonEmptyAnalyses, null, 2)

	// output json to stdout for piping/redirection
	process.stdout.write(`${jsonOutput}\n`)

	logger.info("export completed", { count: nonEmptyAnalyses.length })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}
