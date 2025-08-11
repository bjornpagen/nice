#!/usr/bin/env bun

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { inArray, sql } from "drizzle-orm"
import { db } from "@/db"
import { niceArticles, niceAssessments, niceCourses, niceExercises, niceQuestions, niceVideos } from "@/db/schemas/nice"

interface DeletePlan {
	coursePath: string
	exerciseIds: string[]
}

async function getExerciseIdsForCourse(coursePath: string): Promise<string[]> {
	const pattern = `${coursePath}/%`
	const rowsResult = await errors.try(
		db.select({ id: niceExercises.id }).from(niceExercises).where(sql`${niceExercises.path} ilike ${pattern}`)
	)
	if (rowsResult.error) {
		logger.error("fetch exercise ids failed", { coursePath, error: rowsResult.error })
		throw errors.wrap(rowsResult.error, "exercise id query")
	}
	const rows = rowsResult.data
	if (!rows) throw errors.new("exercise id query returned no data")
	return rows.map((r) => r.id)
}

async function deleteCourseData(plan: DeletePlan, doDelete: boolean): Promise<void> {
	const { coursePath, exerciseIds } = plan
	const pattern = `${coursePath}/%`

	// questions by exercise ids
	if (exerciseIds.length > 0) {
		if (doDelete) {
			const delQ = await errors.try(
				db
					.delete(niceQuestions)
					.where(inArray(niceQuestions.exerciseId, exerciseIds))
					.returning({ id: niceQuestions.id })
			)
			if (delQ.error) {
				logger.error("delete questions failed", { coursePath, error: delQ.error })
				throw errors.wrap(delQ.error, "questions delete")
			}
			const delQData = delQ.data
			if (!delQData) throw errors.new("delete questions returned no data")
			logger.info("deleted questions", { coursePath, count: delQData.length })
		} else {
			const cntQ = await errors.try(
				db
					.select({ count: sql<number>`cast(count(*) as int)` })
					.from(niceQuestions)
					.where(inArray(niceQuestions.exerciseId, exerciseIds))
			)
			if (cntQ.error) {
				logger.error("count questions failed", { coursePath, error: cntQ.error })
				throw errors.wrap(cntQ.error, "questions count")
			}
			const cntQData = cntQ.data
			if (!cntQData) throw errors.new("questions count returned no data")
			if (cntQData.length !== 1) {
				throw errors.new("questions count query did not return exactly one row")
			}
			const cntQOnly = cntQData[0]
			if (!cntQOnly || typeof cntQOnly.count !== "number") {
				throw errors.new("questions count query returned invalid result")
			}
			logger.info("would delete questions", { coursePath, count: cntQOnly.count })
		}
	}

	// exercises
	if (doDelete) {
		const delEx = await errors.try(
			db.delete(niceExercises).where(sql`${niceExercises.path} ilike ${pattern}`).returning({ id: niceExercises.id })
		)
		if (delEx.error) {
			logger.error("delete exercises failed", { coursePath, error: delEx.error })
			throw errors.wrap(delEx.error, "exercises delete")
		}
		const delExData = delEx.data
		if (!delExData) throw errors.new("delete exercises returned no data")
		logger.info("deleted exercises", { coursePath, count: delExData.length })
	} else {
		const cntEx = await errors.try(
			db
				.select({ count: sql<number>`cast(count(*) as int)` })
				.from(niceExercises)
				.where(sql`${niceExercises.path} ilike ${pattern}`)
		)
		if (cntEx.error) {
			logger.error("count exercises failed", { coursePath, error: cntEx.error })
			throw errors.wrap(cntEx.error, "exercises count")
		}
		const cntExData = cntEx.data
		if (!cntExData) throw errors.new("exercises count returned no data")
		if (cntExData.length !== 1) {
			throw errors.new("exercises count query did not return exactly one row")
		}
		const cntExOnly = cntExData[0]
		if (!cntExOnly || typeof cntExOnly.count !== "number") {
			throw errors.new("exercises count query returned invalid result")
		}
		logger.info("would delete exercises", { coursePath, count: cntExOnly.count })
	}

	// assessments (assessment_exercises cascades)
	if (doDelete) {
		const delAs = await errors.try(
			db
				.delete(niceAssessments)
				.where(sql`${niceAssessments.path} ilike ${pattern}`)
				.returning({ id: niceAssessments.id })
		)
		if (delAs.error) {
			logger.error("delete assessments failed", { coursePath, error: delAs.error })
			throw errors.wrap(delAs.error, "assessments delete")
		}
		const delAsData = delAs.data
		if (!delAsData) throw errors.new("delete assessments returned no data")
		logger.info("deleted assessments", { coursePath, count: delAsData.length })
	} else {
		const cntAs = await errors.try(
			db
				.select({ count: sql<number>`cast(count(*) as int)` })
				.from(niceAssessments)
				.where(sql`${niceAssessments.path} ilike ${pattern}`)
		)
		if (cntAs.error) {
			logger.error("count assessments failed", { coursePath, error: cntAs.error })
			throw errors.wrap(cntAs.error, "assessments count")
		}
		const cntAsData = cntAs.data
		if (!cntAsData) throw errors.new("assessments count returned no data")
		if (cntAsData.length !== 1) {
			throw errors.new("assessments count query did not return exactly one row")
		}
		const cntAsOnly = cntAsData[0]
		if (!cntAsOnly || typeof cntAsOnly.count !== "number") {
			throw errors.new("assessments count query returned invalid result")
		}
		logger.info("would delete assessments", { coursePath, count: cntAsOnly.count })
	}

	// articles
	if (doDelete) {
		const delAr = await errors.try(
			db.delete(niceArticles).where(sql`${niceArticles.path} ilike ${pattern}`).returning({ id: niceArticles.id })
		)
		if (delAr.error) {
			logger.error("delete articles failed", { coursePath, error: delAr.error })
			throw errors.wrap(delAr.error, "articles delete")
		}
		const delArData = delAr.data
		if (!delArData) throw errors.new("delete articles returned no data")
		logger.info("deleted articles", { coursePath, count: delArData.length })
	} else {
		const cntAr = await errors.try(
			db
				.select({ count: sql<number>`cast(count(*) as int)` })
				.from(niceArticles)
				.where(sql`${niceArticles.path} ilike ${pattern}`)
		)
		if (cntAr.error) {
			logger.error("count articles failed", { coursePath, error: cntAr.error })
			throw errors.wrap(cntAr.error, "articles count")
		}
		const cntArData = cntAr.data
		if (!cntArData) throw errors.new("articles count returned no data")
		if (cntArData.length !== 1) {
			throw errors.new("articles count query did not return exactly one row")
		}
		const cntArOnly = cntArData[0]
		if (!cntArOnly || typeof cntArOnly.count !== "number") {
			throw errors.new("articles count query returned invalid result")
		}
		logger.info("would delete articles", { coursePath, count: cntArOnly.count })
	}

	// videos
	if (doDelete) {
		const delV = await errors.try(
			db.delete(niceVideos).where(sql`${niceVideos.path} ilike ${pattern}`).returning({ id: niceVideos.id })
		)
		if (delV.error) {
			logger.error("delete videos failed", { coursePath, error: delV.error })
			throw errors.wrap(delV.error, "videos delete")
		}
		const delVData = delV.data
		if (!delVData) throw errors.new("delete videos returned no data")
		logger.info("deleted videos", { coursePath, count: delVData.length })
	} else {
		const cntV = await errors.try(
			db
				.select({ count: sql<number>`cast(count(*) as int)` })
				.from(niceVideos)
				.where(sql`${niceVideos.path} ilike ${pattern}`)
		)
		if (cntV.error) {
			logger.error("count videos failed", { coursePath, error: cntV.error })
			throw errors.wrap(cntV.error, "videos count")
		}
		const cntVData = cntV.data
		if (!cntVData) throw errors.new("videos count returned no data")
		if (cntVData.length !== 1) {
			throw errors.new("videos count query did not return exactly one row")
		}
		const cntVOnly = cntVData[0]
		if (!cntVOnly || typeof cntVOnly.count !== "number") {
			throw errors.new("videos count query returned invalid result")
		}
		logger.info("would delete videos", { coursePath, count: cntVOnly.count })
	}

	// finally courses (units/lessons/lesson_contents cascade)
	if (doDelete) {
		const delC = await errors.try(
			db.delete(niceCourses).where(sql`${niceCourses.path} = ${coursePath}`).returning({ id: niceCourses.id })
		)
		if (delC.error) {
			logger.error("delete course failed", { coursePath, error: delC.error })
			throw errors.wrap(delC.error, "course delete")
		}
		const delCData = delC.data
		if (!delCData) throw errors.new("delete course returned no data")
		logger.info("deleted course row", { coursePath, count: delCData.length })
	} else {
		const cntC = await errors.try(
			db
				.select({ count: sql<number>`cast(count(*) as int)` })
				.from(niceCourses)
				.where(sql`${niceCourses.path} = ${coursePath}`)
		)
		if (cntC.error) {
			logger.error("count course failed", { coursePath, error: cntC.error })
			throw errors.wrap(cntC.error, "course count")
		}
		const cntCData = cntC.data
		if (!cntCData) throw errors.new("course count returned no data")
		if (cntCData.length !== 1) {
			throw errors.new("course count query did not return exactly one row")
		}
		const cntCOnly = cntCData[0]
		if (!cntCOnly || typeof cntCOnly.count !== "number") {
			throw errors.new("course count query returned invalid result")
		}
		logger.info("would delete course row", { coursePath, count: cntCOnly.count })
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2)
	const doDelete = args.includes("--delete") || args.includes("--yes")
	const paths = args.filter((a) => !a.startsWith("--"))

	if (paths.length === 0) {
		logger.info("usage", { example: "bun run scripts/delete-course.ts /science/ms-chemistry --delete" })
		return
	}

	if (doDelete) logger.info("deleting course data", { paths })
	else logger.info("dry-run: showing delete counts", { paths })

	for (const coursePath of paths) {
		const exIds = await getExerciseIdsForCourse(coursePath)
		logger.info("resolved exercise ids", { coursePath, count: exIds.length })
		await deleteCourseData({ coursePath, exerciseIds: exIds }, doDelete)
	}

	logger.info("done")
}

const result = await errors.try(main())
if (result.error) {
	logger.error("delete script failed", { error: result.error })
	process.exit(1)
}

process.exit(0)
