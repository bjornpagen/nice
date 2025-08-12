import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { convertPerseusQuestionToDifferentiatedQtiItems } from "@/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items"
import { paraphraseStimulus } from "@/inngest/functions/qti/paraphrase-stimulus"
import { QtiItemMetadataSchema } from "@/lib/metadata/qti"
import { validateInBatches } from "@/lib/qti-validation/batch"
import { escapeXmlAttribute, replaceRootAttributes } from "@/lib/xml-utils"

// Schema for the expected assessment item format
const AssessmentItemSchema = z.object({
	xml: z.string(),
	metadata: QtiItemMetadataSchema
})
type AssessmentItem = z.infer<typeof AssessmentItemSchema>
function encodeProblemType(problemType: string): string {
	return createHash("sha256").update(problemType).digest("hex").slice(0, 12)
}

export const orchestrateCourseDifferentiatedIngestion = inngest.createFunction(
	{
		id: "orchestrate-course-differentiated-ingestion",
		name: "Orchestrate Differentiated Course Ingestion to QTI"
	},
	{ event: "qti/course.generate.differentiated" },
	async ({ event, step, logger }) => {
		const { courseId, n } = event.data
		logger.info("starting differentiated qti json dump workflow", { courseId, variations: n })

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

		const [allQuestions, articles, unitAssessments, courseAssessments, allExercises] = await Promise.all([
			db
				.select({
					id: schema.niceQuestions.id,
					xml: schema.niceQuestions.xml,
					exerciseId: schema.niceQuestions.exerciseId,
					exerciseTitle: schema.niceExercises.title,
					exercisePath: schema.niceExercises.path,
					exerciseSlug: schema.niceExercises.slug,
					problemType: schema.niceQuestions.problemType, // ADD THIS LINE
					unitId: schema.niceLessons.unitId
				})
				.from(schema.niceQuestions)
				.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
				.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
				.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
				.where(inArray(schema.niceLessons.unitId, unitIds)),
			db
				.selectDistinct({
					id: schema.niceArticles.id,
					title: schema.niceArticles.title,
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

		// Combine unit and course assessments into a single list
		const allAssessments = [...unitAssessments, ...courseAssessments]

		// Step 2: Fan-out generation for all questions
		const differentiationPromises = allQuestions.map((question) =>
			step.invoke(`differentiate-question-${question.id}`, {
				function: convertPerseusQuestionToDifferentiatedQtiItems,
				data: { questionId: question.id, n }
			})
		)
		const differentiatedResults = await Promise.all(differentiationPromises)
		const allGeneratedItems = differentiatedResults.flat().filter(Boolean)

		// Parse and validate generated items structure
		const parsedItems: AssessmentItem[] = []
		for (const item of allGeneratedItems) {
			const parseResult = AssessmentItemSchema.safeParse(item)
			if (parseResult.success) {
				parsedItems.push(parseResult.data)
			} else {
				logger.warn("item has invalid schema", {
					error: parseResult.error.issues,
					item: JSON.stringify(item).substring(0, 200)
				})
			}
		}

		// Validate generated differentiated items via QTI API and skip invalid ones in batches
		const validateResults = await validateInBatches(parsedItems, {
			schema: "item",
			getXml: (item) => item.xml,
			batchSize: 20,
			delayMs: 500,
			logger
		})
		const assessmentItems = parsedItems.filter((_, i) => validateResults[i]?.success === true)
		const skippedItemsCount = allGeneratedItems.length - assessmentItems.length
		for (let i = 0; i < validateResults.length; i++) {
			const res = validateResults[i]
			if (!res?.success) {
				const item = parsedItems[i]
				const errorsForLog = res?.response?.validationErrors
				logger.warn("skipping invalid differentiated qti item", {
					questionId: item?.metadata.khanId,
					errors: errorsForLog
				})
			}
		}
		logger.info("completed all question differentiations", {
			originalCount: allQuestions.length,
			generatedCount: assessmentItems.length
		})

		// Step 3: Fan-out paraphrasing for all stimuli
		const paraphrasingPromises = articles.map((article) =>
			step.invoke(`paraphrase-stimulus-${article.id}`, {
				function: paraphraseStimulus,
				data: { articleId: article.id }
			})
		)
		const paraphrasedResults = await Promise.all(paraphrasingPromises)
		const assessmentStimuli = paraphrasedResults
			.map((result, i) => {
				const article = articles[i]
				if (!article || !result || typeof result !== "object" || !("paraphrasedXml" in result)) return null
				const paraphrasedXml = result.paraphrasedXml
				if (typeof paraphrasedXml !== "string" || !paraphrasedXml) return null

				const finalXml = replaceRootAttributes(
					paraphrasedXml,
					"qti-assessment-stimulus",
					`nice_${article.id}`,
					article.title
				)
				return {
					xml: finalXml,
					metadata: {
						khanId: article.id,
						khanSlug: article.slug,
						khanTitle: article.title
					}
				}
			})
			.filter(Boolean)
		logger.info("completed all stimulus paraphrasing", {
			originalCount: articles.length,
			generatedCount: assessmentStimuli.length
		})

		// Step 4: Generate assessmentTests.json
		// This logic follows exactly the original orchestrator function.

		// Group questions by exerciseId for efficient lookup (using original questions).
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

		// Create a mapping from original question IDs to differentiated QTI identifiers
		const originalToQtiMap = new Map<string, string[]>()
		for (const item of assessmentItems) {
			// Type guard to ensure we have the expected structure
			if (!item || typeof item !== "object" || !("metadata" in item) || !("xml" in item)) continue
			const metadata = item.metadata
			if (!metadata || typeof metadata !== "object" || !("khanId" in metadata)) continue

			const originalId = metadata.khanId
			if (typeof originalId !== "string") continue

			const xml = item.xml
			if (typeof xml !== "string") continue

			const idMatch = xml.match(/identifier="([^"]+)"/)
			const qtiIdentifier = idMatch?.[1] ?? `nice_${originalId}_unknown`

			if (!originalToQtiMap.has(originalId)) {
				originalToQtiMap.set(originalId, [])
			}
			const existingItems = originalToQtiMap.get(originalId)
			if (existingItems) {
				existingItems.push(qtiIdentifier)
			}
		}

		// Replace original question IDs with differentiated QTI identifiers
		const differentiatedQuestionsByExerciseId = new Map<string, string[]>()
		for (const [exerciseId, originalQuestionIds] of questionsByExerciseId) {
			const differentiatedIds = originalQuestionIds.flatMap((originalId) => originalToQtiMap.get(originalId) || [])
			if (differentiatedIds.length > 0) {
				differentiatedQuestionsByExerciseId.set(exerciseId, differentiatedIds)
			}
		}

		// Group assessments and their exercises (exact copy from original)
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

		const buildTestObject = (
			id: string,
			title: string,
			questions: {
				id: string
				exerciseId: string
				exerciseTitle: string
				problemType: string
				unitId?: string
			}[],
			metadata: { khanAssessmentType?: string } & Record<string, unknown>
		): string => {
			const safeTitle = escapeXmlAttribute(title)

			let assessmentType: string | undefined
			if (typeof metadata.khanAssessmentType === "string") {
				assessmentType = metadata.khanAssessmentType
			} else {
				assessmentType = undefined
			}
			let targetTotal: number | undefined
			if (assessmentType === "CourseChallenge") {
				targetTotal = 30
			} else if (assessmentType === "UnitTest") {
				targetTotal = 12
			} else {
				targetTotal = undefined
			}

			type GroupKey = string
			const groups = new Map<GroupKey, typeof questions>()
			if (assessmentType === "CourseChallenge") {
				for (const q of questions) {
					if (!q.unitId) {
						logger.error("question missing unit id for course challenge grouping", {
							questionId: q.id,
							exerciseId: q.exerciseId,
							problemType: q.problemType
						})
						throw errors.new("question missing unit id")
					}
					const key = `${q.unitId}::${q.problemType}`
					const existing = groups.get(key)
					if (existing) {
						existing.push(q)
					} else {
						groups.set(key, [q])
					}
				}
			} else if (assessmentType === "UnitTest") {
				for (const q of questions) {
					const key = `${q.exerciseId}::${q.problemType}`
					const existing = groups.get(key)
					if (existing) {
						existing.push(q)
					} else {
						groups.set(key, [q])
					}
				}
			} else {
				for (const q of questions) {
					const key = q.problemType
					const existing = groups.get(key)
					if (existing) {
						existing.push(q)
					} else {
						groups.set(key, [q])
					}
				}
			}

			const outerToInner = new Map<string, Array<[string, typeof questions]>>()
			const sortedEntries = Array.from(groups.entries()).sort(([a], [b]) => (a < b ? -1 : 1))
			for (const [key, arr] of sortedEntries) {
				let outer: string
				if (key.includes("::")) {
					const parts = key.split("::")
					outer = parts[0] ?? "__"
				} else {
					outer = "__"
				}
				const existingList = outerToInner.get(outer)
				if (existingList) {
					existingList.push([key, arr])
				} else {
					outerToInner.set(outer, [[key, arr]])
				}
			}
			for (const entry of outerToInner.entries()) {
				const list = entry[1]
				list.sort(([ka], [kb]) => (ka < kb ? -1 : 1))
			}

			const chosenKeys: string[] = []
			if (typeof targetTotal === "number") {
				const outers = Array.from(outerToInner.keys()).sort((a, b) => (a < b ? -1 : 1))
				let picked = 0
				const cursors = new Map<string, number>(outers.map((o) => [o, 0]))
				let progress = true
				while (picked < targetTotal && progress) {
					progress = false
					for (const outer of outers) {
						if (picked >= targetTotal) break
						const cursor = cursors.get(outer) ?? 0
						const listForOuter = outerToInner.get(outer) ?? []
						if (cursor < listForOuter.length) {
							const tupleAtCursor = listForOuter[cursor]
							if (Array.isArray(tupleAtCursor)) {
								const keyAtCursor = tupleAtCursor[0]
								chosenKeys.push(keyAtCursor)
								cursors.set(outer, cursor + 1)
								picked++
								progress = true
							}
						}
					}
				}
			} else {
				chosenKeys.push(...sortedEntries.map(([k]) => k))
			}

			const sectionsXml = chosenKeys
				.map((key) => {
					const split = key.split("::")
					const problemType = split.length > 1 ? String(split[1]) : String(key)
					const encodedProblemType = encodeProblemType(problemType)
					const problemTypeQuestions = groups.get(key) ?? []
					const first = problemTypeQuestions[0]
					if (!first || !first.exerciseTitle || !first.exerciseId) {
						logger.error("invalid problemType group: missing exercise info", {
							problemType,
							groupSize: problemTypeQuestions.length
						})
						throw errors.new("invalid question grouping")
					}
					const safeExerciseTitle = escapeXmlAttribute(first.exerciseTitle)
					const exerciseId = first.exerciseId
					const itemRefsXml = problemTypeQuestions
						.map(
							(q, itemIndex) =>
								`<qti-assessment-item-ref identifier="${q.id}" href="/assessment-items/${q.id}" sequence="${itemIndex + 1}"></qti-assessment-item-ref>`
						)
						.join("\n                ")

					return `        <qti-assessment-section identifier="SECTION_${exerciseId}_${encodedProblemType}" title="${safeExerciseTitle}" visible="false">
            <qti-selection select="1" with-replacement="false"/>
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
				const questions = differentiatedQuestionsByExerciseId.get(exerciseId)
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
			// Note: For differentiated items, we need to map back to the original metadata
			const allQuestionsForTest = questionIds.map((qtiId) => {
				// Find the assessment item by its QTI identifier
				const item = assessmentItems.find((item) => {
					if (!item || typeof item !== "object" || !("xml" in item)) return false
					const xml = item.xml
					if (typeof xml !== "string") return false
					const idMatch = xml.match(/identifier="([^"]+)"/)
					return idMatch && idMatch[1] === qtiId
				})
				if (!item) {
					logger.error("QTI item not found when building test", { qtiId, assessmentId })
					throw errors.new(`qti item ${qtiId} not found when building test`)
				}

				// Type guard for metadata
				if (!("metadata" in item) || !item.metadata || typeof item.metadata !== "object") {
					logger.error("QTI item missing metadata when building test", { qtiId, assessmentId })
					throw errors.new(`qti item ${qtiId} missing metadata when building test`)
				}

				const metadata = item.metadata
				if (!("khanExerciseId" in metadata) || !("khanExerciseTitle" in metadata)) {
					logger.error("QTI item metadata missing exercise info when building test", { qtiId, assessmentId })
					throw errors.new(`qti item ${qtiId} metadata missing exercise info when building test`)
				}

				// Find original question to get its problemType
				const originalQuestion = allQuestions.find((q) => q.id === metadata.khanId)
				if (!originalQuestion) {
					logger.error("Original question not found for differentiated item", { qtiId, originalId: metadata.khanId })
					throw errors.new(`original question not found for qti item ${qtiId}`)
				}

				return {
					id: qtiId, // Use the QTI identifier
					exerciseId: metadata.khanExerciseId,
					exerciseTitle: metadata.khanExerciseTitle,
					problemType: originalQuestion.problemType, // ADD THIS LINE
					unitId: originalQuestion.unitId
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
			const questionIds = differentiatedQuestionsByExerciseId.get(exercise.id) || []

			if (questionIds.length === 0) {
				logger.info("Creating empty test for exercise without questions", {
					exerciseId: exercise.id,
					exerciseTitle: exercise.title
				})
			}

			// Map back to full question objects to get problemType
			const questionsForExercise = questionIds.map((qtiId) => {
				const item = assessmentItems.find((item) => {
					if (!item || typeof item !== "object" || !("xml" in item)) return false
					const xml = item.xml
					if (typeof xml !== "string") return false
					const idMatch = xml.match(/identifier="([^"]+)"/)
					return idMatch && idMatch[1] === qtiId
				})
				if (!item) {
					throw errors.new(`qti item ${qtiId} not found`)
				}
				if (!("metadata" in item) || !item.metadata || typeof item.metadata !== "object") {
					throw errors.new(`qti item ${qtiId} missing metadata`)
				}
				const metadata = item.metadata
				if (!("khanId" in metadata)) {
					throw errors.new("qti item metadata is missing khanId")
				}
				const originalQuestion = allQuestions.find((q) => q.id === metadata.khanId)
				if (!originalQuestion) {
					throw errors.new(`original question ${metadata.khanId} not found`)
				}
				return { id: qtiId, problemType: originalQuestion.problemType }
			})

			// Group questions by their problemType.
			const questionsByProblemType = new Map<string, Array<{ id: string; problemType: string }>>()
			for (const q of questionsForExercise) {
				if (!questionsByProblemType.has(q.problemType)) {
					questionsByProblemType.set(q.problemType, [])
				}
				questionsByProblemType.get(q.problemType)?.push(q)
			}

			const safeTitle = escapeXmlAttribute(exercise.title)

			const sectionsXml = Array.from(questionsByProblemType.entries())
				.map(([problemType, problemTypeQuestions]) => {
					const encodedProblemType = encodeProblemType(problemType)
					const itemRefsXml = problemTypeQuestions
						.map(
							(q, index) =>
								`<qti-assessment-item-ref identifier="${q.id}" href="/assessment-items/${q.id}" sequence="${index + 1}"></qti-assessment-item-ref>`
						)
						.join("\n                ")

					return `        <qti-assessment-section identifier="SECTION_${exercise.id}_${encodedProblemType}" title="${safeTitle}" visible="true">
            <qti-selection select="1" with-replacement="false"/>
            <qti-ordering shuffle="true"/>
            ${itemRefsXml}
        </qti-assessment-section>`
				})
				.join("\n")

			// For standalone exercises, we now create a test that selects a random sample of questions.
			return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${exercise.id}" title="${safeTitle}">
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0.0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
${sectionsXml}
    </qti-test-part>
</qti-assessment-test>`
		})

		const assessmentTests = [...explicitTests, ...exerciseTests]
		logger.info("generated assessment tests", { count: assessmentTests.length })

		// Step 5: Write all generated content to files in a single step.
		const outputDir = await step.run("write-qti-files", async () => {
			const course = await db.query.niceCourses.findFirst({
				where: eq(schema.niceCourses.id, courseId)
			})
			if (!course) throw errors.new("course not found for final dump")

			const courseDir = path.join(process.cwd(), "data", course.slug, "qti")
			await fs.mkdir(courseDir, { recursive: true })

			await Promise.all([
				fs.writeFile(path.join(courseDir, "assessmentItems.json"), JSON.stringify(assessmentItems, null, 2)),
				fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(assessmentStimuli, null, 2)),
				fs.writeFile(path.join(courseDir, "assessmentTests.json"), JSON.stringify(assessmentTests, null, 2))
			])

			return courseDir
		})

		logger.info("completed differentiated qti json dump workflow", {
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
			message: "Differentiated QTI JSON dump workflow completed successfully.",
			courseId,
			outputDir,
			skippedItems: skippedItemsCount
		}
	}
)
