import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"

export const orchestrateCourseIngestionToQti = inngest.createFunction(
	{
		id: "orchestrate-course-ingestion-to-qti",
		name: "Orchestrate Course Ingestion to QTI"
	},
	{ event: "qti/course.ingest" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting qti json dump workflow from database", { courseId })

		// Step 1: Fetch all course structure and content IDs from the database.
		const units = await db.query.niceUnits.findMany({
			where: eq(schema.niceUnits.courseId, courseId),
			columns: { id: true }
		})
		if (units.length === 0) {
			logger.info("no units found for course", { courseId })
			return { message: "No units found for course", courseId }
		}
		const unitIds = units.map((u) => u.id)

		const allQuestions = await db
			.select({
				id: schema.niceQuestions.id,
				xml: schema.niceQuestions.xml
			})
			.from(schema.niceQuestions)
			.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
			.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
			.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
			.where(and(inArray(schema.niceLessons.unitId, unitIds), isNotNull(schema.niceQuestions.xml)))

		const allArticles = await db
			.select({
				id: schema.niceArticles.id,
				xml: schema.niceArticles.xml,
				title: schema.niceArticles.title
			})
			.from(schema.niceArticles)
			.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
			.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
			.where(and(inArray(schema.niceLessons.unitId, unitIds), isNotNull(schema.niceArticles.xml)))

		// Step 2: Fetch assessment data for building tests.
		const assessmentsWithExercises = await db
			.select({
				assessmentId: schema.niceAssessments.id,
				assessmentTitle: schema.niceAssessments.title,
				assessmentType: schema.niceAssessments.type,
				questionId: schema.niceQuestions.id
			})
			.from(schema.niceAssessments)
			.innerJoin(
				schema.niceAssessmentExercises,
				eq(schema.niceAssessments.id, schema.niceAssessmentExercises.assessmentId)
			)
			.innerJoin(schema.niceQuestions, eq(schema.niceAssessmentExercises.exerciseId, schema.niceQuestions.exerciseId))
			.where(inArray(schema.niceAssessments.parentId, unitIds))

		// Group questions by assessment
		const assessmentMap = new Map<
			string,
			{
				title: string
				type: string
				questionIds: string[]
			}
		>()

		for (const row of assessmentsWithExercises) {
			if (!assessmentMap.has(row.assessmentId)) {
				assessmentMap.set(row.assessmentId, {
					title: row.assessmentTitle,
					type: row.assessmentType,
					questionIds: []
				})
			}
			assessmentMap.get(row.assessmentId)?.questionIds.push(row.questionId)
		}

		// Step 3: Assemble the JSON payloads from the fetched data.
		const { assessmentItems, assessmentStimuli, assessmentTests } = await step.run(
			"assemble-json-payloads-from-db",
			async () => {
				const items = allQuestions.map((q) => ({
					identifier: `nice:${q.id}`,
					xml: q.xml
				}))

				const stimuli = allArticles.map((a) => ({
					identifier: `nice:${a.id}`,
					title: a.title,
					content: a.xml
				}))

				const tests = Array.from(assessmentMap.entries()).map(([assessmentId, data]) => ({
					identifier: `nice:${assessmentId}`,
					title: data.title,
					type: data.type,
					items: data.questionIds.map((qId) => `nice:${qId}`)
				}))

				return { assessmentItems: items, assessmentStimuli: stimuli, assessmentTests: tests }
			}
		)

		// Step 4: Write the final JSON files to the data/ directory.
		const course = await db.query.niceCourses.findFirst({
			where: eq(schema.niceCourses.id, courseId)
		})
		if (!course) {
			logger.error("course not found for final dump", { courseId })
			throw errors.new("course not found for final dump")
		}

		const outputDir = await step.run("write-json-dump", async () => {
			const courseDir = path.join(process.cwd(), "data", course.slug, "qti")
			await fs.mkdir(courseDir, { recursive: true })

			await fs.writeFile(path.join(courseDir, "assessmentItems.json"), JSON.stringify(assessmentItems, null, 2))
			await fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(assessmentStimuli, null, 2))
			await fs.writeFile(path.join(courseDir, "assessmentTests.json"), JSON.stringify(assessmentTests, null, 2))

			return courseDir
		})

		logger.info("completed QTI JSON dump workflow successfully", {
			courseId,
			outputDir,
			stats: {
				items: assessmentItems.length,
				stimuli: assessmentStimuli.length,
				tests: assessmentTests.length
			}
		})

		return {
			message: "QTI JSON dump workflow completed successfully.",
			courseId,
			outputDir
		}
	}
)
