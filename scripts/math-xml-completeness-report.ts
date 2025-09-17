#!/usr/bin/env bun
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray, sql } from "drizzle-orm"

import { db } from "@/db"
import { niceCourses, niceExercises, niceLessonContents, niceLessons, niceQuestions, niceUnits } from "@/db/schemas"
import { HARDCODED_MATH_COURSE_IDS } from "@/lib/constants/course-mapping"

async function main(): Promise<void> {
	logger.info("starting math xml completeness report", {
		courseIds: HARDCODED_MATH_COURSE_IDS,
		courseCount: HARDCODED_MATH_COURSE_IDS.length
	})

	const rowsResult = await errors.try(
		db
			.select({
				courseId: niceCourses.id,
				courseTitle: niceCourses.title,
				exerciseId: niceExercises.id,
				exerciseTitle: niceExercises.title,
				exercisePath: niceExercises.path,
				totalQuestions: sql<number>`count(${niceQuestions.id})`,
				missingXml: sql<number>`count(*) filter (where ${niceQuestions.xml} is null)`
			})
			.from(niceQuestions)
			.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
			.innerJoin(niceLessonContents, eq(niceExercises.id, niceLessonContents.contentId))
			.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
			.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
			.innerJoin(niceCourses, eq(niceUnits.courseId, niceCourses.id))
			.where(and(inArray(niceCourses.id, [...HARDCODED_MATH_COURSE_IDS])))
			.groupBy(niceCourses.id, niceCourses.title, niceExercises.id, niceExercises.title, niceExercises.path)
			.orderBy(niceCourses.id, niceExercises.path)
	)
	if (rowsResult.error) {
		logger.error("database query", { error: rowsResult.error })
		throw errors.wrap(rowsResult.error, "database query")
	}

	const rows = rowsResult.data

	// Group by course for markdown sections
	type Group = { title: string; items: typeof rows }
	const courseIdToGroup = new Map<string, Group>()
	for (const r of rows) {
		const existing = courseIdToGroup.get(r.courseId)
		if (existing) {
			existing.items.push(r)
		} else {
			courseIdToGroup.set(r.courseId, { title: r.courseTitle, items: [r] })
		}
	}

	// Overall summary
	let overallTotal = 0
	let overallMissing = 0
	for (const r of rows) {
		// Ensure numeric aggregation even if the driver returns strings for count()
		overallTotal += Number(r.totalQuestions)
		overallMissing += Number(r.missingXml)
	}
	const overallPct = overallTotal > 0 ? Math.round((overallMissing / overallTotal) * 1000) / 10 : 0

	// Build Markdown
	let md = ""
	md += "### Math XML completeness report\n\n"
	md += `- **overall**: ${overallMissing} missing over ${overallTotal} total (${overallPct}%)\n\n`

	for (const [courseId, group] of courseIdToGroup) {
		// Sort by highest missing percentage first within the course
		const sorted = [...group.items].sort((a, b) => {
			const ap = a.totalQuestions > 0 ? a.missingXml / a.totalQuestions : 0
			const bp = b.totalQuestions > 0 ? b.missingXml / b.totalQuestions : 0
			return bp - ap
		})

		// Course header
		md += `### ${group.title} (${courseId})\n\n`
		md += "| Exercise | Missing XML | Total | Percent |\n"
		md += "|---|---:|---:|---:|\n"
		for (const r of sorted) {
			const pct = r.totalQuestions > 0 ? Math.round((r.missingXml / r.totalQuestions) * 1000) / 10 : 0
			const exerciseLabel = `${r.exerciseTitle} (${r.exercisePath})`
			md += `| ${exerciseLabel} | ${r.missingXml} | ${r.totalQuestions} | ${pct}% |\n`
		}
		md += "\n"
	}

	// Determine output path (allow optional --out=path override)
	const args = process.argv.slice(2)
	const outArg = args.find((a) => a.startsWith("--out="))
	const outPathFromArg = outArg ? outArg.split("=", 2)[1] : ""
	const exportDir = outPathFromArg ? path.dirname(outPathFromArg) : path.join(process.cwd(), "export")
	const exportFile = outPathFromArg || path.join(exportDir, "math-xml-completeness.md")

	const ensureDirResult = await errors.try(fs.mkdir(exportDir, { recursive: true }))
	if (ensureDirResult.error) {
		logger.error("directory creation", { error: ensureDirResult.error, dir: exportDir })
		throw errors.wrap(ensureDirResult.error, "directory creation")
	}

	const writeResult = await errors.try(fs.writeFile(exportFile, md, "utf8"))
	if (writeResult.error) {
		logger.error("file write", { error: writeResult.error, file: exportFile })
		throw errors.wrap(writeResult.error, "file write")
	}

	logger.info("report written", { file: exportFile })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script execution failed", { error: result.error })
	process.exit(1)
}

process.exit(0)
