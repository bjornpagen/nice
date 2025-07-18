import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray } from "drizzle-orm"
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
		const [allQuestions, allArticles, unitAssessments, courseAssessments, allExercises] = await Promise.all([
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
				.where(inArray(schema.niceLessons.unitId, unitIds)),

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
				.where(inArray(schema.niceLessons.unitId, unitIds)),

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
				.where(and(inArray(schema.niceAssessments.parentId, unitIds), eq(schema.niceAssessments.parentType, "Unit"))),

			// ADDED: Fetch course-level assessments as well
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
				.where(and(eq(schema.niceAssessments.parentId, courseId), eq(schema.niceAssessments.parentType, "Course"))),

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

		// ADDED: Combine unit and course assessments into a single list
		const allAssessments = [...unitAssessments, ...courseAssessments]

		// CRITICAL VALIDATION: Ensure data integrity before proceeding
		logger.info("validating data integrity", {
			questionsCount: allQuestions.length,
			articlesCount: allArticles.length,
			exercisesCount: allExercises.length,
			assessmentsCount: allAssessments.length // Use combined count
		})

		// Validate ALL questions have XML
		for (const q of allQuestions) {
			if (!q.xml) {
				logger.error("CRITICAL: Question missing XML", {
					questionId: q.id,
					exerciseId: q.exerciseId,
					exerciseTitle: q.exerciseTitle
				})
				throw errors.new(`question ${q.id} is missing XML - ALL questions MUST have XML`)
			}
		}

		// Validate ALL articles have XML - if not, we'll create a default
		const articlesWithXml = allArticles.map((a) => {
			if (!a.xml) {
				logger.warn("Article missing XML, using default 'Article not found' template", {
					articleId: a.id,
					articleTitle: a.title,
					articlePath: a.path
				})

				// Create a default "Article not found" QTI XML
				const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-stimulus
    xmlns="http://www.imsglobal.org/xsd/qti/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/qti/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_stimulusv3p0p1_v1p0.xsd"
    identifier="${a.id}"
    title="${a.title.replace(/"/g, "&quot;")}"
    xml:lang="en-US">
    <qti-stimulus-body>
        <h2>Article Not Found</h2>
        <p>The content for this article is currently unavailable.</p>
        <p><em>Article ID: ${a.id}</em></p>
        <p><em>Title: ${a.title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</em></p>
    </qti-stimulus-body>
</qti-assessment-stimulus>`

				return { ...a, xml: defaultXml }
			}
			return a
		})

		// Group questions by exerciseId for efficient lookup.
		const questionsByExerciseId = new Map<string, string[]>()
		for (const q of allQuestions) {
			if (!questionsByExerciseId.has(q.exerciseId)) {
				questionsByExerciseId.set(q.exerciseId, [])
			}
			questionsByExerciseId.get(q.exerciseId)?.push(q.id)
		}

		// Log warnings for exercises without questions but don't throw
		for (const exercise of allExercises) {
			const questions = questionsByExerciseId.get(exercise.id)
			if (!questions || questions.length === 0) {
				logger.warn("Exercise has no questions - will create empty test", {
					exerciseId: exercise.id,
					exerciseTitle: exercise.title,
					exercisePath: exercise.path,
					exerciseSlug: exercise.slug
				})
			}
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
				const items = allQuestions.map((q) => {
					// TypeScript can't infer that validation happened above, so we need to check
					if (!q.xml) {
						throw errors.new("unreachable: question should have been validated for XML")
					}
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

				const stimuli = articlesWithXml.map((a) => {
					// All articles now have XML (either original or default)
					if (!a.xml) {
						throw errors.new("unreachable: article should have xml after default generation")
					}
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
					// metadata is kept for logging and potential future use but is not sent to the QTI API
					_metadata: Record<string, unknown>
				): CreateAssessmentTestInput => {
					const safeTitle = title.replace(/"/g, "&quot;")
					const itemRefsXml = itemIds
						.map(
							(itemId, index) =>
								`<qti-assessment-item-ref identifier="nice:${itemId}" href="/assessment-items/nice:${itemId}" sequence="${index + 1}"></qti-assessment-item-ref>`
						)
						.join("\n            ")

					// The entire test is now constructed as a single XML string.
					return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice:${id}" title="${safeTitle}">
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0.0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="MAX_SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>${itemIds.length}.0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
        <qti-assessment-section identifier="SECTION_1" title="Main Section" visible="true">
            ${itemRefsXml}
        </qti-assessment-section>
    </qti-test-part>
</qti-assessment-test>`
				}

				const explicitTests = Array.from(assessmentMap.entries()).map(([assessmentId, data]) => {
					const questionIds = data.exerciseIds.flatMap((exerciseId) => {
						const questions = questionsByExerciseId.get(exerciseId)
						if (!questions) {
							logger.warn("Exercise referenced by assessment has no questions", {
								assessmentId,
								exerciseId,
								assessmentTitle: data.title
							})
							return []
						}
						return questions
					})

					if (questionIds.length === 0) {
						logger.info("Creating empty test for assessment without questions", {
							assessmentId,
							assessmentTitle: data.title,
							assessmentType: data.type
						})
					}

					return buildTestObject(assessmentId, data.title, questionIds, {
						khanId: assessmentId,
						khanSlug: data.slug,
						khanPath: data.path,
						khanTitle: data.title,
						khanDescription: data.description,
						khanAssessmentType: data.type
					})
				})

				const exerciseTests = allExercises.map((exercise) => {
					// Get questions for this exercise (may be empty)
					const questionIds = questionsByExerciseId.get(exercise.id) || []

					if (questionIds.length === 0) {
						logger.info("Creating empty test for exercise without questions", {
							exerciseId: exercise.id,
							exerciseTitle: exercise.title
						})
					}

					return buildTestObject(exercise.id, exercise.title, questionIds, {
						khanId: exercise.id,
						khanSlug: exercise.slug,
						khanPath: exercise.path,
						khanTitle: exercise.title,
						khanDescription: exercise.description,
						khanAssessmentType: "Exercise"
					})
				})

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
