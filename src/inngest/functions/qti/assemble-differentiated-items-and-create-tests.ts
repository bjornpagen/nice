import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
// Import all necessary helpers from the original orchestrator
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { qti } from "@/lib/clients"
import { QtiItemMetadataSchema } from "@/lib/metadata/qti"
import { ErrQtiNotFound } from "@/lib/qti"
import { buildDeterministicKBuckets } from "@/lib/utils/k-bucketing"
import { escapeXmlAttribute } from "@/lib/xml-utils"

// ✅ ADD: Configurable constants for batched validation to avoid overwhelming the QTI API.
const VALIDATION_BATCH_SIZE = 20
const VALIDATION_DELAY_MS = 500

// ... (copy AssessmentItem schema, AssessmentTestCandidate type from original file) ...
const AssessmentItemSchema = z.object({
	xml: z.string(),
	metadata: QtiItemMetadataSchema
})
type AssessmentItem = z.infer<typeof AssessmentItemSchema>
type AssessmentTestCandidate = {
	id: string
	xml: string
}

function encodeProblemType(problemType: string): string {
	return createHash("sha256").update(problemType).digest("hex").slice(0, 12)
}

export const assembleDifferentiatedItemsAndCreateTests = inngest.createFunction(
	{
		id: "assemble-differentiated-items-and-create-tests",
		name: "Assemble Differentiated Items, Validate, and Create Tests",
		// Give this step a longer timeout as it could process a lot of data
		timeouts: {
			start: "30m"
		}
	},
	{ event: "qti/assembly.items.ready" },
	async ({ event, logger }) => {
		const { courseSlugs } = event.data

		for (const courseSlug of courseSlugs) {
			logger.info("starting assembly phase for course", { courseSlug })

			const chunksDir = path.join(process.cwd(), "data", courseSlug, "qti", "items_chunks")

			// 1. Read all chunk file names from the directory
			const readResult = await errors.try(fs.readdir(chunksDir))
			if (readResult.error) {
				logger.error("could not read chunks directory, cannot assemble course.", {
					dir: chunksDir,
					error: readResult.error
				})
				continue // Skip to the next course
			}
			const chunkFiles = readResult.data.filter((f) => f.endsWith(".json"))

			// 2. Read and parse all chunk files in parallel
			const allChunks = await Promise.all(
				chunkFiles.map(async (file) => {
					const readResult = await errors.try(fs.readFile(path.join(chunksDir, file), "utf-8"))
					if (readResult.error) {
						logger.error("failed to read chunk file", { file, error: readResult.error })
						return [] // Return empty array for failed chunks
					}
					const parseResult = errors.trySync(() => JSON.parse(readResult.data))
					if (parseResult.error) {
						logger.error("failed to parse chunk file", { file, error: parseResult.error })
						return [] // Return empty array for failed chunks
					}
					return parseResult.data
				})
			)

			// 3. Assemble all items into a single in-memory array
			const allGeneratedItems = allChunks.flat()
			logger.info("assembled items from chunks", {
				itemCount: allGeneratedItems.length,
				chunkCount: chunkFiles.length,
				courseSlug
			})

			// 4. Perform validation and filtering (the "ghetto-validate" logic from the original file)
			// This logic is copied directly from the original orchestrator.
			const parsedItems: AssessmentItem[] = []
			for (const item of allGeneratedItems) {
				const parseResult = AssessmentItemSchema.safeParse(item)
				if (parseResult.success) {
					parsedItems.push(parseResult.data)
				}
			}

			// ✅ MODIFIED: The "ghetto-validate" logic now uses the configured batch size and delay.
			// This remains a batched process inside a single Inngest function run.
			const assessmentItems: AssessmentItem[] = []
			const skippedItems: Array<{ item: AssessmentItem; error?: unknown }> = []

			for (let i = 0; i < parsedItems.length; i += VALIDATION_BATCH_SIZE) {
				const batch = parsedItems.slice(i, i + VALIDATION_BATCH_SIZE)
				const batchResults = await Promise.all(
					batch.map(async (item) => {
						// Extract the actual identifier from the XML
						const idMatch = item.xml.match(/identifier="([^"]+)"/)
						if (!idMatch || !idMatch[1]) {
							logger.error("could not extract identifier from xml", { khanId: item.metadata.khanId })
							return { success: false, item, error: errors.new("missing identifier in xml") }
						}
						const actualIdentifier = idMatch[1]

						const payload = {
							identifier: actualIdentifier,
							xml: item.xml,
							metadata: { temp: true, sourceId: item.metadata.khanId }
						}
						const updateResult = await errors.try(qti.updateAssessmentItem(payload))
						if (updateResult.error) {
							if (errors.is(updateResult.error, ErrQtiNotFound)) {
								const createResult = await errors.try(qti.createAssessmentItem(payload))
								if (createResult.error) return { success: false, item, error: createResult.error }
							} else {
								return { success: false, item, error: updateResult.error }
							}
						}
						await errors.try(qti.deleteAssessmentItem(actualIdentifier))
						return { success: true, item }
					})
				)
				for (const result of batchResults) {
					if (result.success) assessmentItems.push(result.item)
					else skippedItems.push(result)
				}
				if (i + VALIDATION_BATCH_SIZE < parsedItems.length) {
					await new Promise((resolve) => setTimeout(resolve, VALIDATION_DELAY_MS))
				}
			}

			// 5. Write the final aggregated and validated assessmentItems.json file
			const courseDir = path.join(process.cwd(), "data", courseSlug, "qti")
			await fs.writeFile(path.join(courseDir, "assessmentItems.json"), JSON.stringify(assessmentItems, null, 2))

			// 6. Generate Assessment Tests (This entire block of logic is copied from the original orchestrator)
			logger.info("starting test generation for course", { courseSlug })
			// ... (All DB queries to fetch exercises, assessments, etc.) ...
			// ... (All logic to build test objects using the `assessmentItems` array) ...

			// First, we need to get courseId from courseSlug
			const courseResult = await errors.try(
				db.query.niceCourses.findFirst({
					where: eq(schema.niceCourses.slug, courseSlug),
					columns: { id: true }
				})
			)
			if (courseResult.error) {
				logger.error("failed to find course by slug", { courseSlug, error: courseResult.error })
				continue
			}
			const course = courseResult.data
			if (!course) {
				logger.error("course not found by slug", { courseSlug })
				continue
			}
			const courseId = course.id

			// Get units for the course
			const unitsResult = await errors.try(
				db.query.niceUnits.findMany({
					where: eq(schema.niceUnits.courseId, courseId),
					columns: { id: true }
				})
			)
			if (unitsResult.error) {
				logger.error("db query for units failed", { courseId, error: unitsResult.error })
				continue
			}
			const units = unitsResult.data
			if (units.length === 0) {
				logger.info("no units found for course, skipping test generation", { courseId })
				continue
			}
			const unitIds = units.map((u) => u.id)

			const testsDataResult = await errors.try(
				Promise.all([
					db
						.select({
							id: schema.niceQuestions.id,
							exerciseId: schema.niceQuestions.exerciseId,
							exerciseTitle: schema.niceExercises.title,
							problemType: schema.niceQuestions.problemType // ADD THIS LINE
						})
						.from(schema.niceQuestions)
						.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
						.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
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
						.where(
							and(inArray(schema.niceAssessments.parentId, unitIds), eq(schema.niceAssessments.parentType, "Unit"))
						),
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
									and(
										eq(schema.niceLessonContents.contentType, "Exercise"),
										inArray(schema.niceLessons.unitId, unitIds)
									)
								)
						)
					})
				])
			)
			if (testsDataResult.error) {
				logger.error("db queries for test generation failed", { courseId, error: testsDataResult.error })
				continue
			}
			const [allQuestionsForTests, unitAssessments, courseAssessments, allExercises] = testsDataResult.data
			logger.debug("fetched data for test generation", {
				courseId,
				questions: allQuestionsForTests.length,
				unitAssessments: unitAssessments.length,
				courseAssessments: courseAssessments.length,
				exercises: allExercises.length
			})

			// Group original questions by exerciseId for mapping
			const questionsByExerciseId = new Map<string, string[]>()
			for (const q of allQuestionsForTests) {
				if (!questionsByExerciseId.has(q.exerciseId)) {
					questionsByExerciseId.set(q.exerciseId, [])
				}
				questionsByExerciseId.get(q.exerciseId)?.push(q.id)
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

			const assessmentMap = new Map<
				string,
				{
					title: string
					type: string
					path: string
					slug: string
					description: string | null
					exerciseIds: string[]
				}
			>()
			for (const row of [...unitAssessments, ...courseAssessments]) {
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
				questions: { id: string; exerciseId: string; exerciseTitle: string; problemType: string }[],
				assessmentType: string
			): AssessmentTestCandidate => {
				const safeTitle = escapeXmlAttribute(title)

				// Unified deterministic k-bucketing for all assessment types
				let targetCount: number
				if (assessmentType === "Exercise") targetCount = 4
				else if (assessmentType === "Quiz") targetCount = 8
				else if (assessmentType === "UnitTest") targetCount = 12
				else targetCount = 30
				const buckets = buildDeterministicKBuckets(id, questions, targetCount).buckets
				const sectionsXml = buckets
					.map((bucket, i) => {
						const itemRefsXml = bucket
							.map(
								(q, idx) =>
									`<qti-assessment-item-ref identifier="${q.id}" href="/assessment-items/${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
							)
							.join("\n                ")
						return `        <qti-assessment-section identifier="SECTION_${id}_BUCKET_${i}" title="${safeTitle}" visible="false">
            <qti-selection select="1" with-replacement="false"/>
            <qti-ordering shuffle="true"/>
            ${itemRefsXml}
        </qti-assessment-section>`
					})
					.join("\n")

				const xml = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${id}" title="${safeTitle}">
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0.0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
${sectionsXml}
    </qti-test-part>
</qti-assessment-test>`
				return { id, xml }
			}

			const explicitTestsCandidates: AssessmentTestCandidate[] = Array.from(assessmentMap.entries()).map(
				([assessmentId, data]) => {
					const questionIds = data.exerciseIds.flatMap((exerciseId) => {
						const questions = differentiatedQuestionsByExerciseId.get(exerciseId)
						if (!questions) {
							logger.warn("exercise referenced by assessment has no questions", {
								assessmentId,
								exerciseId,
								assessmentTitle: data.title
							})
							return []
						}
						return questions
					})

					if (questionIds.length === 0) {
						logger.info("creating empty test for assessment without questions", {
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
							logger.error("qti item not found when building test", { qtiId, assessmentId })
							throw errors.new(`qti item ${qtiId} not found when building test`)
						}

						// Type guard for metadata
						if (!("metadata" in item) || !item.metadata || typeof item.metadata !== "object") {
							logger.error("qti item missing metadata when building test", { qtiId, assessmentId })
							throw errors.new(`qti item ${qtiId} missing metadata when building test`)
						}

						const metadata = item.metadata
						if (!("khanExerciseId" in metadata) || !("khanExerciseTitle" in metadata)) {
							logger.error("qti item metadata missing exercise info when building test", { qtiId, assessmentId })
							throw errors.new(`qti item ${qtiId} metadata missing exercise info when building test`)
						}

						// Find original question to get its problemType
						const originalQuestion = allQuestionsForTests.find((q) => q.id === metadata.khanId)
						if (!originalQuestion) {
							logger.error("original question not found for differentiated item", {
								qtiId,
								originalId: metadata.khanId
							})
							throw errors.new(`original question not found for qti item ${qtiId}`)
						}

						return {
							id: qtiId, // Use the QTI identifier, not the original question ID
							exerciseId: metadata.khanExerciseId,
							exerciseTitle: metadata.khanExerciseTitle,
							problemType: originalQuestion.problemType // ADD THIS LINE
						}
					})
					return buildTestObject(assessmentId, data.title, allQuestionsForTest, data.type)
				}
			)

			const exerciseTestsCandidates: AssessmentTestCandidate[] = allExercises.map((exercise) => {
				// Get questions for this exercise (may be empty)
				const questionIds = differentiatedQuestionsByExerciseId.get(exercise.id) || []

				if (questionIds.length === 0) {
					logger.info("creating empty test for exercise without questions", {
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
					const originalQuestion = allQuestionsForTests.find((q) => q.id === metadata.khanId)
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
						const selectCountForExercise = 1
						return `        <qti-assessment-section identifier="SECTION_${exercise.id}_${encodedProblemType}" title="${safeTitle}" visible="false">
            <qti-selection select="${selectCountForExercise}" with-replacement="false"/>
            <qti-ordering shuffle="true"/>
            ${itemRefsXml}
        </qti-assessment-section>`
					})
					.join("\n")

				const xml = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${exercise.id}" title="${safeTitle}">
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0.0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
${sectionsXml}
    </qti-test-part>
</qti-assessment-test>`
				return { id: exercise.id, xml }
			})

			// Ghetto-validate assessment tests (batched upsert + immediate delete)
			const testCandidates = [...explicitTestsCandidates, ...exerciseTestsCandidates]
			const validatedTests: AssessmentTestCandidate[] = []
			const skippedTests: Array<{ test: AssessmentTestCandidate; error?: unknown }> = []

			for (let i = 0; i < testCandidates.length; i += VALIDATION_BATCH_SIZE) {
				const batch = testCandidates.slice(i, i + VALIDATION_BATCH_SIZE)
				logger.debug("ghetto-validate batch starting", {
					batchStart: i,
					batchSize: batch.length,
					total: testCandidates.length
				})

				const batchResults = await Promise.all(
					batch.map(async (test) => {
						const identifier = `nice_${test.id}`
						// Upsert test
						const updateResult = await errors.try(qti.updateAssessmentTest(identifier, test.xml))
						if (updateResult.error) {
							if (errors.is(updateResult.error, ErrQtiNotFound)) {
								const createResult = await errors.try(qti.createAssessmentTest(test.xml))
								if (createResult.error) {
									logger.error("ghetto-validate create failed", { identifier, error: createResult.error })
									return { success: false, test, error: createResult.error }
								}
							} else {
								logger.error("ghetto-validate update failed", { identifier, error: updateResult.error })
								return { success: false, test, error: updateResult.error }
							}
						}

						// Delete immediately
						const deleteResult = await errors.try(qti.deleteAssessmentTest(identifier))
						if (deleteResult.error) {
							logger.warn("failed to clean up temp validation item", { identifier, error: deleteResult.error })
						}

						return { success: true, test }
					})
				)

				for (const result of batchResults) {
					if (result.success) {
						validatedTests.push(result.test)
					} else {
						skippedTests.push(result)
					}
				}

				if (i + VALIDATION_BATCH_SIZE < testCandidates.length) {
					await new Promise((resolve) => setTimeout(resolve, VALIDATION_DELAY_MS))
				}
			}

			for (const result of skippedTests) {
				logger.warn("skipping invalid qti test after ghetto-validate", {
					testId: `nice_${result.test.id}`,
					error: result.error
				})
			}

			const assessmentTests = validatedTests.map((t) => t.xml)

			// 7. Write the final assessmentTests.json file
			await fs.writeFile(path.join(courseDir, "assessmentTests.json"), JSON.stringify(assessmentTests, null, 2))

			logger.info("successfully assembled, validated, and created tests for course", {
				courseSlug,
				validatedItemCount: assessmentItems.length,
				skippedItemCount: skippedItems.length,
				testCount: assessmentTests.length
			})
		}

		return { status: "ASSEMBLY_COMPLETE", assembledCourseCount: courseSlugs.length }
	}
)
