import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { generateQtiVariations } from "@/lib/ai/openai"
import { type QtiSourceContext, reviewAndImproveQtiQuestions } from "@/lib/ai/quality-review"
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
		const qualityReviewConfig = event.data.qualityReviewConfig // Optional, may be undefined
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

		// Create source context for the AI quality reviewer
		const sourceContext: QtiSourceContext = {
			khanId: questionId,
			exerciseId: sourceData.exerciseId,
			exerciseSlug: sourceData.exerciseSlug,
			exerciseTitle: sourceData.exerciseTitle,
			gradeLevel: "2nd Grade" // Assuming 2nd grade for now, can be parameterized later
		}

		// Step 2: Internal retry logic with 3-stage pipeline (Generate → Review → Validate)
		const validatedItems = await step.run("generate-review-and-validate-variations", async () => {
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

				logger.info("starting 3-stage pipeline", {
					questionId,
					attempt,
					variationsNeeded,
					accumulatedErrorCount: accumulatedErrors.length
				})

				// STAGE 1: GENERATE - Generate all variations first
				logger.info("stage 1: generating variations", {
					questionId,
					attempt,
					variationsNeeded
				})

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

				// STAGE 2: REVIEW - Always pass ALL generated variations to quality review (if enabled)
				let processedXmls = generatedXmls
				let reviewErrors: string[] = []

				if (qualityReviewConfig?.enabled) {
					logger.info("stage 2: ai quality review for all variations", {
						questionId,
						attempt,
						generatedCount: generatedXmls.length
					})

					const reviewResult = await errors.try(reviewAndImproveQtiQuestions(generatedXmls, sourceContext))

					if (reviewResult.error) {
						logger.error("ai quality review failed for batch", {
							questionId,
							attempt,
							error: reviewResult.error
						})
						accumulatedErrors.push(`Batch AI review failed: ${reviewResult.error.message}`)
						continue // Restart attempt
					}

					const reviewResults = reviewResult.data
					processedXmls = reviewResults.map((r) => r.improvedXml)
					reviewErrors = reviewResults.flatMap((r) => r.analysisFindings?.issuesFound.map((i) => i.description) ?? [])

					logger.info("stage 2: completed ai quality review", {
						questionId,
						attempt,
						improvedCount: processedXmls.length,
						detectedIssues: reviewErrors.length,
						qualityRatings: reviewResults.map((r) => r.analysisFindings?.overallQuality)
					})
				} else {
					logger.info("stage 2: skipping quality review (disabled)", {
						questionId,
						attempt
					})
				}

				// STAGE 3: VALIDATE - Validate ALL processed variations
				logger.info("stage 3: validating all processed variations", {
					questionId,
					attempt,
					variationCount: processedXmls.length
				})

				let validationFailures = 0
				let stagingItems: typeof items = []

				for (let variationIndex = 0; variationIndex < processedXmls.length; variationIndex++) {
					let variationXml = processedXmls[variationIndex]
					if (!variationXml) {
						validationFailures++
						continue
					}

					// Apply XML cleanup functions
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
						const validationErrors = validationResult.error
							? [validationResult.error.message]
							: validationResult.data.errors.map((e) => e.message)

						logger.warn("stage 3: validation failed for variation", {
							questionId,
							attempt,
							variationIndex,
							validationErrors
						})

						// Accumulate all errors from this attempt
						accumulatedErrors.push(...reviewErrors, ...validationErrors)
						validationFailures++
						continue
					}

					logger.info("stage 3: validation passed for variation", {
						questionId,
						attempt,
						variationIndex
					})

					// Generate unique identifier
					const uniqueCode = (stagingItems.length + items.length + 1).toString().padStart(4, "0")
					const newIdentifier = `nice_${questionId}_${uniqueCode}`
					const newXml = validationResult.data.xml.replace(/identifier="[^"]+"/, `identifier="${newIdentifier}"`)

					// Add to staging (will be committed if all succeed)
					stagingItems.push({
						xml: newXml,
						metadata: {
							khanId: questionId,
							khanExerciseId: sourceData.exerciseId || "",
							khanExerciseSlug: sourceData.exerciseSlug || "",
							khanExerciseTitle: sourceData.exerciseTitle || "Unknown Exercise"
						}
					})
				}

				// Commit successful variations
				items.push(...stagingItems)

				logger.info("completed 3-stage pipeline attempt", {
					questionId,
					attempt,
					generated: generatedXmls.length,
					processed: processedXmls.length,
					validated: stagingItems.length,
					failed: validationFailures,
					totalValidated: items.length,
					targetCount: TARGET_VARIATIONS
				})

				// Check if we've reached our target
				if (items.length >= TARGET_VARIATIONS) {
					logger.info("target variations achieved", {
						questionId,
						attempt,
						validatedCount: items.length
					})
					break
				}
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
