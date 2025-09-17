#!/usr/bin/env bun
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import * as schema from "@/db/schemas"
import {
	HARDCODED_HISTORY_COURSE_IDS,
	HARDCODED_MATH_COURSE_IDS,
	HARDCODED_SCIENCE_COURSE_IDS
} from "@/lib/constants/course-mapping"

// Configuration
const OUTPUT_DIR = path.join(process.cwd(), "export")
const BASE_URL = "https://qti.alpha-1edtech.com/api/assessment-tests/nice_"

type Subject = "math" | "science" | "history"
const PEOPLE = ["Ameer", "Bjorn", "Aiden"] as const

function parseSubjectFromArgs(argv: readonly string[]): Subject {
	const flags = {
		math: argv.includes("--math"),
		science: argv.includes("--science"),
		history: argv.includes("--history")
	}

	const FlagsSchema = z
		.object({ math: z.boolean(), science: z.boolean(), history: z.boolean() })
		.refine((f) => Number(f.math) + Number(f.science) + Number(f.history) === 1, {
			message: "exactly one of --math, --science, or --history must be provided"
		})

	const result = FlagsSchema.safeParse(flags)
	if (!result.success) {
		logger.error("invalid subject flag", { error: result.error })
		throw errors.wrap(result.error, "cli flag validation")
	}

	if (flags.math) return "math"
	if (flags.science) return "science"
	return "history"
}

function getCourseIdsForSubject(subject: Subject): readonly string[] {
	if (subject === "math") return [...HARDCODED_MATH_COURSE_IDS]
	if (subject === "history") return [...HARDCODED_HISTORY_COURSE_IDS]
	return [...HARDCODED_SCIENCE_COURSE_IDS]
}

function getOutputFile(subject: Subject): string {
	return path.join(OUTPUT_DIR, `${subject}-unit-test-urls.md`)
}

async function ensureOutputDir(): Promise<void> {
	const mkdirResult = await errors.try(fs.mkdir(OUTPUT_DIR, { recursive: true }))
	if (mkdirResult.error) {
		logger.error("failed to create export directory", { error: mkdirResult.error, dir: OUTPUT_DIR })
		throw errors.wrap(mkdirResult.error, "directory creation")
	}
}

async function fetchUnitTestIdsForCourses(courseIds: readonly string[]): Promise<string[]> {
	// Get units for the given course IDs
	const unitsResult = await errors.try(
		db
			.select({ id: schema.niceUnits.id })
			.from(schema.niceUnits)
			.where(inArray(schema.niceUnits.courseId, courseIds))
			.prepare("scripts_list_science_unit_test_urls_get_units")
			.execute()
	)
	if (unitsResult.error) {
		logger.error("failed to fetch units for courses", { error: unitsResult.error, courseIds })
		throw errors.wrap(unitsResult.error, "database query for units")
	}

	const unitIds = unitsResult.data.map((u) => u.id)
	if (unitIds.length === 0) return []

	// Get UnitTest assessments whose parent is a Unit and parentId in unitIds
	const assessmentsResult = await errors.try(
		db
			.select({ id: schema.niceAssessments.id })
			.from(schema.niceAssessments)
			.where(
				and(
					eq(schema.niceAssessments.parentType, "Unit"),
					inArray(schema.niceAssessments.parentId, unitIds),
					eq(schema.niceAssessments.type, "UnitTest")
				)
			)
			.prepare("scripts_list_science_unit_test_urls_get_assessments")
			.execute()
	)
	if (assessmentsResult.error) {
		logger.error("failed to fetch unit test assessments", { error: assessmentsResult.error })
		throw errors.wrap(assessmentsResult.error, "database query for assessments")
	}

	return assessmentsResult.data.map((a) => a.id)
}

