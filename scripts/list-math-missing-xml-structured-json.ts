#!/usr/bin/env bun
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray, isNull } from "drizzle-orm"

import { db } from "@/db"
import { niceCourses, niceExercises, niceLessonContents, niceLessons, niceQuestions, niceUnits } from "@/db/schemas"
import { HARDCODED_MATH_COURSE_IDS } from "@/lib/constants/course-mapping"

async function main(): Promise<void> {
	logger.info("starting query for math questions missing xml and structured json", {
		courseIds: HARDCODED_MATH_COURSE_IDS,
		courseCount: HARDCODED_MATH_COURSE_IDS.length
	})

	const queryResult = await errors.try(
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
					isNull(niceQuestions.xml),
					isNull(niceQuestions.structuredJson)
				)
			)
	)
	if (queryResult.error) {
		logger.error("database query", { error: queryResult.error })
		throw errors.wrap(queryResult.error, "database query")
	}

	const rows = queryResult.data
	if (!rows || !Array.isArray(rows)) {
		logger.error("invalid query result shape", { rows })
		throw errors.new("invalid query result")
	}

	const questionIds = rows.map((r) => r.id)

	// Determine output path (allow optional --out=path override)
	const args = process.argv.slice(2)
	const outArg = args.find((a) => a.startsWith("--out="))
	const outPathFromArg = outArg ? outArg.split("=", 2)[1] : ""
	const exportDir = outPathFromArg ? path.dirname(outPathFromArg) : path.join(process.cwd(), "export")
	const exportFile = outPathFromArg || path.join(exportDir, "math-missing-xml-structured-json.txt")

	const ensureDirResult = await errors.try(fs.mkdir(exportDir, { recursive: true }))
	if (ensureDirResult.error) {
		logger.error("failed to ensure export directory", { error: ensureDirResult.error, dir: exportDir })
		throw errors.wrap(ensureDirResult.error, "directory creation")
	}

	const fileContent = questionIds.join("\n") + (questionIds.length > 0 ? "\n" : "")
	const writeResult = await errors.try(fs.writeFile(exportFile, fileContent, "utf8"))
	if (writeResult.error) {
		logger.error("failed to write export file", { error: writeResult.error, file: exportFile })
		throw errors.wrap(writeResult.error, "file write")
	}

	logger.info("query complete and file written", { count: questionIds.length, file: exportFile })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script execution failed", { error: result.error })
	process.exit(1)
}

process.exit(0)
