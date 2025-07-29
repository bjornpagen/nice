import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { runValidationPipeline } from "@/lib/perseus-qti/validator"
import { escapeXmlAttribute, replaceRootAttributes } from "@/lib/xml-utils"
import { differentiateQuestion } from "./differentiate-question"
import { paraphraseStimulus } from "./paraphrase-stimulus"

export const differentiatedIngest = inngest.createFunction(
	{
		id: "orchestrate-course-differentiated-ingest-to-qti",
		name: "Orchestrate Differentiated Course Ingestion to QTI"
	},
	{ event: "qti/course.differentiated-ingest" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting differentiated qti json dump workflow", { courseId })

		// Step 1: Fetch all course data (same as original ingest function)
		const units = await db.query.niceUnits.findMany({
			where: eq(schema.niceUnits.courseId, courseId),
			columns: { id: true }
		})
		if (units.length === 0) {
			logger.info("no units found for course", { courseId })
			return { message: "No units found for course", courseId }
		}
		const unitIds = units.map((u) => u.id)

		const [allQuestions, allArticles, allAssessments, allExercises] = await Promise.all([
			// Fetch questions
			db
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
				.where(inArray(schema.niceLessons.unitId, unitIds)),
			// Fetch articles
			db
				.select({ id: schema.niceArticles.id, xml: schema.niceArticles.xml, title: schema.niceArticles.title })
				.from(schema.niceArticles)
				.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
				.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
				.where(inArray(schema.niceLessons.unitId, unitIds)),
			// Fetch assessments (unit and course level)
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
			// Fetch exercises
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

		const questionsByExerciseId = new Map<string, string[]>()
		for (const q of allQuestions) {
			if (!q.xml) throw errors.new(`Question ${q.id} is missing XML.`)
			if (!questionsByExerciseId.has(q.exerciseId)) questionsByExerciseId.set(q.exerciseId, [])
			questionsByExerciseId.get(q.exerciseId)?.push(q.id)
		}

		const assessmentMap = new Map<string, { title: string; exerciseIds: string[] }>()
		for (const row of allAssessments) {
			if (!assessmentMap.has(row.assessmentId)) {
				assessmentMap.set(row.assessmentId, { title: row.assessmentTitle, exerciseIds: [] })
			}
			assessmentMap.get(row.assessmentId)?.exerciseIds.push(row.exerciseId)
		}

		// Process course data directly in function body (not in step.run to avoid size limits)
		const buildTestXml = (id: string, title: string, questionIds: string[]): string => {
			const itemRefsXml = questionIds
				.map((itemId) => `<qti-assessment-item-ref identifier="nice:${itemId}" />`)
				.join("\n")
			return `
          <qti-assessment-test identifier="nice:${id}" title="${escapeXmlAttribute(title)}">
            <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
              <qti-assessment-section identifier="SECTION_1" title="Main Section" visible="true">
                ${itemRefsXml}
              </qti-assessment-section>
            </qti-test-part>
          </qti-assessment-test>
        `
		}

		const originalAssessmentItems = allQuestions.map((q) => ({
			xml: replaceRootAttributes(q.xml || "", "qti-assessment-item", `nice:${q.id}`, q.exerciseTitle),
			metadata: {
				khanId: q.id,
				khanExerciseId: q.exerciseId,
				khanExerciseSlug: q.exerciseSlug,
				khanExerciseTitle: q.exerciseTitle
			}
		}))

		const originalAssessmentStimuli = allArticles.map((a) => ({
			xml: replaceRootAttributes(a.xml || "", "qti-assessment-stimulus", `nice:${a.id}`, a.title),
			metadata: { khanId: a.id }
		}))

		const assessmentTests = Array.from(assessmentMap.entries()).map(([assessmentId, data]) => {
			const questionIds = data.exerciseIds.flatMap((exId) => questionsByExerciseId.get(exId) || [])
			return buildTestXml(assessmentId, data.title, questionIds)
		})

		const exerciseTests = allExercises.map((exercise) => {
			const questionIds = questionsByExerciseId.get(exercise.id) || []
			return buildTestXml(exercise.id, exercise.title, questionIds)
		})

		const originalAssessmentTests = [...assessmentTests, ...exerciseTests]

		// Get the actual course data
		const courseData = await db.query.niceCourses.findFirst({ where: eq(schema.niceCourses.id, courseId) })

		if (!courseData) {
			logger.info("course not found, ending workflow", { courseId })
			return { message: "Course not found." }
		}

		logger.info("fetched course data for differentiation", {
			courseId,
			questionCount: originalAssessmentItems.length,
			stimuliCount: originalAssessmentStimuli.length,
			testCount: originalAssessmentTests.length
		})

		// Step 2: Differentiate all assessment items using batching to avoid response truncation
		logger.info("fanning out question differentiation jobs with batching", {
			questionCount: originalAssessmentItems.length
		})

		// Batch 1: Generate 2 variations (IDs 0001-0002) for each question
		logger.info("starting batch 1: generating 2 variations per question")
		const batch1Invocations = originalAssessmentItems.map((item) =>
			step.invoke(`differentiate-${item.metadata.khanId}-batch1`, {
				function: differentiateQuestion,
				data: {
					questionId: item.metadata.khanId,
					numberOfVariations: 2,
					startingIndex: 1
				}
			})
		)
		const batch1Results = await Promise.all(batch1Invocations)
		logger.info("completed batch 1 differentiation jobs", { completedCount: batch1Results.length })

		// Batch 2: Generate 3 variations (IDs 0003-0005) for each question
		logger.info("starting batch 2: generating 3 variations per question")
		const batch2Invocations = originalAssessmentItems.map((item) =>
			step.invoke(`differentiate-${item.metadata.khanId}-batch2`, {
				function: differentiateQuestion,
				data: {
					questionId: item.metadata.khanId,
					numberOfVariations: 3,
					startingIndex: 3
				}
			})
		)
		const batch2Results = await Promise.all(batch2Invocations)
		logger.info("completed batch 2 differentiation jobs", { completedCount: batch2Results.length })

		// Combine batch results into a single array for downstream processing
		const differentiationResults = originalAssessmentItems.map((item, index) => {
			const batch1Result = batch1Results[index]
			const batch2Result = batch2Results[index]

			// Safety check - ensure results exist
			if (!batch1Result || !batch2Result) {
				return {
					status: "aborted" as const,
					reason: "missing_batch_results",
					questionId: item.metadata.khanId
				}
			}

			// Combine the generated XMLs from both batches
			if (
				batch1Result.status === "success" &&
				batch2Result.status === "success" &&
				"generatedXmls" in batch1Result &&
				"generatedXmls" in batch2Result
			) {
				return {
					status: "success" as const,
					questionId: item.metadata.khanId,
					generatedCount: batch1Result.generatedCount + batch2Result.generatedCount,
					generatedXmls: [...batch1Result.generatedXmls, ...batch2Result.generatedXmls]
				}
			}

			// If either batch failed, return the first error we encounter
			if (batch1Result.status !== "success") {
				return batch1Result
			}
			return batch2Result
		})

		logger.info("completed all question differentiation jobs", {
			completedCount: differentiationResults.length,
			totalVariationsGenerated: differentiationResults
				.filter((r) => r.status === "success" && "generatedCount" in r)
				.reduce((sum, r) => {
					if (r.status === "success" && "generatedCount" in r) {
						return sum + r.generatedCount
					}
					return sum
				}, 0)
		})

		// Step 3: Paraphrase all stimuli
		logger.info("fanning out stimulus paraphrasing jobs", { stimuliCount: originalAssessmentStimuli.length })
		const paraphrasingInvocations = originalAssessmentStimuli.map((stimulus) =>
			step.invoke(`paraphrase-${stimulus.metadata.khanId}`, {
				function: paraphraseStimulus,
				data: {
					articleId: stimulus.metadata.khanId
				}
			})
		)
		const paraphrasingResults = await Promise.all(paraphrasingInvocations)
		logger.info("completed all stimulus paraphrasing jobs", { completedCount: paraphrasingResults.length })

		// Step 4: Aggregate and transform the results
		const aggregationResult = await step.run(
			"aggregate-and-validate-differentiated-items",
			async (): Promise<{
				differentiatedItems: {
					xml: string
					metadata: { khanId: string; khanExerciseId: string; khanExerciseSlug: string; khanExerciseTitle: string }
				}[]
				newToOriginalMap: Map<string, string>
			}> => {
				const items: {
					xml: string
					metadata: { khanId: string; khanExerciseId: string; khanExerciseSlug: string; khanExerciseTitle: string }
				}[] = []
				const newToOriginalMap = new Map<string, string>()

				for (const result of differentiationResults) {
					if (result.status === "success" && "generatedXmls" in result && "questionId" in result) {
						const originalKhanId = result.questionId

						// Find original item metadata to preserve exercise info
						const originalItem = originalAssessmentItems.find((item) => item.metadata.khanId === originalKhanId)
						if (!originalItem) continue

						for (let i = 0; i < result.generatedXmls.length; i++) {
							const variationXml = result.generatedXmls[i]
							if (!variationXml) continue

							// ADD: Validate the generated XML before processing
							const validationResult = await runValidationPipeline(variationXml, {
								id: originalKhanId,
								rootTag: "qti-assessment-item",
								title: originalItem.metadata.khanExerciseTitle,
								logger
								// perseusContent is omitted, allowing for pure XML validation
							})

							if (!validationResult.isValid) {
								logger.warn("discarding invalid qti variation", {
									questionId: originalKhanId,
									variationIndex: i,
									errors: validationResult.errors.map((e: Error) => e.message)
								})
								continue // Skip this invalid variation
							}

							const uniqueCode = (i + 1).toString().padStart(4, "0")
							const newIdentifier = `nice:${originalKhanId}:${uniqueCode}`

							// Ensure the XML has the correct identifier, regardless of what AI generated
							const newXml = variationXml.replace(/identifier="[^"]+"/, `identifier="${newIdentifier}"`)

							items.push({
								xml: newXml,
								metadata: {
									khanId: originalKhanId, // ✅ Keep original khanId (no suffix)
									khanExerciseId: originalItem.metadata.khanExerciseId,
									khanExerciseSlug: originalItem.metadata.khanExerciseSlug,
									khanExerciseTitle: originalItem.metadata.khanExerciseTitle
								}
							})
							newToOriginalMap.set(newIdentifier, `nice:${originalKhanId}`)
						}
					}
				}
				return { differentiatedItems: items, newToOriginalMap }
			}
		)

		const paraphrasedStimuli = await step.run("aggregate-and-validate-paraphrased-stimuli", async () => {
			const successfulResults: { xml: string; metadata: { khanId: string } }[] = []

			for (const r of paraphrasingResults) {
				if (r.status === "success" && "paraphrasedXml" in r && "articleId" in r && r.paraphrasedXml && r.articleId) {
					const originalArticle = allArticles.find((a) => a.id === r.articleId)
					if (!originalArticle) continue

					// ADD: Validate the paraphrased XML
					const validationResult = await runValidationPipeline(r.paraphrasedXml, {
						id: r.articleId,
						rootTag: "qti-assessment-stimulus",
						title: originalArticle.title, // Use original article title for validation context
						logger
						// perseusContent is omitted
					})

					if (!validationResult.isValid) {
						logger.warn("discarding invalid paraphrased stimulus", {
							articleId: r.articleId,
							errors: validationResult.errors.map((e: Error) => e.message)
						})
						continue // Skip invalid stimulus
					}

					successfulResults.push({
						xml: r.paraphrasedXml,
						metadata: { khanId: r.articleId }
					})
				}
			}

			return successfulResults
		})

		// Step 5: Update assessment tests with new item references
		const updatedAssessmentTests = await step.run("update-assessment-tests", () => {
			// Build mapping: original identifier -> array of new identifiers
			const itemMapping = new Map<string, string[]>()

			for (const item of aggregationResult.differentiatedItems) {
				// Extract the new identifier from the XML
				const identifierMatch = item.xml.match(/identifier="([^"]+)"/)
				if (!identifierMatch || !identifierMatch[1]) continue

				const newIdentifier = identifierMatch[1]
				const originalIdentifier = `nice:${item.metadata.khanId}`

				if (!itemMapping.has(originalIdentifier)) {
					itemMapping.set(originalIdentifier, [])
				}
				const identifierArray = itemMapping.get(originalIdentifier)
				if (identifierArray) {
					identifierArray.push(newIdentifier)
				}
			}

			return originalAssessmentTests.map((testXml) => {
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
		})

		// Step 6: Write new files
		await step.run("write-final-files", async () => {
			const courseDir = path.join(process.cwd(), "data", courseData.slug, "qti-differentiated")
			await fs.mkdir(courseDir, { recursive: true })

			await fs.writeFile(
				path.join(courseDir, "assessmentItems.json"),
				JSON.stringify(aggregationResult.differentiatedItems, null, 2)
			)
			await fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(paraphrasedStimuli, null, 2))
			await fs.writeFile(path.join(courseDir, "assessmentTests.json"), JSON.stringify(updatedAssessmentTests, null, 2))
		})

		logger.info("completed differentiated QTI JSON dump workflow", {
			courseId,
			itemsGenerated: aggregationResult.differentiatedItems.length,
			stimuliParaphrased: paraphrasedStimuli.length,
			testsUpdated: updatedAssessmentTests.length
		})

		return {
			message: "Differentiated QTI JSON dump workflow completed successfully.",
			courseId
		}
	}
)
