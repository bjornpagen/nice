#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { KhanAcademyClient, type QuestionInfo } from "@/lib/khan-academy-api"

logger.setDefaultLogLevel(logger.DEBUG)

// Configuration
const KHAN_ACADEMY_COOKIE =
	'browsing_session_id=_en_bsid_32eabce3-6cd7-4c17-82bb-d5b3c6980001; LIS=www; KAAS=jrq9yFJ1WyFbUimeVG_mMw; KAAL=$FaCVSQbgqpg-ReuvYooEpkHDXw8RifEzxCPKpJakiz4.~syu253$a2FpZF8xMTg2NTk5ODQyNDYwNjE0MDE2MTAzMjc*; KAAC=$FzYq2uBMA-XdkCV0lp9UFP9BRQOyQDlsxLSATzx3w38.~syu253$a2FpZF8xMTg2NTk5ODQyNDYwNjE0MDE2MTAzMjc*$a2FpZF8xMTg2NTk5ODQyNDYwNjE0MDE2MTAzMjc\u00210\u00210$~4; browsing_session_expiry="Thu, 03 Jul 2025 17:35:27 UTC"'

export interface QuestionDiscoveryStrategy {
	name: string
	description: string
	execute(apiClient: KhanAcademyClient, exerciseId: string, ancestorIds: string[]): Promise<Set<string>>
}

export class StandardPracticeTaskStrategy implements QuestionDiscoveryStrategy {
	name = "standard-practice-task"
	description = "Creates a single practice task and extracts item IDs"

	async execute(apiClient: KhanAcademyClient, exerciseId: string, ancestorIds: string[]): Promise<Set<string>> {
		logger.debug("executing standard practice task strategy", { exerciseId })

		const taskResult = await errors.try(apiClient.getOrCreatePracticeTask(exerciseId, ancestorIds))
		if (taskResult.error) {
			logger.error("failed to create practice task", { exerciseId, error: taskResult.error })
			throw errors.wrap(taskResult.error, "practice task creation failed")
		}

		const userTask = taskResult.data.data.getOrCreatePracticeTask.result.userTask
		if (!userTask) {
			logger.warn("practice task response contained no userTask", { exerciseId })
			return new Set()
		}

		const userExercises = userTask.userExercises
		if (userExercises.length === 0) {
			logger.warn("practice task has no userExercises array", { exerciseId })
			return new Set()
		}

		const problemTypes = userExercises[0]?.exerciseModel?.problemTypes
		if (!problemTypes || problemTypes.length === 0) {
			logger.warn("exercise contains no problem types", { exerciseId })
			return new Set()
		}

		const itemIds = new Set<string>()

		// Iterate through ALL problem types, not just the first one
		for (let i = 0; i < problemTypes.length; i++) {
			const problemType = problemTypes[i]
			const items = problemType?.items || []

			logger.debug("processing problem type", {
				exerciseId,
				problemTypeIndex: i,
				itemCount: items.length
			})

			for (const item of items) {
				itemIds.add(item.id)
			}
		}

		logger.debug("discovered items via standard practice task", {
			exerciseId,
			count: itemIds.size,
			problemTypesFound: problemTypes.length
		})
		return itemIds
	}
}

export class MultiplePracticeTaskStrategy implements QuestionDiscoveryStrategy {
	name = "multiple-practice-tasks"
	description = "Creates multiple practice tasks to potentially discover different question sets"

	constructor(private attempts = 5) {}

