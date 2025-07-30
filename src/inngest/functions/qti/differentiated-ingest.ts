import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { convertHtmlEntities, stripXmlComments } from "@/lib/perseus-qti/strip"
import { runValidationPipeline } from "@/lib/perseus-qti/validator"
import { escapeXmlAttribute } from "@/lib/xml-utils"
import { differentiateQuestion } from "./differentiate-question"
import { paraphraseStimulus } from "./paraphrase-stimulus"

// Configuration for chunking and performance
const CHUNK_SIZE = 50 // Process 50 questions per chunk for optimal memory/speed balance

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

export const differentiatedIngest = inngest.createFunction(
	{
		id: "orchestrate-course-differentiated-ingest-to-qti",
		name: "Orchestrate Differentiated Course Ingestion to QTI"
	},
	{ event: "qti/course.differentiated-ingest" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting optimized differentiated qti workflow", { courseId })

		// Step 1: Get course data and setup directories
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

		// Step 2: Load course structure and create processing plan
		const units = await db.query.niceUnits.findMany({
			where: eq(schema.niceUnits.courseId, courseId),
			columns: { id: true }
		})

		if (units.length === 0) {
			logger.info("no units found for course", { courseId })
			return { message: "No units found for course", courseId }
		}

		const unitIds = units.map((u) => u.id)

		// Get total counts for planning
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

			logger.info("differentiating chunk questions with single 5-variation calls", {
				chunkIndex,
				questionCount: chunkQuestions.length
			})

			// ✅ FIXED: step.invoke calls at main function level (no nesting)
			const differentiationInvocations = chunkQuestions.map((question) =>
				step.invoke(`differentiate-${question.id}-chunk-${chunkIndex}`, {
					function: differentiateQuestion,
					data: {
						questionId: question.id,
						numberOfVariations: 5,
						startingIndex: 1
					}
				})
			)

			const differentiationResults = await Promise.all(differentiationInvocations)

			// Process and validate results in a separate step
			await step.run(`process-chunk-${chunkIndex}-results`, async () => {
				const validatedItems: {
					xml: string
					metadata: { khanId: string; khanExerciseId: string; khanExerciseSlug: string; khanExerciseTitle: string }
				}[] = []

				for (let i = 0; i < differentiationResults.length; i++) {
					const result = differentiationResults[i]
					const originalQuestion = chunkQuestions[i]

					if (!result || !originalQuestion) continue

					if (result.status === "success" && "generatedXmls" in result && "questionId" in result) {
						for (let variationIndex = 0; variationIndex < result.generatedXmls.length; variationIndex++) {
							let variationXml = result.generatedXmls[variationIndex]
							if (!variationXml) continue

							// Apply XML cleanup functions first
							variationXml = convertHtmlEntities(variationXml, logger)
							variationXml = stripXmlComments(variationXml, logger)

							const validationResult = await errors.try(
								runValidationPipeline(
									variationXml,
									{
										id: originalQuestion.id,
										rootTag: "qti-assessment-item",
										title: originalQuestion.exerciseTitle,
										logger
									},
									// Explicitly skip the solvability check
									{ skip: { solvability: true } }
								)
							)

							if (validationResult.error || !validationResult.data.isValid) {
								logger.warn("ai-generated xml failed validation and will be discarded", {
									questionId: originalQuestion.id,
									chunkIndex,
									variationIndex,
									errors: validationResult.error
										? [validationResult.error.message]
										: validationResult.data.errors.map((e) => e.message)
								})
								continue // Skip this invalid variation
							}

							logger.info("ai-generated xml passed validation", {
								questionId: originalQuestion.id,
								chunkIndex,
								variationIndex
							})

							const uniqueCode = (variationIndex + 1).toString().padStart(4, "0")
							const newIdentifier = `nice_${originalQuestion.id}_${uniqueCode}`
							const newXml = validationResult.data.xml.replace(/identifier="[^"]+"/, `identifier="${newIdentifier}"`)

							validatedItems.push({
								xml: newXml,
								metadata: {
									khanId: originalQuestion.id,
									khanExerciseId: originalQuestion.exerciseId,
									khanExerciseSlug: originalQuestion.exerciseSlug,
									khanExerciseTitle: originalQuestion.exerciseTitle
								}
							})
						}
					} else {
						logger.warn("differentiation failed for question", {
							questionId: originalQuestion.id,
							chunkIndex,
							status: result?.status || "unknown"
						})
					}
				}

				// Write chunk results immediately to disk
				const chunkItemsFile = path.join(
					courseSetup.batchDir,
					`items-chunk-${chunkIndex.toString().padStart(3, "0")}.json`
				)
				await fs.writeFile(chunkItemsFile, JSON.stringify(validatedItems, null, 2))

				logger.info("completed chunk processing", {
					chunkIndex,
					questionsProcessed: chunkQuestions.length,
					itemsGenerated: validatedItems.length
				})

				return validatedItems.length
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

						const validationResult = await errors.try(
							runValidationPipeline(
								paraphrasedXml,
								{
									id: originalStimulus.id,
									rootTag: "qti-assessment-stimulus",
									title: originalStimulus.title,
									logger
								},
								// Explicitly skip the solvability check
								{ skip: { solvability: true } }
							)
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

		// Build question mapping for tests
		const allQuestionIds = await db
			.select({
				id: schema.niceQuestions.id,
				exerciseId: schema.niceQuestions.exerciseId
			})
			.from(schema.niceQuestions)
			.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
			.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
			.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
			.where(inArray(schema.niceLessons.unitId, unitIds))

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

			// Generate assessment tests using data loaded outside step.run
			const questionsByExerciseId = new Map<string, string[]>()
			for (const q of allQuestionIds) {
				if (!questionsByExerciseId.has(q.exerciseId)) questionsByExerciseId.set(q.exerciseId, [])
				questionsByExerciseId.get(q.exerciseId)?.push(q.id)
			}

			const buildTestXml = (id: string, title: string, questionIds: string[]): string => {
				const itemRefsXml = questionIds
					.map((itemId) => `<qti-assessment-item-ref identifier="nice_${itemId}" />`)
					.join("\n")
				return `
              <qti-assessment-test identifier="nice_${id}" title="${escapeXmlAttribute(title)}">
                <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
                  <qti-assessment-section identifier="SECTION_1" title="Main Section" visible="true">
                    ${itemRefsXml}
                  </qti-assessment-section>
                </qti-test-part>
              </qti-assessment-test>
            `
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

			// Build item mapping for test updates
			const itemMapping = new Map<string, string[]>()
			for (const item of allItems) {
				const identifierMatch = item.xml.match(/identifier="([^"]+)"/)
				if (!identifierMatch || !identifierMatch[1]) continue

				const newIdentifier = identifierMatch[1]
				const originalIdentifier = `nice_${item.metadata.khanId}`

				if (!itemMapping.has(originalIdentifier)) {
					itemMapping.set(originalIdentifier, [])
				}
				itemMapping.get(originalIdentifier)?.push(newIdentifier)
			}

			// Update tests with new item references
			const updatedTests = allTests.map((testXml) => {
				const originalItemRefs = [...testXml.matchAll(/<qti-assessment-item-ref identifier="([^"]+)"/g)]
					.map((m) => m[1])
					.filter((ref): ref is string => !!ref)

				if (originalItemRefs.length === 0) return testXml

				let updatedTestXml = testXml
				for (const originalRef of originalItemRefs) {
					const newIdentifiers = itemMapping.get(originalRef)
					if (newIdentifiers && newIdentifiers.length > 0) {
						const newItemRefs = newIdentifiers.map((id) => `<qti-assessment-item-ref identifier="${id}" />`)
						const originalRefTag = `<qti-assessment-item-ref identifier="${originalRef}" />`
						updatedTestXml = updatedTestXml.replace(originalRefTag, newItemRefs.join("\n"))
					}
				}
				return updatedTestXml
			})

			// Write final merged files
			await Promise.all([
				fs.writeFile(path.join(courseSetup.courseDir, "assessmentItems.json"), JSON.stringify(allItems, null, 2)),
				fs.writeFile(path.join(courseSetup.courseDir, "assessmentStimuli.json"), JSON.stringify(allStimuli, null, 2)),
				fs.writeFile(path.join(courseSetup.courseDir, "assessmentTests.json"), JSON.stringify(updatedTests, null, 2))
			])

			return {
				itemsGenerated: allItems.length,
				stimuliGenerated: allStimuli.length,
				testsGenerated: updatedTests.length
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
)
