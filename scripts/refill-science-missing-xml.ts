#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray, isNull } from "drizzle-orm"

import { db } from "@/db"
import { niceCourses, niceExercises, niceLessonContents, niceLessons, niceQuestions, niceUnits } from "@/db/schemas"
import { qti } from "@/lib/clients"
import { HARDCODED_SCIENCE_COURSE_IDS } from "@/lib/constants/course-mapping"

// Note: We fetch XML directly from TimeBack QTI by searching items and matching metadata.khanId to question.id

type RunOptions = { apply: boolean }

async function main(options: RunOptions): Promise<void> {
	logger.info("starting refill of missing xml for science questions", {
		courseIds: HARDCODED_SCIENCE_COURSE_IDS,
		courseCount: HARDCODED_SCIENCE_COURSE_IDS.length,
		mode: options.apply ? "apply" : "dry-run"
	})

	// Query ALL questions with missing xml from science courses
	logger.debug("querying all science questions with missing xml")
	const missingResult = await errors.try(
		db
			.select({
				id: niceQuestions.id,
				courseId: niceCourses.id,
				courseTitle: niceCourses.title
			})
			.from(niceQuestions)
			.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
			.innerJoin(niceLessonContents, eq(niceExercises.id, niceLessonContents.contentId))
			.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
			.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
			.innerJoin(niceCourses, eq(niceUnits.courseId, niceCourses.id))
			.where(and(inArray(niceCourses.id, [...HARDCODED_SCIENCE_COURSE_IDS]), isNull(niceQuestions.xml)))
	)
	if (missingResult.error) {
		logger.error("database query failed", { error: missingResult.error })
		throw errors.wrap(missingResult.error, "database query")
	}

	const allMissingQuestions = missingResult.data
	logger.info("found questions with missing xml across all science courses", {
		count: allMissingQuestions.length
	})

	if (allMissingQuestions.length === 0) {
		logger.info("no questions found with missing xml")
		return
	}

	let totalRefilled = 0
	let totalAmbiguous = 0
	let totalUnmatched = 0
	let totalErrors = 0

	// Process one question at a time
	for (let i = 0; i < allMissingQuestions.length; i++) {
		const question = allMissingQuestions[i]
		if (!question) {
			logger.warn("encountered undefined question in array", { index: i })
			continue
		}
		const progress = `${i + 1}/${allMissingQuestions.length}`

		logger.debug("processing question", {
			questionId: question.id,
			courseId: question.courseId,
			courseTitle: question.courseTitle,
			progress
		})

		// Get QTI assessment item directly using nice_ prefix pattern
		const qtiIdentifier = `nice_${question.id}`
		logger.debug("fetching qti item directly", {
			questionId: question.id,
			qtiIdentifier
		})

		const getResult = await errors.try(qti.getAssessmentItem(qtiIdentifier))
		if (getResult.error) {
			logger.error("qti get item failed", {
				questionId: question.id,
				courseId: question.courseId,
				qtiIdentifier,
				progress,
				error: getResult.error
			})
			totalErrors += 1
			continue // Don't throw, continue with next question
		}

		const assessmentItem = getResult.data
		logger.debug("qti item retrieved", {
			questionId: question.id,
			qtiIdentifier: assessmentItem.identifier,
			hasRawXml: !!assessmentItem.rawXml,
			xmlLength: assessmentItem.rawXml?.length ?? 0
		})

		if (!assessmentItem.rawXml || typeof assessmentItem.rawXml !== "string") {
			logger.warn("qti item lacked rawXml; skipping", {
				questionId: question.id,
				courseId: question.courseId,
				qtiIdentifier: assessmentItem.identifier,
				hasRawXml: !!assessmentItem.rawXml,
				rawXmlType: typeof assessmentItem.rawXml
			})
			totalUnmatched += 1
			continue
		}

		const xmlCandidate = assessmentItem.rawXml
		logger.debug("found xml candidate", {
			questionId: question.id,
			qtiIdentifier: assessmentItem.identifier,
			xmlLength: xmlCandidate.length
		})

		if (options.apply) {
			logger.debug("applying xml update to database", { questionId: question.id })
			const updateResult = await errors.try(
				db
					.update(niceQuestions)
					.set({
						xml: xmlCandidate,
						structuredJson: {}
					})
					.where(eq(niceQuestions.id, question.id))
			)
			if (updateResult.error) {
				logger.error("failed to update question xml", {
					questionId: question.id,
					courseId: question.courseId,
					error: updateResult.error
				})
				totalErrors += 1
				continue // Don't throw, continue with next question
			}
			logger.info("updated question xml and reset structuredJson", {
				questionId: question.id,
				courseId: question.courseId,
				progress
			})
		} else {
			logger.info("dry-run: would update question xml and reset structuredJson", {
				questionId: question.id,
				courseId: question.courseId,
				qtiIdentifier: assessmentItem.identifier,
				xmlLength: xmlCandidate.length,
				progress
			})
		}
		totalRefilled += 1

		// Progress logging every 10 questions
		if ((i + 1) % 10 === 0) {
			logger.info("processing progress", {
				processed: i + 1,
				total: allMissingQuestions.length,
				refilled: totalRefilled,
				unmatched: totalUnmatched,
				ambiguous: totalAmbiguous,
				errors: totalErrors
			})
		}

		// brief delay to avoid hammering the provider
		await new Promise((resolve) => setTimeout(resolve, 100))
	}

	logger.info("refill completed", {
		totalMissing: allMissingQuestions.length,
		totalRefilled,
		totalAmbiguous,
		totalUnmatched,
		totalErrors
	})
}

// Parse CLI flags
const argv = process.argv.slice(2)
const hasDryRun = argv.includes("--dry-run")
const hasApply = argv.includes("--apply")

if (hasDryRun && hasApply) {
	logger.error("invalid flags: both --dry-run and --apply provided")
	process.exit(1)
}

const applyMode = hasApply // default to dry-run unless --apply is provided

const result = await errors.try(main({ apply: applyMode }))
if (result.error) {
	logger.error("refill script failed", { error: result.error })
	process.exit(1)
}

logger.info("refill script completed successfully")
process.exit(0)
