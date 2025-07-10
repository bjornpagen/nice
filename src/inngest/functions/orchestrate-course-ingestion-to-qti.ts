import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import type { CreateAssessmentTestInput } from "@/lib/qti"

/**
 * Replaces the identifier and title attributes on the root tag of a given XML string.
 * @param xml The original XML string.
 * @param rootTag The name of the root tag (e.g., "qti-assessment-item").
 * @param newIdentifier The new identifier to set.
 * @param newTitle The new title to set.
 * @returns The XML string with updated attributes.
 */
function replaceRootAttributes(xml: string, rootTag: string, newIdentifier: string, newTitle: string): string {
	// A robust regex to find the root tag and capture its attributes.
	const rootTagRegex = new RegExp(`<(${rootTag})([^>]*?)>`)

	// Escape the title to be safely used in an XML attribute.
	const safeTitle = newTitle.replace(/"/g, "&quot;")

	return xml.replace(rootTagRegex, (_match, tagName, existingAttrs) => {
		// Replace attributes within the captured group.
		let updatedAttrs = existingAttrs.replace(/identifier="[^"]*"/, `identifier="${newIdentifier}"`)
		updatedAttrs = updatedAttrs.replace(/title="[^"]*"/, `title="${safeTitle}"`)
		return `<${tagName}${updatedAttrs}>`
	})
}

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

		// Fetch all content entities in parallel for efficiency.
		const [allQuestions, allArticles, allAssessments, allExercises] = await Promise.all([
			db
				.select({
					id: schema.niceQuestions.id,
					xml: schema.niceQuestions.xml,
					exerciseId: schema.niceQuestions.exerciseId,
					exerciseTitle: schema.niceExercises.title,
					exercisePath: schema.niceExercises.path,
					exerciseSlug: schema.niceExercises.slug
				})
				.from(schema.niceQuestions)
				.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
				.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
				.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
				.where(and(inArray(schema.niceLessons.unitId, unitIds), isNotNull(schema.niceQuestions.xml))),

			db
				.select({
					id: schema.niceArticles.id,
					xml: schema.niceArticles.xml,
					title: schema.niceArticles.title,
					path: schema.niceArticles.path,
					slug: schema.niceArticles.slug
				})
				.from(schema.niceArticles)
				.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
				.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
				.where(and(inArray(schema.niceLessons.unitId, unitIds), isNotNull(schema.niceArticles.xml))),

			db
				.select({
					assessmentId: schema.niceAssessments.id,
					assessmentTitle: schema.niceAssessments.title,
					assessmentType: schema.niceAssessments.type,
					assessmentPath: schema.niceAssessments.path,
					assessmentSlug: schema.niceAssessments.slug,
					assessmentDescription: schema.niceAssessments.description,
					exerciseId: schema.niceAssessmentExercises.exerciseId
				})
				.from(schema.niceAssessments)
				.innerJoin(
					schema.niceAssessmentExercises,
					eq(schema.niceAssessments.id, schema.niceAssessmentExercises.assessmentId)
				)
				.where(inArray(schema.niceAssessments.parentId, unitIds)),

			db.query.niceExercises.findMany({
				where: inArray(
					schema.niceExercises.id,
					db
						.selectDistinct({ id: schema.niceLessonContents.contentId })
						.from(schema.niceLessonContents)
						.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
						.where(
							and(eq(schema.niceLessonContents.contentType, "Exercise"), inArray(schema.niceLessons.unitId, unitIds))
						)
				)
			})
		])

		// Group questions by exerciseId for efficient lookup.
		const questionsByExerciseId = new Map<string, string[]>()
		for (const q of allQuestions) {
			if (!questionsByExerciseId.has(q.exerciseId)) {
				questionsByExerciseId.set(q.exerciseId, [])
			}
			questionsByExerciseId.get(q.exerciseId)?.push(q.id)
		}

		// Group assessments and their exercises
		const assessmentMap = new Map<
			string,
			{ title: string; type: string; path: string; slug: string; description: string | null; exerciseIds: string[] }
		>()
		for (const row of allAssessments) {
			if (!assessmentMap.has(row.assessmentId)) {
				assessmentMap.set(row.assessmentId, {
					title: row.assessmentTitle,
					type: row.assessmentType,
					path: row.assessmentPath,
					slug: row.assessmentSlug,
					description: row.assessmentDescription,
					exerciseIds: []
				})
			}
			assessmentMap.get(row.assessmentId)?.exerciseIds.push(row.exerciseId)
		}

		// Step 3: Assemble the JSON payloads from the fetched data.
		const { assessmentItems, assessmentStimuli, assessmentTests } = await step.run(
			"assemble-json-payloads-from-db",
			async () => {
				const items = allQuestions
					.filter((q) => q.xml !== null)
					.map((q) => {
						if (!q.xml) throw errors.new(`XML is null for question ${q.id}`)
						// Use the robust helper function.
						const finalXml = replaceRootAttributes(q.xml, "qti-assessment-item", `nice:${q.id}`, q.exerciseTitle)
						return {
							xml: finalXml,
							metadata: {
								khanId: q.id,
								khanExerciseId: q.exerciseId,
								khanExerciseSlug: q.exerciseSlug,
								khanExercisePath: q.exercisePath,
								khanExerciseTitle: q.exerciseTitle
							}
						}
					})

				const stimuli = allArticles
					.filter((a) => a.xml !== null)
					.map((a) => {
						if (!a.xml) throw errors.new(`XML is null for article ${a.id}`)
						// Use the robust helper function.
						const finalXml = replaceRootAttributes(a.xml, "qti-assessment-stimulus", `nice:${a.id}`, a.title)
						return {
							xml: finalXml,
							metadata: {
								khanId: a.id,
								khanSlug: a.slug,
								khanPath: a.path,
								khanTitle: a.title
							}
						}
					})

				const buildTestObject = (
					id: string,
					title: string,
					itemIds: string[],
					metadata: Record<string, unknown>
				): CreateAssessmentTestInput => ({
					identifier: `nice:${id}`,
					title: title,
					metadata,
					"qti-outcome-declaration": [
						{
							identifier: "SCORE",
							cardinality: "single",
							baseType: "float"
						},
						{
							identifier: "MAX_SCORE",
							cardinality: "single",
							baseType: "float"
						}
					],
					"qti-test-part": [
						{
							identifier: "PART_1",
							navigationMode: "nonlinear",
							submissionMode: "individual",
							"qti-assessment-section": [
								{
									identifier: "SECTION_1",
									title: "Main Section",
									visible: true,
									sequence: 1,
									"qti-assessment-item-ref": itemIds.map((itemId, index) => ({
										identifier: `nice:${itemId}`,
										href: `/assessment-items/nice:${itemId}`,
										sequence: index + 1
									}))
								}
							]
						}
					]
				})

				const explicitTests = Array.from(assessmentMap.entries())
					.map(([assessmentId, data]) => {
						const questionIds = data.exerciseIds.flatMap((exerciseId) => questionsByExerciseId.get(exerciseId) || [])
						if (questionIds.length === 0) return null
						return buildTestObject(assessmentId, data.title, questionIds, {
							khanId: assessmentId,
							khanSlug: data.slug,
							khanPath: data.path,
							khanTitle: data.title,
							khanDescription: data.description,
							khanAssessmentType: data.type
						})
					})
					.filter((test): test is CreateAssessmentTestInput => test !== null)

				const exerciseTests = allExercises
					.map((exercise) => {
						const questionIds = questionsByExerciseId.get(exercise.id) || []
						if (questionIds.length === 0) return null
						return buildTestObject(exercise.id, exercise.title, questionIds, {
							khanId: exercise.id,
							khanSlug: exercise.slug,
							khanPath: exercise.path,
							khanTitle: exercise.title,
							khanDescription: exercise.description,
							khanAssessmentType: "Exercise"
						})
					})
					.filter((test): test is CreateAssessmentTestInput => test !== null)

				const tests = [...explicitTests, ...exerciseTests]

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
