import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { convertPerseusQuestionToDifferentiatedQtiItems } from "@/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items"

const HARDCODED_COURSE_IDS = [
	"x0267d782", // 6th grade math (Common Core)
	"x6b17ba59", // 7th grade math (Common Core)
	"x7c7044d7" // 8th grade math (Common Core)
]

const DIFFERENTIATION_COUNT = 3

export const orchestrateHardcodedQtiDifferentiationForItems = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-qti-differentiation-for-items",
		name: "Orchestrate Hardcoded QTI Differentiation for Assessment Items"
	},
	{ event: "migration/hardcoded.qti.differentiate-items" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded qti differentiation for assessment items", {
			courseCount: HARDCODED_COURSE_IDS.length,
			variationsPerItem: DIFFERENTIATION_COUNT
		})

		const courses = await db.query.niceCourses.findMany({
			where: inArray(schema.niceCourses.id, HARDCODED_COURSE_IDS),
			columns: { id: true, slug: true }
		})

		await Promise.all(
			courses.map(async (course) => {
				logger.info("processing course for item differentiation", { courseId: course.id })

				const units = await db.query.niceUnits.findMany({
					where: eq(schema.niceUnits.courseId, course.id),
					columns: { id: true }
				})
				if (units.length === 0) {
					logger.info("no units found for course, skipping", { courseId: course.id })
					return
				}
				const unitIds = units.map((u) => u.id)

				const questions = await db
					.selectDistinct({ id: schema.niceQuestions.id })
					.from(schema.niceQuestions)
					.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
					.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
					.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
					.where(inArray(schema.niceLessons.unitId, unitIds))

				if (questions.length === 0) {
					logger.info("no questions found for course, skipping", { courseId: course.id })
					return
				}

				const differentiationResults = await Promise.all(
					questions.map((q) =>
						step.invoke(`differentiate-${q.id}`, {
							function: convertPerseusQuestionToDifferentiatedQtiItems,
							data: { questionId: q.id, n: DIFFERENTIATION_COUNT }
						})
					)
				)

				const assessmentItems = differentiationResults.flat().filter(Boolean)

				const courseDir = path.join(process.cwd(), "data", course.slug, "qti")
				const mkdirResult = await errors.try(fs.mkdir(courseDir, { recursive: true }))
				if (mkdirResult.error) {
					logger.error("directory creation failed", { error: mkdirResult.error, file: courseDir })
					throw errors.wrap(mkdirResult.error, "directory creation")
				}

				const writeResult = await errors.try(
					fs.writeFile(path.join(courseDir, "assessmentItems.json"), JSON.stringify(assessmentItems, null, 2))
				)
				if (writeResult.error) {
					logger.error("file write failed", {
						error: writeResult.error,
						file: path.join(courseDir, "assessmentItems.json")
					})
					throw errors.wrap(writeResult.error, "file write")
				}

				logger.info("successfully differentiated and saved items for course", {
					courseId: course.id,
					itemsGenerated: assessmentItems.length
				})
			})
		)

		logger.info("completed hardcoded qti differentiation for all courses")
		return { status: "complete", courseCount: HARDCODED_COURSE_IDS.length }
	}
)