	async execute(apiClient: KhanAcademyClient, exerciseId: string, ancestorIds: string[]): Promise<Set<string>> {
		logger.debug("executing multiple practice task strategy", { exerciseId, attempts: this.attempts })

		const allItemIds = new Set<string>()

		for (let i = 0; i < this.attempts; i++) {
			logger.debug("creating practice task attempt", { exerciseId, attempt: i + 1 })

			// Add some delay between attempts to simulate different user sessions
			if (i > 0) {
				await new Promise((resolve) => setTimeout(resolve, 1000))
			}

			const taskResult = await errors.try(apiClient.getOrCreatePracticeTask(exerciseId, ancestorIds))
			if (taskResult.error) {
				logger.warn("practice task creation failed on attempt", { exerciseId, attempt: i + 1, error: taskResult.error })
				continue
			}

			const userTask = taskResult.data.data.getOrCreatePracticeTask.result.userTask
			if (!userTask?.userExercises?.[0]?.exerciseModel?.problemTypes) {
				logger.warn("no problem types in practice task attempt", { exerciseId, attempt: i + 1 })
				continue
			}

			const problemTypes = userTask.userExercises[0].exerciseModel.problemTypes
			const previousSize = allItemIds.size
			let itemsThisAttempt = 0

			// Iterate through ALL problem types, not just the first one
			for (let ptIndex = 0; ptIndex < problemTypes.length; ptIndex++) {
				const problemType = problemTypes[ptIndex]
				const items = problemType?.items || []

				for (const item of items) {
					allItemIds.add(item.id)
					itemsThisAttempt++
				}
			}

			const newItemsFound = allItemIds.size - previousSize
			logger.debug("practice task attempt results", {
				exerciseId,
				attempt: i + 1,
				itemsThisAttempt,
				newItemsFound,
				totalUniqueItems: allItemIds.size,
				problemTypesProcessed: problemTypes.length
			})
		}

		logger.debug("completed multiple practice task strategy", {
			exerciseId,
			totalAttempts: this.attempts,
			totalUniqueItems: allItemIds.size
		})

		return allItemIds
	}
}

export class ExerciseMetadataStrategy implements QuestionDiscoveryStrategy {
	name = "exercise-metadata"
	description = "Attempts to discover items through exercise metadata endpoints"

	async execute(_apiClient: KhanAcademyClient, exerciseId: string, _ancestorIds: string[]): Promise<Set<string>> {
		logger.debug("executing exercise metadata strategy", { exerciseId })

		// This is speculative - khan academy might have other endpoints that expose item counts or metadata
		// You'd need to explore their GraphQL schema or network requests to find these

		// For now, this is a placeholder that returns empty set
		// but shows where you'd implement alternative discovery methods

		logger.debug("exercise metadata strategy not yet implemented", { exerciseId })
		return new Set()
	}
}

export class ComprehensiveQuestionExtractor {
	private strategies: QuestionDiscoveryStrategy[]

	constructor() {
		this.strategies = [
			new StandardPracticeTaskStrategy(),
			new MultiplePracticeTaskStrategy(10), // Try 10 times
			new ExerciseMetadataStrategy()
		]
	}

	async discoverAllQuestionIds(
		apiClient: KhanAcademyClient,
		exerciseId: string,
		ancestorIds: string[]
	): Promise<{ allItemIds: Set<string>; strategyResults: Map<string, Set<string>> }> {
		logger.info("starting comprehensive question discovery", { exerciseId })

		const allItemIds = new Set<string>()
		const strategyResults = new Map<string, Set<string>>()

		for (const strategy of this.strategies) {
			logger.info("executing discovery strategy", {
				exerciseId,
				strategy: strategy.name,
				description: strategy.description
			})

			const strategyResult = await errors.try(strategy.execute(apiClient, exerciseId, ancestorIds))
			if (strategyResult.error) {
				logger.error("strategy execution failed", {
					exerciseId,
					strategy: strategy.name,
					error: strategyResult.error
				})
				strategyResults.set(strategy.name, new Set())
				continue
			}

			const itemIds = strategyResult.data
			strategyResults.set(strategy.name, itemIds)

			const previousSize = allItemIds.size
			for (const itemId of itemIds) {
				allItemIds.add(itemId)
			}
			const newItemsFound = allItemIds.size - previousSize

			logger.info("strategy completed", {
				exerciseId,
				strategy: strategy.name,
				itemsFromStrategy: itemIds.size,
				newItemsFound,
				totalUniqueItems: allItemIds.size
			})
		}

		logger.info("comprehensive question discovery completed", {
			exerciseId,
			totalUniqueItems: allItemIds.size,
			strategiesExecuted: this.strategies.length
		})

		return { allItemIds, strategyResults }
	}

