import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { eq, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions, niceQuestionsAnalysis } from "@/db/schemas/nice"

export interface QuestionDebugData {
	id: string
	exerciseId: string
	sha: string
	parsedData: unknown
	xml: string
	analysisNotes: string | null
	severity: "major" | "minor" | "patch" | null
}

export async function getQuestionsWithXml(): Promise<QuestionDebugData[]> {
	logger.debug("fetching questions with xml data")

	const result = await errors.try(
		db
			.select({
				id: niceQuestions.id,
				exerciseId: niceQuestions.exerciseId,
				sha: niceQuestions.sha,
				parsedData: niceQuestions.parsedData,
				xml: niceQuestions.xml,
				analysisNotes: niceQuestionsAnalysis.analysisNotes,
				severity: niceQuestionsAnalysis.severity
			})
			.from(niceQuestions)
			.leftJoin(niceQuestionsAnalysis, eq(niceQuestions.id, niceQuestionsAnalysis.questionId))
			.where(isNotNull(niceQuestions.xml))
			.orderBy(niceQuestions.id)
	)
	if (result.error) {
		logger.error("failed to fetch questions with xml", { error: result.error })
		throw errors.wrap(result.error, "fetch questions with xml")
	}

	const questions = result.data
		.filter((q): q is QuestionDebugData => q.xml !== null)
		.map((q) => ({
			...q,
			xml: q.xml
		}))

	logger.info("fetched questions with xml", { count: questions.length })
	return questions
}
