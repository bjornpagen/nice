import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { generateQtiVariations } from "@/lib/ai/openai"
import { convertHtmlEntities, fixMathMLOperators, stripXmlComments } from "@/lib/perseus-qti/strip"
import { runValidationPipeline } from "@/lib/perseus-qti/validator"

export const differentiateQuestion = inngest.createFunction(
	{
		id: "differentiate-qti-question",
		name: "Differentiate QTI Question using AI",
		concurrency: {
			// ✅ MASSIVE INCREASE: Allow all 75 questions in chunk to run concurrently
			limit: 100
		}
	},
	{ event: "qti/question.differentiate" },
	async ({ event, step, logger }) => {
		const { questionId, numberOfVariations } = event.data
		logger.info("starting qti question differentiation with internal retry logic", { questionId, numberOfVariations })

		// Step 1: Fetch the source QTI XML and exercise metadata from the database (OUTSIDE step.run)
		const result = await errors.try(
			db
				.select({
					xml: schema.niceQuestions.xml,
					exerciseId: schema.niceQuestions.exerciseId,
					exerciseTitle: schema.niceExercises.title,
					exerciseSlug: schema.niceExercises.slug
				})
				.from(schema.niceQuestions)
				.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
				.where(eq(schema.niceQuestions.id, questionId))
				.limit(1)
		)
		if (result.error) {
			logger.error("failed to fetch source question from db", { error: result.error, questionId })
			throw errors.wrap(result.error, "db query for source question")
		}

		const sourceData = result.data[0]
		if (!sourceData?.xml) {
			logger.warn("source question not found or has no XML", { questionId })
			return { status: "aborted", reason: "source_question_not_found_or_empty", validatedItems: [] }
		}

		logger.info("successfully fetched source question", { questionId })

		// Step 2: Internal retry logic to ensure requested number of validated variations
		const validatedItems = await step.run("generate-and-validate-variations", async () => {
			const MAX_ATTEMPTS = 3
			const TARGET_VARIATIONS = numberOfVariations
			const items: {
				xml: string
				metadata: { khanId: string; khanExerciseId: string; khanExerciseSlug: string; khanExerciseTitle: string }
			}[] = []
			let accumulatedErrors: string[] = []

			for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
				const variationsNeeded = TARGET_VARIATIONS - items.length
				if (variationsNeeded <= 0) {
					logger.info("target variations achieved", { questionId, attempt, validatedCount: items.length })
					break
				}

				logger.info("generating variations", {
					questionId,
					attempt,
					variationsNeeded,
					accumulatedErrorCount: accumulatedErrors.length
				})

				// Generate variations with AI, passing accumulated errors from previous attempts
				const generatedXmls = await generateQtiVariations(
					sourceData.xml || "",
					variationsNeeded,
					questionId,
					items.length + 1, // startingIndex
					accumulatedErrors.length > 0 ? accumulatedErrors : undefined
				)

				if (generatedXmls.length === 0) {
					logger.warn("ai returned no variations", { questionId, attempt })
					continue
				}

				// Validate each generated variation
				for (let variationIndex = 0; variationIndex < generatedXmls.length; variationIndex++) {
					let variationXml = generatedXmls[variationIndex]
					if (!variationXml) continue

					// Apply XML cleanup functions first
					variationXml = convertHtmlEntities(variationXml, logger)
					variationXml = stripXmlComments(variationXml, logger)
					variationXml = fixMathMLOperators(variationXml, logger)

					const validationResult = await errors.try(
						runValidationPipeline(variationXml, {
							id: questionId,
							rootTag: "qti-assessment-item",
							title: sourceData.exerciseTitle || "Unknown Exercise",
							logger
						})
					)

					if (validationResult.error || !validationResult.data.isValid) {
						const errorMessages = validationResult.error
							? [validationResult.error.message]
							: validationResult.data.errors.map((e) => e.message)

						accumulatedErrors.push(...errorMessages)
						logger.warn("ai-generated xml failed validation", {
							questionId,
							attempt,
							variationIndex,
							errorMessages,
							totalAccumulatedErrors: accumulatedErrors.length
						})
						continue // Skip this invalid variation
					}

					logger.info("ai-generated xml passed validation", {
						questionId,
						attempt,
						variationIndex,
						validatedCount: items.length + 1
					})

					// Generate unique identifier
					const uniqueCode = (items.length + 1).toString().padStart(4, "0")
					const newIdentifier = `nice_${questionId}_${uniqueCode}`
					const newXml = validationResult.data.xml.replace(/identifier="[^"]+"/, `identifier="${newIdentifier}"`)

					// Add to validated items
					items.push({
						xml: newXml,
						metadata: {
							khanId: questionId,
							khanExerciseId: sourceData.exerciseId || "",
							khanExerciseSlug: sourceData.exerciseSlug || "",
							khanExerciseTitle: sourceData.exerciseTitle || "Unknown Exercise"
						}
					})

					// Check if we've reached our target
					if (items.length >= TARGET_VARIATIONS) {
						logger.info("target variations achieved mid-generation", {
							questionId,
							attempt,
							validatedCount: items.length
						})
						break
					}
				}

				// Log attempt completion
				logger.info("completed attempt", {
					questionId,
					attempt,
					validatedCount: items.length,
					targetCount: TARGET_VARIATIONS,
					accumulatedErrorCount: accumulatedErrors.length
				})
			}

			logger.info("completed all differentiation attempts", {
				questionId,
				finalValidatedCount: items.length,
				targetCount: TARGET_VARIATIONS,
				successRate: `${((items.length / TARGET_VARIATIONS) * 100).toFixed(1)}%`
			})

			return items
		})

		return {
			status: "success",
			questionId,
			validatedCount: validatedItems.length,
			validatedItems
		}
	}
)