	async fetchAllQuestions(
		apiClient: KhanAcademyClient,
		exerciseId: string,
		ancestorIds: string[],
		maxConcurrency = 10
	): Promise<{ questions: QuestionInfo[]; discoveryReport: Record<string, unknown> }> {
		const discoveryResult = await this.discoverAllQuestionIds(apiClient, exerciseId, ancestorIds)
		const { allItemIds, strategyResults } = discoveryResult

		if (allItemIds.size === 0) {
			logger.warn("no question items discovered for exercise", { exerciseId })
			return {
				questions: [],
				discoveryReport: {
					totalItems: 0,
					strategyResults: Object.fromEntries(strategyResults.entries().map(([k, v]) => [k, v.size]))
				}
			}
		}

		logger.info("fetching all discovered questions", { exerciseId, totalItems: allItemIds.size })

		const allQuestions: QuestionInfo[] = []
		const itemIdsArray = Array.from(allItemIds)

		// Process in chunks to respect rate limits
		for (let i = 0; i < itemIdsArray.length; i += maxConcurrency) {
			const chunk = itemIdsArray.slice(i, i + maxConcurrency)
			logger.debug("fetching chunk of assessment items", {
				exerciseId,
				chunk: Math.floor(i / maxConcurrency) + 1,
				totalChunks: Math.ceil(itemIdsArray.length / maxConcurrency),
				chunkSize: chunk.length
			})

			const promises = chunk.map(async (itemId) => {
				const res = await apiClient.getAssessmentItem({ exerciseId, itemId })
				const assessmentItem = res.data.assessmentItem

				if (!assessmentItem.item) {
					logger.error("unexpected null item from assessment item", { exerciseId, itemId })
					throw errors.new(`unexpected null item for exerciseId ${exerciseId}, itemId ${itemId}`)
				}

				const { itemData, ...itemRest } = assessmentItem.item
				const parsedData = JSON.parse(itemData)
				return { ...itemRest, parsedData }
			})

			const chunkResult = await errors.try(Promise.all(promises))
			if (chunkResult.error) {
				logger.error("failed to fetch chunk of assessment items", { exerciseId, error: chunkResult.error })
				throw errors.wrap(chunkResult.error, "assessment item chunk fetch failed")
			}

			allQuestions.push(...chunkResult.data)
			logger.debug("completed chunk", {
				exerciseId,
				progress: `${Math.min(i + maxConcurrency, itemIdsArray.length)}/${itemIdsArray.length}`
			})
		}

		const discoveryReport = {
			totalItems: allItemIds.size,
			strategiesUsed: this.strategies.length,
			strategyResults: Object.fromEntries(
				strategyResults.entries().map(([strategyName, itemIds]) => [
					strategyName,
					{
						itemCount: itemIds.size,
						itemIds: Array.from(itemIds)
					}
				])
			)
		}

		logger.info("completed fetching all questions", {
			exerciseId,
			totalQuestions: allQuestions.length,
			discoveryReport
		})

		return { questions: allQuestions, discoveryReport }
	}
}

// CLI script for testing specific exercises
async function main() {
	const args = process.argv.slice(2)

	if (args.length < 1) {
		logger.error("usage: bun scripts/extract-exercise-questions.ts <exerciseId> [ancestorId1,ancestorId2,...]")
		process.exit(1)
	}

	const exerciseId = args[0]
	if (!exerciseId) {
		logger.error("exercise id is required")
		process.exit(1)
	}
	const ancestorIds = args[1]?.split(",") || []

	logger.info("starting question extraction test", { exerciseId, ancestorIds })

	const apiClient = new KhanAcademyClient(KHAN_ACADEMY_COOKIE)
	const extractor = new ComprehensiveQuestionExtractor()

	const result = await errors.try(extractor.fetchAllQuestions(apiClient, exerciseId, ancestorIds))
	if (result.error) {
		logger.error("question extraction failed", { exerciseId, error: result.error })
		throw result.error
	}

	const { questions, discoveryReport } = result.data

	// Output results
	logger.info("=== QUESTION EXTRACTION RESULTS ===")
	logger.info("discovery report", discoveryReport)
	logger.info("sample questions", {
		totalQuestions: questions.length,
		firstFewIds: questions.slice(0, 5).map((q) => q.id)
	})

	// Save detailed results to file
	const outputPath = `question-extraction-${exerciseId}-${Date.now()}.json`
	const outputData = {
		exerciseId,
		ancestorIds,
		timestamp: new Date().toISOString(),
		discoveryReport,
		questions: questions.map((q) => ({
			id: q.id,
			sha: q.sha,
			// Include just the structure, not full content to keep file manageable
			hasContent: !!q.parsedData
		}))
	}

	const writeResult = await errors.try(Bun.write(outputPath, JSON.stringify(outputData, null, 2)))
	if (writeResult.error) {
		logger.error("failed to write output file", { error: writeResult.error })
		throw errors.wrap(writeResult.error, "write output file")
	}
	logger.info("saved extraction results", { outputPath })
}

if (import.meta.main) {
	const result = await errors.try(main())
	if (result.error) {
		logger.error("script failed", { error: result.error })
		process.exit(1)
	}
}
