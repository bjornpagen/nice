import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { convertPerseusArticleToQtiStimulus } from "./qti/convert-perseus-article-to-qti-stimulus"
import { convertPerseusQuestionToQtiItem } from "./qti/convert-perseus-question-to-qti-item"

// Maximum size limit for Perseus content in bytes (using character count as proxy)
const MAX_PERSEUS_CONTENT_SIZE_BYTES = 100000

export const orchestrateCourseIngestionToQti = inngest.createFunction(
	{
		id: "orchestrate-course-ingestion-to-qti",
		name: "Orchestrate Course Ingestion to QTI"
	},
	{ event: "qti/course.ingest" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting qti generation and dump workflow", { courseId })

		// Step 1: Fetch all question IDs before the step.run
		const units = await db.query.niceUnits.findMany({
			where: eq(schema.niceUnits.courseId, courseId),
			columns: { id: true }
		})
		if (units.length === 0) {
			logger.info("no units found for course", { courseId })
			return { message: "No units found for course", courseId }
		}
		const unitIds = units.map((u) => u.id)

		const lessons = await db.query.niceLessons.findMany({
			where: inArray(schema.niceLessons.unitId, unitIds),
			columns: { id: true }
		})
		if (lessons.length === 0) {
			logger.info("no lessons found for course", { courseId })
			return { message: "No lessons found for course", courseId }
		}
		const lessonIds = lessons.map((l) => l.id)

		// Fetch all exercise IDs from lessons
		const lessonContents = await db.query.niceLessonContents.findMany({
			where: and(
				inArray(schema.niceLessonContents.lessonId, lessonIds),
				eq(schema.niceLessonContents.contentType, "Exercise")
			),
			columns: { contentId: true }
		})
		const exerciseIds = lessonContents.map((lc) => lc.contentId)

		// Fetch questions for all exercises
		const questions =
			exerciseIds.length > 0
				? await db.query.niceQuestions.findMany({
						where: inArray(schema.niceQuestions.exerciseId, exerciseIds),
						columns: { id: true }
					})
				: []
		const allQuestionIds = questions.map((q) => q.id)

		// Fetch all article IDs
		const articlesResult = await db
			.select({ id: schema.niceArticles.id })
			.from(schema.niceArticles)
			.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
			.where(
				and(
					inArray(schema.niceLessonContents.lessonId, lessonIds),
					eq(schema.niceLessonContents.contentType, "Article")
				)
			)
		const allArticleIds = articlesResult.map((a) => a.id)

		// Fetch articles with their content to check size (outside of step.run)
		const articlesWithContent =
			allArticleIds.length > 0
				? await db.query.niceArticles.findMany({
						where: inArray(schema.niceArticles.id, allArticleIds),
						columns: { id: true, perseusContent: true }
					})
				: []

		// Filter out articles that are too large (pure computation, no db operations)
		const filteredArticleIds = await step.run("filter-oversized-articles", async () => {
			return articlesWithContent
				.filter((article) => {
					if (!article.perseusContent) return false
					const size = JSON.stringify(article.perseusContent).length
					if (size > MAX_PERSEUS_CONTENT_SIZE_BYTES) {
						logger.warn("skipping oversized article", {
							articleId: article.id,
							size,
							maxSize: MAX_PERSEUS_CONTENT_SIZE_BYTES
						})
						return false
					}
					return true
				})
				.map((article) => article.id)
		})

		// Step 2: Invoke all migrations in parallel
		const itemMigrationInvocations = allQuestionIds.map((questionId) =>
			step.invoke(`migrate-item-${questionId}`, {
				function: convertPerseusQuestionToQtiItem,
				data: { questionId }
			})
		)
		const stimulusMigrationInvocations = filteredArticleIds.map((articleId) =>
			step.invoke(`migrate-stimulus-${articleId}`, {
				function: convertPerseusArticleToQtiStimulus,
				data: { articleId }
			})
		)

		const [itemResults, stimulusResults] = await Promise.all([
			Promise.all(itemMigrationInvocations),
			Promise.all(stimulusMigrationInvocations)
		])

		// Step 3: Fetch assessment data for building tests
		const assessmentsWithExercises = await db
			.select({
				assessmentId: schema.niceAssessments.id,
				assessmentTitle: schema.niceAssessments.title,
				assessmentType: schema.niceAssessments.type,
				exerciseId: schema.niceAssessmentExercises.exerciseId,
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

		// Step 4: Assemble the JSON payloads from the invocation results
		const { assessmentItems, assessmentStimuli, assessmentTests } = await step.run(
			"assemble-json-payloads",
			async () => {
				// Filter successful results and type them properly
				const successfulItems = itemResults.filter(
					(r): r is { status: "success"; questionId: string; qtiXml: string } => r.status === "success"
				)
				const successfulStimuli = stimulusResults.filter(
					(r): r is { status: "success"; articleId: string; qtiXml: string; title: string } => r.status === "success"
				)

				const items = successfulItems.map((r) => ({
					identifier: `nice-question-${r.questionId}`,
					xml: r.qtiXml
				}))

				const stimuli = successfulStimuli.map((r) => ({
					identifier: `nice-stimulus-${r.articleId}`,
					title: r.title,
					content: r.qtiXml
				}))

				// Build assessment tests from the pre-fetched data
				const tests = Array.from(assessmentMap.entries()).map(([assessmentId, data]) => ({
					identifier: `nice-test-${assessmentId}`,
					title: data.title,
					type: data.type,
					items: data.questionIds.map((qId) => `nice-question-${qId}`)
				}))

				return { assessmentItems: items, assessmentStimuli: stimuli, assessmentTests: tests }
			}
		)

		// Step 5: Write the final JSON files to the data/ directory
		// First fetch the course data outside of step.run
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
