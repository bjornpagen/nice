#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray, isNull, sql } from "drizzle-orm"

import { db } from "@/db"
import { niceCourses, niceExercises, niceLessonContents, niceLessons, niceQuestions, niceUnits } from "@/db/schemas"
import { qti } from "@/lib/clients"
import { HARDCODED_SCIENCE_COURSE_IDS } from "@/lib/constants/course-mapping"
import { ErrQtiNotFound } from "@/lib/qti"
import { extractIdentifier } from "@/lib/xml-utils"

async function main(): Promise<void> {
	logger.info("starting missing xml analysis for science courses", {
		courseIds: HARDCODED_SCIENCE_COURSE_IDS,
		courseCount: HARDCODED_SCIENCE_COURSE_IDS.length
	})

	const totalResult = await errors.try(
		db
			.select({ count: sql<number>`count(*)` })
			.from(niceQuestions)
			.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
			.innerJoin(niceLessonContents, eq(niceExercises.id, niceLessonContents.contentId))
			.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
			.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
			.innerJoin(niceCourses, eq(niceUnits.courseId, niceCourses.id))
			.where(inArray(niceCourses.id, [...HARDCODED_SCIENCE_COURSE_IDS]))
	)
	if (totalResult.error) {
		logger.error("database query", { error: totalResult.error })
		throw errors.wrap(totalResult.error, "database query")
	}
	const totalQuestions = totalResult.data?.[0]?.count ?? 0
	logger.info("total questions in science courses", { count: totalQuestions })

	const missingResult = await errors.try(
		db
			.select({ count: sql<number>`count(*)` })
			.from(niceQuestions)
			.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
			.innerJoin(niceLessonContents, eq(niceExercises.id, niceLessonContents.contentId))
			.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
			.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
			.innerJoin(niceCourses, eq(niceUnits.courseId, niceCourses.id))
			.where(and(inArray(niceCourses.id, [...HARDCODED_SCIENCE_COURSE_IDS]), isNull(niceQuestions.xml)))
	)
	if (missingResult.error) {
		logger.error("database query", { error: missingResult.error })
		throw errors.wrap(missingResult.error, "database query")
	}
	const missingXml = missingResult.data?.[0]?.count ?? 0

	const percentage = totalQuestions > 0 ? (missingXml / totalQuestions) * 100 : 0

	logger.info("missing xml analysis complete", {
		totalQuestions,
		missingXml,
		percentageMissingXml: Number(percentage.toFixed(2))
	})

	// --- QTI presence analysis for questions with XML ---
	logger.info("starting qti presence analysis for questions with xml")

	const withXmlQueryResult = await errors.try(
		db
			.select({
				id: niceQuestions.id,
				exerciseId: niceQuestions.exerciseId,
				xml: niceQuestions.xml
			})
			.from(niceQuestions)
			.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
			.innerJoin(niceLessonContents, eq(niceExercises.id, niceLessonContents.contentId))
			.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
			.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
			.innerJoin(niceCourses, eq(niceUnits.courseId, niceCourses.id))
			.where(and(inArray(niceCourses.id, [...HARDCODED_SCIENCE_COURSE_IDS]), sql`${niceQuestions.xml} is not null`))
	)
	if (withXmlQueryResult.error) {
		logger.error("database query", { error: withXmlQueryResult.error })
		throw errors.wrap(withXmlQueryResult.error, "database query")
	}

	const questionsWithXml = withXmlQueryResult.data
	if (!questionsWithXml || !Array.isArray(questionsWithXml)) {
		logger.error("invalid questions result for qti analysis", { questionsWithXml })
		throw errors.new("questions query returned invalid data")
	}

	logger.info("found questions with xml for qti presence check", { count: questionsWithXml.length })

	let presentInQti = 0
	let notFoundInQti = 0
	let identifierParseErrors = 0

	let processed = 0
	for (const q of questionsWithXml) {
		processed++
		// Extract identifier from XML
		const idResult = errors.trySync(() => extractIdentifier(String(q.xml), "qti-assessment-item"))
		if (idResult.error) {
			logger.error("failed to extract qti identifier from xml", { questionId: q.id, error: idResult.error })
			identifierParseErrors += 1
			continue
		}
		const identifier = idResult.data

		const getResult = await errors.try(qti.getAssessmentItem(identifier))
		if (getResult.error) {
			if (errors.is(getResult.error, ErrQtiNotFound)) {
				notFoundInQti += 1
			} else {
				logger.error("qti api error while checking item", { questionId: q.id, identifier, error: getResult.error })
				throw getResult.error
			}
		} else {
			presentInQti += 1
		}

		if (processed % 25 === 0) {
			logger.info("qti presence progress", {
				processed,
				total: questionsWithXml.length,
				presentInQti,
				notFoundInQti,
				identifierParseErrors
			})
		}

		// brief delay to avoid hammering the API
		await new Promise((resolve) => setTimeout(resolve, 50))
	}

	const totalWithXml = questionsWithXml.length
	const pctPresent = totalWithXml > 0 ? Number(((presentInQti / totalWithXml) * 100).toFixed(2)) : 0
	const pctNotFound = totalWithXml > 0 ? Number(((notFoundInQti / totalWithXml) * 100).toFixed(2)) : 0

	logger.info("qti presence analysis complete", {
		totalWithXml,
		presentInQti,
		notFoundInQti,
		identifierParseErrors,
		percentagePresentInQti: pctPresent,
		percentageNotFoundInQti: pctNotFound
	})
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script execution failed", { error: result.error })
	process.exit(1)
}

logger.info("script completed successfully")
process.exit(0)
