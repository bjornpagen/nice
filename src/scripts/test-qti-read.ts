#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { QtiApiClient } from "@/lib/qti"

async function main() {
	logger.info("starting qti read-only test script")
	const client = new QtiApiClient()

	// --- Test Assessment Items ---
	logger.info("searching for assessment items")
	const itemsResult = await errors.try(client.searchAssessmentItems({ limit: 2, page: 1 }))
	if (itemsResult.error) {
		logger.error("failed to search assessment items", { error: itemsResult.error })
	} else {
		logger.info("successfully searched assessment items", {
			total: itemsResult.data.total,
			count: itemsResult.data.items.length
		})
		for (const item of itemsResult.data.items) {
			logger.debug("found item", { identifier: item.identifier, title: item.title })
		}

		const firstItem = itemsResult.data.items[0]
		if (firstItem) {
			logger.info("getting single assessment item", { identifier: firstItem.identifier })
			const singleItemResult = await errors.try(client.getAssessmentItem(firstItem.identifier))
			if (singleItemResult.error) {
				logger.error("failed to get single assessment item", { error: singleItemResult.error })
			} else {
				logger.info("successfully retrieved single item", { title: singleItemResult.data.title })
			}
		}
	}

	// --- Test Assessment Tests ---
	logger.info("searching for assessment tests")
	const testsResult = await errors.try(client.searchAssessmentTests({ limit: 2, page: 1 }))
	if (testsResult.error) {
		logger.error("failed to search assessment tests", { error: testsResult.error })
	} else {
		logger.info("successfully searched assessment tests", {
			total: testsResult.data.total,
			count: testsResult.data.items.length
		})
		for (const test of testsResult.data.items) {
			logger.debug("found test", { identifier: test.identifier, title: test.title })
		}

		const firstTest = testsResult.data.items[0]
		if (firstTest) {
			logger.info("getting single assessment test", { identifier: firstTest.identifier })
			const singleTestResult = await errors.try(client.getAssessmentTest(firstTest.identifier))
			if (singleTestResult.error) {
				logger.error("failed to get single assessment test", { error: singleTestResult.error })
			} else {
				logger.info("successfully retrieved single test", { title: singleTestResult.data.title })

				// Test getting all questions for the test
				logger.info("getting all questions for test", { identifier: firstTest.identifier })
				const questionsResult = await errors.try(client.getAllQuestionsForTest(firstTest.identifier))
				if (questionsResult.error) {
					logger.error("failed to get questions for test", { error: questionsResult.error })
				} else {
					logger.info("successfully retrieved questions for test", { count: questionsResult.data.totalQuestions })
				}
			}
		}
	}

	// --- Test Stimuli ---
	logger.info("searching for stimuli")
	const stimuliResult = await errors.try(client.searchStimuli({ limit: 2, page: 1 }))
	if (stimuliResult.error) {
		logger.error("failed to search stimuli", { error: stimuliResult.error })
	} else {
		logger.info("successfully searched stimuli", {
			total: stimuliResult.data.total,
			count: stimuliResult.data.items.length
		})
		for (const stimulus of stimuliResult.data.items) {
			logger.debug("found stimulus", { identifier: stimulus.identifier, title: stimulus.title })
		}

		const firstStimulus = stimuliResult.data.items[0]
		if (firstStimulus) {
			logger.info("getting single stimulus", { identifier: firstStimulus.identifier })
			const singleStimulusResult = await errors.try(client.getStimulus(firstStimulus.identifier))
			if (singleStimulusResult.error) {
				logger.error("failed to get single stimulus", { error: singleStimulusResult.error })
			} else {
				logger.info("successfully retrieved single stimulus", { title: singleStimulusResult.data.title })
			}
		}
	}

	logger.info("qti read-only test script completed successfully")
}

// --- Script Execution ---
const result = await errors.try(main())
if (result.error) {
	logger.error("qti test script failed", { error: result.error })
	process.exit(1)
}

process.exit(0)
