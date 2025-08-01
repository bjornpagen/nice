import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import {
	convertHtmlEntities,
	fixInequalityOperators,
	fixKhanGraphieUrls,
	fixMathMLOperators,
	stripXmlComments
} from "@/lib/perseus-qti/strip"
import { runValidationPipeline } from "@/lib/perseus-qti/validator"
import { escapeXmlAttribute, replaceRootAttributes } from "@/lib/xml-utils"
import { differentiateQuestion } from "./qti/differentiate-question"
import { paraphraseStimulus } from "./qti/paraphrase-stimulus"

const CHUNK_SIZE = 400

interface DifferentiateQuestionEventData {
	questionId: string
	numberOfVariations: number
	startingIndex?: number
	// AI Quality Review configuration
	qualityReviewConfig?: {
		enabled: boolean
		maxAttempts?: number
		concurrency?: number
	}
}

interface ChunkProgress {
	chunkIndex: number
	questionsProcessed: number
	stimuliProcessed: number
	completed: boolean
	timestamp: string
}

interface ProcessingProgress {
	courseId: string
	totalQuestions: number
	totalStimuli: number
	chunksCompleted: ChunkProgress[]
	lastChunkIndex: number
	startedAt: string
	completedAt?: string
}

export const orchestrateCourseIngestionToQti = inngest.createFunction(
	{
		id: "orchestrate-course-ingestion-to-qti",
		name: "Orchestrate Course Ingestion to QTI (Standard and Differentiated)"
	},
	{ event: "qti/course.ingest" },
	async ({ event, step, logger }) => {
		const { courseId, differentiated } = event.data
		logger.info("starting qti json dump workflow", { courseId, differentiated })

		if (differentiated) {
			// --- DIFFERENTIATED PATH: AI-driven content generation ---
			logger.info("executing differentiated qti generation pipeline", { courseId })

			const courseData = await db.query.niceCourses.findFirst({ where: eq(schema.niceCourses.id, courseId) })
			if (!courseData) {
				throw errors.new("course not found")
			}

			const courseSetup = await step.run("setup-directories", async () => {
				const courseDir = path.join(process.cwd(), "data", courseData.slug, "qti")
				const batchDir = path.join(courseDir, "batches")
				await fs.mkdir(batchDir, { recursive: true })
				return { courseData, courseDir, batchDir }
			})

			const units = await db.query.niceUnits.findMany({
				where: eq(schema.niceUnits.courseId, courseId),
				columns: { id: true }
			})
			if (units.length === 0) {
				return { message: "No units found for course", courseId }
			}
			const unitIds = units.map((u) => u.id)

			logger.info("units fetched for differentiation", {
				unitIds: unitIds,
				unitCount: units.length,
				courseId
			})

			const [questionCount, stimuliCount] = await Promise.all([
				db
					.select({ count: schema.niceQuestions.id })
					.from(schema.niceQuestions)
					.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
					.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
					.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
					.where(inArray(schema.niceLessons.unitId, unitIds)),
				db
					.select({ count: schema.niceArticles.id })
					.from(schema.niceArticles)
					.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
					.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
					.where(inArray(schema.niceLessons.unitId, unitIds))
			])

			const totalQuestions = questionCount.length
			const totalStimuli = stimuliCount.length
			const totalChunks = Math.ceil(totalQuestions / CHUNK_SIZE)

			logger.info("created processing plan", {
				courseId,
				totalQuestions,
				totalStimuli,
				totalChunks,
				chunkSize: CHUNK_SIZE
			})

			// Step 3: Check for existing progress and resume if possible
			const progressFile = path.join(courseSetup.courseDir, "progress.json")
			const existingProgress = await step.run("check-existing-progress", async () => {
				const progressResult = await errors.try(fs.readFile(progressFile, "utf-8"))
				if (progressResult.error) {
					// No existing progress, start fresh
					const newProgress: ProcessingProgress = {
						courseId,
						totalQuestions,
						totalStimuli,
						chunksCompleted: [],
						lastChunkIndex: -1,
						startedAt: new Date().toISOString()
					}
					await fs.writeFile(progressFile, JSON.stringify(newProgress, null, 2))
					return newProgress
				}

				const parseResult = errors.trySync(() => JSON.parse(progressResult.data))
				if (parseResult.error) {
					logger.warn("corrupted progress file, starting fresh", { error: parseResult.error })
					const newProgress: ProcessingProgress = {
						courseId,
						totalQuestions,
						totalStimuli,
						chunksCompleted: [],
						lastChunkIndex: -1,
						startedAt: new Date().toISOString()
					}
					await fs.writeFile(progressFile, JSON.stringify(newProgress, null, 2))
					return newProgress
				}

				logger.info("resuming from existing progress", {
					lastChunkIndex: parseResult.data.lastChunkIndex,
					chunksCompleted: parseResult.data.chunksCompleted.length
				})

				return parseResult.data
			})

			// Step 4: Process question chunks
			for (let chunkIndex = existingProgress.lastChunkIndex + 1; chunkIndex < totalChunks; chunkIndex++) {
				// Load chunk questions OUTSIDE of step.run
				logger.info("loading question chunk", { chunkIndex, totalChunks })
				const offset = chunkIndex * CHUNK_SIZE
				const limit = CHUNK_SIZE

				const chunkQuestions = await db
					.select({
						id: schema.niceQuestions.id,
						xml: schema.niceQuestions.xml,
						exerciseId: schema.niceQuestions.exerciseId,
						exerciseTitle: schema.niceExercises.title,
						exerciseSlug: schema.niceExercises.slug
					})
					.from(schema.niceQuestions)
					.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
					.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
					.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
					.where(inArray(schema.niceLessons.unitId, unitIds))
					.orderBy(schema.niceQuestions.id)
					.limit(limit)
					.offset(offset)

				if (chunkQuestions.length === 0) {
					logger.info("chunk has no questions, skipping", { chunkIndex })
					continue
				}

				// Validate chunk questions have XML
				for (const q of chunkQuestions) {
					if (!q.xml) throw errors.new(`Question ${q.id} is missing XML`)
				}

				logger.info("differentiating chunk questions with self-contained retry logic", {
					chunkIndex,
					questionCount: chunkQuestions.length
				})

				// ✅ SIMPLIFIED: Each differentiate-question call handles its own retries internally
				logger.info("starting differentiation for all questions in parallel", { chunkIndex })
				const differentiationInvocations = chunkQuestions.map((question) =>
					step.invoke(`differentiate-${question.id}-chunk-${chunkIndex}`, {
						function: differentiateQuestion,
						data: {
							questionId: question.id,
							numberOfVariations: 4, // Generate 4 variations per question
							// Enable AI Quality Review pipeline
							qualityReviewConfig: {
								enabled: true // Enable the quality review pipeline
							}
						} satisfies DifferentiateQuestionEventData
					})
				)
				const differentiationResults = await Promise.all(differentiationInvocations)

				// Store results in a separate step
				await step.run(`store-chunk-${chunkIndex}-results`, async () => {
					// Collect all validated items from differentiation results
					const allValidatedItems: {
						xml: string
						metadata: { khanId: string; khanExerciseId: string; khanExerciseSlug: string; khanExerciseTitle: string }
					}[] = []

					for (const result of differentiationResults) {
						if (result?.status === "success" && "validatedItems" in result && Array.isArray(result.validatedItems)) {
							for (const item of result.validatedItems) {
								if (item?.xml && item.metadata) {
									allValidatedItems.push(item)
								}
							}
						}
					}

					// Write chunk results immediately to disk
					const chunkItemsFile = path.join(
						courseSetup.batchDir,
						`items-chunk-${chunkIndex.toString().padStart(3, "0")}.json`
					)
					await fs.writeFile(chunkItemsFile, JSON.stringify(allValidatedItems, null, 2))

					const questionsWithTargetVariations = differentiationResults.filter(
						(r) => r?.status === "success" && "validatedCount" in r && r.validatedCount >= 4
					).length

					logger.info("completed chunk processing with self-contained retry logic", {
						chunkIndex,
						questionsProcessed: chunkQuestions.length,
						itemsGenerated: allValidatedItems.length,
						targetItemsExpected: chunkQuestions.length * 4,
						successRate: `${((allValidatedItems.length / (chunkQuestions.length * 4)) * 100).toFixed(1)}%`,
						questionsWithTargetVariations
					})

					return allValidatedItems.length
				})

				// Update progress
				const updatedProgress = {
					...existingProgress,
					lastChunkIndex: chunkIndex,
					chunksCompleted: [
						...existingProgress.chunksCompleted,
						{
							chunkIndex,
							questionsProcessed: chunkQuestions.length,
							stimuliProcessed: 0, // Will be updated in stimuli processing
							completed: true,
							timestamp: new Date().toISOString()
						}
					]
				}

				await step.run(`update-progress-${chunkIndex}`, async () => {
					await fs.writeFile(progressFile, JSON.stringify(updatedProgress, null, 2))
					return true
				})

				// Update the existingProgress reference for next iteration
				existingProgress.lastChunkIndex = chunkIndex
				existingProgress.chunksCompleted = updatedProgress.chunksCompleted
			}

			// Step 5: Process stimuli in chunks (separate from questions for memory efficiency)
			// Load all stimuli OUTSIDE of step.run
			const allStimuli = await db
				.select({ id: schema.niceArticles.id, xml: schema.niceArticles.xml, title: schema.niceArticles.title })
				.from(schema.niceArticles)
				.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
				.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
				.where(inArray(schema.niceLessons.unitId, unitIds))

			const stimuliChunkSize = 25 // Smaller chunks for stimuli
			const totalStimuliChunks = Math.ceil(allStimuli.length / stimuliChunkSize)

			logger.info("processing stimuli in chunks", { totalStimuliChunks, stimuliCount: allStimuli.length })

			for (let chunkIndex = 0; chunkIndex < totalStimuliChunks; chunkIndex++) {
				const offset = chunkIndex * stimuliChunkSize
				const chunkStimuli = allStimuli.slice(offset, offset + stimuliChunkSize)

				logger.info("processing stimuli chunk", { chunkIndex, stimuliCount: chunkStimuli.length })

				// ✅ FIXED: step.invoke calls at main function level (no nesting)
				const paraphrasingInvocations = chunkStimuli.map((stimulus) =>
					step.invoke(`paraphrase-${stimulus.id}-chunk-${chunkIndex}`, {
						function: paraphraseStimulus,
						data: { articleId: stimulus.id }
					})
				)

				const paraphrasingResults = await Promise.all(paraphrasingInvocations)

				// Process results in a separate step
				await step.run(`process-stimuli-chunk-${chunkIndex}-results`, async () => {
					const validatedStimuli: { xml: string; metadata: { khanId: string } }[] = []

					for (let i = 0; i < paraphrasingResults.length; i++) {
						const result = paraphrasingResults[i]
						const originalStimulus = chunkStimuli[i]

						if (!result || !originalStimulus) continue

						if (result.status === "success" && "paraphrasedXml" in result && result.paraphrasedXml) {
							// Apply XML cleanup functions first
							let paraphrasedXml = result.paraphrasedXml
							paraphrasedXml = convertHtmlEntities(paraphrasedXml, logger)
							paraphrasedXml = stripXmlComments(paraphrasedXml, logger)
							paraphrasedXml = fixMathMLOperators(paraphrasedXml, logger)
							paraphrasedXml = fixInequalityOperators(paraphrasedXml, logger)
							paraphrasedXml = fixKhanGraphieUrls(paraphrasedXml, logger)

							const validationResult = await errors.try(
								runValidationPipeline(paraphrasedXml, {
									id: originalStimulus.id,
									rootTag: "qti-assessment-stimulus",
									title: originalStimulus.title,
									logger
								})
							)

							if (validationResult.error || !validationResult.data.isValid) {
								logger.warn("ai-generated stimulus xml failed validation and will be discarded", {
									articleId: originalStimulus.id,
									chunkIndex,
									errors: validationResult.error
										? [validationResult.error.message]
										: validationResult.data.errors.map((e) => e.message)
								})
								continue // Skip this invalid stimulus
							}

							logger.info("ai-generated stimulus xml passed validation", {
								articleId: originalStimulus.id,
								chunkIndex
							})

							validatedStimuli.push({
								xml: validationResult.data.xml,
								metadata: { khanId: originalStimulus.id }
							})
						}
					}

					// Write stimuli chunk to disk
					const chunkStimuliFile = path.join(
						courseSetup.batchDir,
						`stimuli-chunk-${chunkIndex.toString().padStart(3, "0")}.json`
					)
					await fs.writeFile(chunkStimuliFile, JSON.stringify(validatedStimuli, null, 2))

					logger.info("completed stimuli chunk", { chunkIndex, stimuliProcessed: validatedStimuli.length })
					return validatedStimuli.length
				})
			}

			// Step 6: Load assessment data OUTSIDE step.run
			const [allAssessments, allExercises] = await Promise.all([
				db
					.select({
						assessmentId: schema.niceAssessments.id,
						assessmentTitle: schema.niceAssessments.title,
						exerciseId: schema.niceAssessmentExercises.exerciseId
					})
					.from(schema.niceAssessments)
					.innerJoin(
						schema.niceAssessmentExercises,
						eq(schema.niceAssessments.id, schema.niceAssessmentExercises.assessmentId)
					)
					.where(
						and(
							inArray(schema.niceAssessments.parentId, [...unitIds, courseId]),
							inArray(schema.niceAssessments.parentType, ["Unit", "Course"])
						)
					),
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

			// Note: No longer need allQuestionIds since we use allItems metadata directly

			// Step 7: Merge all chunks and generate final files
			const finalResults = await step.run("merge-chunks-and-generate-tests", async () => {
				logger.info("merging all chunks into final files")

				// Merge all item chunks
				const allItems: {
					xml: string
					metadata: { khanId: string; khanExerciseId: string; khanExerciseSlug: string; khanExerciseTitle: string }
				}[] = []

				const itemChunkFiles = await fs.readdir(courseSetup.batchDir)
				const itemFiles = itemChunkFiles.filter((f) => f.startsWith("items-chunk-")).sort()

				for (const file of itemFiles) {
					const chunkData = await fs.readFile(path.join(courseSetup.batchDir, file), "utf-8")
					const chunkItems = JSON.parse(chunkData)
					allItems.push(...chunkItems)
				}

				// Merge all stimuli chunks
				const allStimuli: { xml: string; metadata: { khanId: string } }[] = []
				const stimuliFiles = itemChunkFiles.filter((f) => f.startsWith("stimuli-chunk-")).sort()

				for (const file of stimuliFiles) {
					const chunkData = await fs.readFile(path.join(courseSetup.batchDir, file), "utf-8")
					const chunkStimuli = JSON.parse(chunkData)
					allStimuli.push(...chunkStimuli)
				}

				// Generate assessment tests using differentiated items metadata
				const questionsByExerciseId = new Map<string, string[]>()
				for (const item of allItems) {
					const exerciseId = item.metadata.khanExerciseId
					const itemIdMatch = item.xml.match(/identifier="nice_([^"]+)"/)
					const itemId = itemIdMatch?.[1]

					if (itemId) {
						if (!questionsByExerciseId.has(exerciseId)) {
							questionsByExerciseId.set(exerciseId, [])
						}
						questionsByExerciseId.get(exerciseId)?.push(itemId)
					}
				}

				// CRITICAL: Validate differentiation scope coverage
				logger.info("differentiation mapping completed", {
					exercisesWithDifferentiatedItems: questionsByExerciseId.size,
					totalExercisesInScope: allExercises.length,
					totalItemsGenerated: allItems.length
				})

				// Identify exercises missing from differentiation
				const exercisesWithoutItems = allExercises.filter((exercise) => !questionsByExerciseId.has(exercise.id))
				if (exercisesWithoutItems.length > 0) {
					logger.error("CRITICAL: exercises missing from differentiation - will cause empty tests", {
						missingExerciseCount: exercisesWithoutItems.length,
						missingExerciseIds: exercisesWithoutItems.map((e) => e.id),
						missingExerciseTitles: exercisesWithoutItems.map((e) => e.title),
						totalExercises: allExercises.length,
						processedExercises: questionsByExerciseId.size
					})
					throw errors.new(
						`scope mismatch: ${exercisesWithoutItems.length} exercises missing from differentiation scope`
					)
				}

				const buildTestXml = (id: string, title: string, questionIds: string[]): string => {
					const safeTitle = escapeXmlAttribute(title)

					// Group by exercise ID using metadata
					const questionsByExercise = new Map<string, { title: string; questionIds: string[] }>()

					for (const questionId of questionIds) {
						// Find the item with this ID to get its exercise metadata
						const item = allItems.find((item) => {
							const match = item.xml.match(/identifier="nice_([^"]+)"/)
							return match?.[1] === questionId
						})

						if (item) {
							const exerciseId = item.metadata.khanExerciseId
							const exerciseTitle = item.metadata.khanExerciseTitle

							if (!questionsByExercise.has(exerciseId)) {
								questionsByExercise.set(exerciseId, { title: exerciseTitle, questionIds: [] })
							}
							questionsByExercise.get(exerciseId)?.questionIds.push(questionId)
						}
					}

					// Detect if this is an exercise test (single exercise) or assessment test (multiple exercises)
					const isExerciseTest = questionsByExercise.size === 1

					if (isExerciseTest) {
						// EXERCISE TEST: Single section, select 5 questions from all differentiated versions
						const firstEntry = Array.from(questionsByExercise.entries())[0]
						if (!firstEntry) {
							throw errors.new("Exercise test has no questions")
						}
						const [_firstExerciseId, exerciseData] = firstEntry
						const itemRefsXml = exerciseData.questionIds
							.map(
								(itemId: string, index: number) =>
									`<qti-assessment-item-ref identifier="nice_${itemId}" href="/assessment-items/nice_${itemId}" sequence="${index + 1}"></qti-assessment-item-ref>`
							)
							.join("\n                ")

						const selectCount = Math.min(5, exerciseData.questionIds.length)

						return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${id}" title="${safeTitle}">
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0.0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
        <qti-assessment-section identifier="SECTION_${id}" title="${safeTitle}" visible="true">
            <qti-selection select="${selectCount}" with-replacement="false"/>
            <qti-ordering shuffle="true"/>
            ${itemRefsXml}
        </qti-assessment-section>
    </qti-test-part>
</qti-assessment-test>`
					}
					// ASSESSMENT TEST: Multiple sections, 2 questions per exercise
					const sectionsXml = Array.from(questionsByExercise.entries())
						.map(([exerciseId, { title: exerciseTitle, questionIds: exerciseQuestionIds }]) => {
							const safeExerciseTitle = escapeXmlAttribute(exerciseTitle)
							const itemRefsXml = exerciseQuestionIds
								.map(
									(itemId: string, itemIndex: number) =>
										`<qti-assessment-item-ref identifier="nice_${itemId}" href="/assessment-items/nice_${itemId}" sequence="${itemIndex + 1}"></qti-assessment-item-ref>`
								)
								.join("\n                ")

							const selectCount = Math.min(2, exerciseQuestionIds.length)

							return `        <qti-assessment-section identifier="SECTION_${exerciseId}" title="${safeExerciseTitle}" visible="false">
            <qti-selection select="${selectCount}" with-replacement="false"/>
            <qti-ordering shuffle="true"/>
            ${itemRefsXml}
        </qti-assessment-section>`
						})
						.join("\n")

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

				const assessmentMap = new Map<string, { title: string; exerciseIds: string[] }>()
				for (const row of allAssessments) {
					if (!assessmentMap.has(row.assessmentId)) {
						assessmentMap.set(row.assessmentId, { title: row.assessmentTitle, exerciseIds: [] })
					}
					assessmentMap.get(row.assessmentId)?.exerciseIds.push(row.exerciseId)
				}

				const assessmentTests = Array.from(assessmentMap.entries()).map(([assessmentId, data]) => {
					const questionIds = data.exerciseIds.flatMap((exId) => questionsByExerciseId.get(exId) || [])
					return buildTestXml(assessmentId, data.title, questionIds)
				})

				const exerciseTests = allExercises.map((exercise) => {
					const questionIds = questionsByExerciseId.get(exercise.id) || []
					return buildTestXml(exercise.id, exercise.title, questionIds)
				})

				const allTests = [...assessmentTests, ...exerciseTests]

				// Write final merged files
				await Promise.all([
					fs.writeFile(path.join(courseSetup.courseDir, "assessmentItems.json"), JSON.stringify(allItems, null, 2)),
					fs.writeFile(path.join(courseSetup.courseDir, "assessmentStimuli.json"), JSON.stringify(allStimuli, null, 2)),
					fs.writeFile(path.join(courseSetup.courseDir, "assessmentTests.json"), JSON.stringify(allTests, null, 2))
				])

				return {
					itemsGenerated: allItems.length,
					stimuliGenerated: allStimuli.length,
					testsGenerated: allTests.length
				}
			})

			// Step 8: Cleanup and finalize
			await step.run("cleanup-and-finalize", async () => {
				// Update final progress
				const finalProgress = {
					...existingProgress,
					completedAt: new Date().toISOString()
				}
				await fs.writeFile(progressFile, JSON.stringify(finalProgress, null, 2))

				// Optionally clean up batch files to save disk space
				// await fs.rm(courseSetup.batchDir, { recursive: true })

				logger.info("differentiated ingest workflow completed successfully", {
					courseId,
					itemsGenerated: finalResults.itemsGenerated,
					stimuliGenerated: finalResults.stimuliGenerated,
					testsGenerated: finalResults.testsGenerated
				})
			})

			return {
				message: "Optimized differentiated QTI workflow completed successfully.",
				courseId,
				...finalResults
			}
		}

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
		const items = allQuestions.map((q) => {
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
			const allQuestionsForTest = questionIds.map((id) => {
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
			const questionIds = questionsByExerciseId.get(exercise.id) || []

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
