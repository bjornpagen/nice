import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { QtiItemMetadataSchema } from "@/lib/metadata/qti"
import { validateInBatches } from "@/lib/qti-validation/batch"
import { escapeXmlAttribute, replaceRootAttributes } from "@/lib/xml-utils"

// Schema for the expected assessment item format
const AssessmentItemSchema = z.object({
	xml: z.string(),
	metadata: QtiItemMetadataSchema
})
type AssessmentItem = z.infer<typeof AssessmentItemSchema>

export const orchestrateCourseIngestionToQti = inngest.createFunction(
	{
		id: "orchestrate-course-ingestion-to-qti",
		name: "Orchestrate Course Ingestion to QTI"
	},
	{ event: "qti/course.ingest" },
	async ({ event, logger }) => {
		const { courseId } = event.data
		logger.info("starting qti json dump workflow", { courseId })

		// --- STANDARD PATH: Direct DB-to-JSON dump (original logic) ---
		logger.info("executing standard qti generation pipeline", { courseId })

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

		// Log standard path units for comparison with differentiation path
		logger.info("units fetched for standard path", {
			unitIds: unitIds,
			unitCount: units.length,
			courseId
		})

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
    title="${escapeXmlAttribute(a.title)}"
    xml:lang="en-US">
    <qti-stimulus-body>
        <h2>Article Not Found</h2>
        <p>The content for this article is currently unavailable.</p>
        <p><em>Article ID: ${a.id}</em></p>
        <p><em>Title: ${escapeXmlAttribute(a.title)}</em></p>
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
		const itemsUnvalidated: AssessmentItem[] = allQuestions.map((q) => {
			// TypeScript can't infer that validation happened above, so we need to check
			if (!q.xml) {
				throw errors.new("unreachable: question should have been validated for XML")
			}
			const finalXml = replaceRootAttributes(q.xml, "qti-assessment-item", `nice_${q.id}`, q.exerciseTitle)
			return {
				xml: finalXml,
				metadata: {
					khanId: q.id,
					khanExerciseId: q.exerciseId,
					khanExerciseSlug: q.exerciseSlug,
					khanExerciseTitle: q.exerciseTitle
				}
			}
		})

		// Validate all items via QTI API and skip invalid ones (batched)
		const validationResults = await validateInBatches(itemsUnvalidated, {
			schema: "item",
			getXml: (item) => item.xml,
			batchSize: 20,
			delayMs: 500,
			logger
		})
		const items = itemsUnvalidated.filter((_, i) => validationResults[i]?.success === true)
		const skippedItemsCount = itemsUnvalidated.length - items.length
		for (let i = 0; i < validationResults.length; i++) {
			const res = validationResults[i]
			if (!res?.success) {
				const item = itemsUnvalidated[i]
				const errorsForLog = res?.response?.validationErrors
				logger.warn("skipping invalid qti item", {
					questionId: item?.metadata.khanId,
					errors: errorsForLog
				})
			}
		}

		const stimuli = articlesWithXml.map((a) => {
			// All articles now have XML (either original or default)
			if (!a.xml) {
				throw errors.new("unreachable: article should have xml after default generation")
			}
			const finalXml = replaceRootAttributes(a.xml, "qti-assessment-stimulus", `nice_${a.id}`, a.title)
			return {
				xml: finalXml,
				metadata: {
					khanId: a.id,
					khanSlug: a.slug,
					khanTitle: a.title
				}
			}
		})

		const validOriginalQuestionIds = new Set(items.map((it) => String(it.metadata.khanId)))

		const buildTestObject = (
			id: string,
			title: string,
			questions: { id: string; exerciseId: string; exerciseTitle: string }[],
			_metadata: Record<string, unknown>
		): string => {
			const safeTitle = escapeXmlAttribute(title)

			// Group questions by their source exercise.
			const questionsByExercise = new Map<string, { title: string; questionIds: string[] }>()
			for (const q of questions) {
				if (!questionsByExercise.has(q.exerciseId)) {
					questionsByExercise.set(q.exerciseId, { title: q.exerciseTitle, questionIds: [] })
				}
				questionsByExercise.get(q.exerciseId)?.questionIds.push(q.id)
			}

			// Determine the number of questions to select from each exercise based on assessment type.
			// All summative assessments (Quizzes, Unit Tests, Course Challenges) will now select 2 questions per exercise.
			const selectCount = 2

			const sectionsXml = Array.from(questionsByExercise.entries())
				.map(([exerciseId, { title: exerciseTitle, questionIds }]) => {
					const safeExerciseTitle = escapeXmlAttribute(exerciseTitle)
					const itemRefsXml = questionIds
						.map(
							(itemId, itemIndex) =>
								`<qti-assessment-item-ref identifier="nice_${itemId}" href="/assessment-items/nice_${itemId}" sequence="${itemIndex + 1}"></qti-assessment-item-ref>`
						)
						.join("\n                ")

					return `        <qti-assessment-section identifier="SECTION_${exerciseId}" title="${safeExerciseTitle}" visible="false">
            <qti-selection select="${Math.min(selectCount, questionIds.length)}" with-replacement="false"/>
            <qti-ordering shuffle="true"/>
            ${itemRefsXml}
        </qti-assessment-section>`
				})
				.join("\n")

			// The entire test is now constructed as a single XML string.
			return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${id}" title="${safeTitle}">
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0.0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
${sectionsXml}
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

			// Map question IDs to full question objects with exercise information
			// Filter out invalid questions by original question id
			const filteredIds = questionIds.filter((id) => validOriginalQuestionIds.has(String(id)))
			const allQuestionsForTest = filteredIds.map((id) => {
				const question = allQuestions.find((q) => q.id === id)
				if (!question) {
					logger.error("Question not found when building test", { questionId: id, assessmentId })
					throw errors.new(`question ${id} not found when building test`)
				}
				return {
					id: question.id,
					exerciseId: question.exerciseId,
					exerciseTitle: question.exerciseTitle
				}
			})

			return buildTestObject(assessmentId, data.title, allQuestionsForTest, {
				khanId: assessmentId,
				khanSlug: data.slug,
				khanTitle: data.title,
				khanDescription: data.description,
				khanAssessmentType: data.type
			})
		})

		const exerciseTests = allExercises.map((exercise) => {
			// Get questions for this exercise (may be empty)
			const questionIds = (questionsByExerciseId.get(exercise.id) || []).filter((id) =>
				validOriginalQuestionIds.has(String(id))
			)

			if (questionIds.length === 0) {
				logger.info("Creating empty test for exercise without questions", {
					exerciseId: exercise.id,
					exerciseTitle: exercise.title
				})
			}

			const safeTitle = escapeXmlAttribute(exercise.title)
			const itemRefsXml = questionIds
				.map(
					(itemId, index) =>
						`<qti-assessment-item-ref identifier="nice_${itemId}" href="/assessment-items/nice_${itemId}" sequence="${index + 1}"></qti-assessment-item-ref>`
				)
				.join("\n                ")

			// The number of questions to select. Math.min ensures we don't try to select more questions than exist.
			const selectCountForExercise = Math.min(5, questionIds.length)

			// For standalone exercises, we now create a test that selects a random sample of questions.
			return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${exercise.id}" title="${safeTitle}">
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0.0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
        <qti-assessment-section identifier="SECTION_${exercise.id}" title="${safeTitle}" visible="true">
            <qti-selection select="${selectCountForExercise}" with-replacement="false"/>
            <qti-ordering shuffle="true"/>
            ${itemRefsXml}
        </qti-assessment-section>
    </qti-test-part>
</qti-assessment-test>`
		})

		const tests = [...explicitTests, ...exerciseTests]

		const assessmentItems = items
		const assessmentStimuli = stimuli
		const assessmentTests = tests

		// Step 4: Write the final JSON files to the data/ directory.
		const course = await db.query.niceCourses.findFirst({
			where: eq(schema.niceCourses.id, courseId)
		})
		if (!course) {
			logger.error("course not found for final dump", { courseId })
			throw errors.new("course not found for final dump")
		}

		const courseDir = path.join(process.cwd(), "data", course.slug, "qti")
		await fs.mkdir(courseDir, { recursive: true })

		await fs.writeFile(path.join(courseDir, "assessmentItems.json"), JSON.stringify(assessmentItems, null, 2))
		await fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(assessmentStimuli, null, 2))
		await fs.writeFile(path.join(courseDir, "assessmentTests.json"), JSON.stringify(assessmentTests, null, 2))

		const outputDir = courseDir

		logger.info("completed QTI JSON dump workflow successfully", {
			courseId,
			outputDir,
			stats: {
				items: assessmentItems.length,
				stimuli: assessmentStimuli.length,
				tests: assessmentTests.length,
				skippedItems: skippedItemsCount
			}
		})

		return {
			message: "QTI JSON dump workflow completed successfully.",
			courseId,
			outputDir,
			skippedItems: skippedItemsCount
		}
	}
)
