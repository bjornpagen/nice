#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray, isNotNull, or } from "drizzle-orm"

import { db } from "@/db"
import { niceCourses, niceExercises, niceLessonContents, niceLessons, niceQuestions, niceUnits } from "@/db/schemas"
import { HARDCODED_MATH_COURSE_IDS } from "@/lib/constants/course-mapping"

type RunOptions = { apply: boolean; chunkSize: number }

async function main(options: RunOptions): Promise<void> {
	logger.info("starting clear of xml and structured_json for math questions", {
		courseIds: HARDCODED_MATH_COURSE_IDS,
		courseCount: HARDCODED_MATH_COURSE_IDS.length,
		mode: options.apply ? "apply" : "dry-run",
		chunkSize: options.chunkSize
	})

	logger.info("querying target question ids")
	const idsResult = await errors.try(
		db
			.select({ id: niceQuestions.id })
			.from(niceQuestions)
			.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
			.innerJoin(niceLessonContents, eq(niceExercises.id, niceLessonContents.contentId))
			.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
			.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
			.innerJoin(niceCourses, eq(niceUnits.courseId, niceCourses.id))
			.where(
				and(
					inArray(niceCourses.id, [...HARDCODED_MATH_COURSE_IDS]),
					or(isNotNull(niceQuestions.xml), isNotNull(niceQuestions.structuredJson))
				)
			)
	)
	if (idsResult.error) {
		logger.error("database query failed", { error: idsResult.error })
		throw errors.wrap(idsResult.error, "database query")
	}

	const questionIds = idsResult.data.map((r) => r.id)
	logger.info("found questions to clear", { count: questionIds.length })

	if (questionIds.length === 0) {
		logger.info("no matching questions; exiting")
		return
	}

	if (!options.apply) {
		logger.info("dry-run: would clear xml and structured_json for questions", {
			sample: questionIds.slice(0, 5)
		})
		return
	}

	let processed = 0
	for (let i = 0; i < questionIds.length; i += options.chunkSize) {
		const chunk = questionIds.slice(i, i + options.chunkSize)
		logger.info("applying update chunk", { start: i, end: i + chunk.length, count: chunk.length })

		const updateResult = await errors.try(
			db.update(niceQuestions).set({ xml: null, structuredJson: null }).where(inArray(niceQuestions.id, chunk))
		)
		if (updateResult.error) {
			logger.error("failed to update chunk", { error: updateResult.error, start: i, size: chunk.length })
			throw errors.wrap(updateResult.error, "update questions")
		}

		processed += chunk.length
		logger.info("progress", { processed, total: questionIds.length })
	}

	logger.info("clear operation completed", { total: questionIds.length })
}

// Parse CLI flags
const argv = process.argv.slice(2)
const hasDryRun = argv.includes("--dry-run")
const hasApply = argv.includes("--apply")
const chunkSizeFlag = argv.find((a) => a.startsWith("--chunk="))
const parsedChunkSize = chunkSizeFlag ? Number(chunkSizeFlag.split("=")[1]) : 500

if (hasDryRun && hasApply) {
	logger.error("invalid flags: both --dry-run and --apply provided")
	process.exit(1)
}

if (!Number.isFinite(parsedChunkSize) || parsedChunkSize <= 0) {
	logger.error("invalid chunk size", { value: chunkSizeFlag })
	process.exit(1)
}

const applyMode = hasApply // default to dry-run unless --apply is provided

const result = await errors.try(main({ apply: applyMode, chunkSize: parsedChunkSize }))
if (result.error) {
	logger.error("clear script failed", { error: result.error })
	process.exit(1)
}

logger.info("clear script completed successfully")
process.exit(0)