async function fetchQuestionCountsForAssessments(
	assessmentIds: readonly string[]
): Promise<ReadonlyArray<{ id: string; count: number }>> {
	if (assessmentIds.length === 0) return []

	const countsResult = await errors.try(
		db
			.select({
				assessmentId: schema.niceAssessmentExercises.assessmentId,
				count: sql<number>`count(${schema.niceQuestions.id})`
			})
			.from(schema.niceAssessmentExercises)
			.leftJoin(schema.niceQuestions, eq(schema.niceQuestions.exerciseId, schema.niceAssessmentExercises.exerciseId))
			.where(inArray(schema.niceAssessmentExercises.assessmentId, assessmentIds))
			.groupBy(schema.niceAssessmentExercises.assessmentId)
			.prepare("scripts_list_science_unit_test_urls_question_counts")
			.execute()
	)
	if (countsResult.error) {
		logger.error("failed to count questions for assessments", { error: countsResult.error })
		throw errors.wrap(countsResult.error, "database query for question counts")
	}

	return countsResult.data.map((row) => ({ id: row.assessmentId, count: Number(row.count) }))
}

function balanceAssignments(
	items: ReadonlyArray<{ id: string; count: number }>
): Record<(typeof PEOPLE)[number], Array<{ id: string; count: number }>> {
	const totals: Record<(typeof PEOPLE)[number], number> = { Ameer: 0, Bjorn: 0, Aiden: 0 }
	const assignments: Record<(typeof PEOPLE)[number], Array<{ id: string; count: number }>> = {
		Ameer: [],
		Bjorn: [],
		Aiden: []
	}

	const sorted = [...items].sort((a, b) => b.count - a.count)
	for (const item of sorted) {
		let target: (typeof PEOPLE)[number] = "Ameer"
		let minTotal = totals.Ameer
		for (const person of PEOPLE) {
			if (totals[person] < minTotal) {
				minTotal = totals[person]
				target = person
			}
		}
		assignments[target].push(item)
		totals[target] += item.count
	}

	logger.info("balanced assignments", {
		ameerCount: totals.Ameer,
		bjornCount: totals.Bjorn,
		aidenCount: totals.Aiden
	})

	return assignments
}

async function writeMarkdown(
	outputFile: string,
	subject: Subject,
	assignments: Record<(typeof PEOPLE)[number], Array<{ id: string; count: number }>>
): Promise<void> {
	const subjectTitle = `${subject.charAt(0).toUpperCase()}${subject.slice(1)}`
	const lines: string[] = [
		`# ${subjectTitle} Unit Test URLs`,
		"",
		"The following URLs are generated by appending the unit test ID to the base endpoint:",
		`Base: ${BASE_URL}`,
		""
	]

	for (const person of PEOPLE) {
		lines.push(`## ${person}`)
		lines.push("")
		const itemsForPerson = assignments[person]
		if (!itemsForPerson) {
			logger.error("missing assignment bucket", { person })
			throw errors.new("assignment bucket missing")
		}
		for (const item of itemsForPerson) {
			lines.push(`- ${BASE_URL}${item.id}/questions (${item.count} questions)`)
		}
		lines.push("")
	}

	const content = `${lines.join("\n")}\n`

	const writeResult = await errors.try(fs.writeFile(outputFile, content, "utf-8"))
	if (writeResult.error) {
		logger.error("failed to write markdown output", { error: writeResult.error, file: outputFile })
		throw errors.wrap(writeResult.error, "file write")
	}
}

async function main(): Promise<void> {
	logger.info("starting unit test url generation")

	await ensureOutputDir()

	const subject = parseSubjectFromArgs(process.argv)
	const courseIds = getCourseIdsForSubject(subject)
	logger.debug("using hardcoded course ids", { subject, count: courseIds.length, courseIds })

	const unitTestIds = await fetchUnitTestIdsForCourses(courseIds)
	logger.info("fetched unit test assessments", { count: unitTestIds.length })

	const uniqueIds = Array.from(new Set(unitTestIds)).sort()
	const counts = await fetchQuestionCountsForAssessments(uniqueIds)
	logger.info("computed question counts", { count: counts.length })

	const assignments = balanceAssignments(counts)
	const outputFile = getOutputFile(subject)
	await writeMarkdown(outputFile, subject, assignments)

	logger.info("unit test url generation completed", { output: outputFile, count: uniqueIds.length })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}
