#!/usr/bin/env bun

/**
 * Script to get metadata for a specific QTI assessment item
 * Run with: bun scripts/get-question-metadata.ts <question-id>
 * Example: bun scripts/get-question-metadata.ts nice_x3184e0ec_1234
 */

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { qti } from "@/lib/clients"

async function getQuestionMetadata(questionId: string) {
	logger.info("fetching question metadata", { questionId })

	const result = await errors.try(qti.getAssessmentItem(questionId))
	if (result.error) {
		logger.error("failed to fetch question", { questionId, error: result.error })

		if (result.error.message.includes("404")) {
			logger.info("question not found - this id doesn't exist in qti system", { questionId })
		}

		process.exit(1)
	}

	const question = result.data

	logger.info("question found successfully", {
		questionId,
		identifier: question.identifier,
		title: question.title || "No title"
	})

	// Display metadata in a readable format
	if (question.metadata && Object.keys(question.metadata).length > 0) {
		logger.info("question metadata", question.metadata)

		// Highlight specific fields if they exist
		if (question.metadata.status) {
			logger.info("question metadata", { metadata: question.metadata })
		}

		if (question.metadata.report) {
			logger.info("user report", { report: question.metadata.report })
		}

		if (question.metadata.lastReported) {
			logger.info("last reported", {
				timestamp: question.metadata.lastReported,
				reportedBy: question.metadata.reportedBy || "unknown"
			})
		}

		if (question.metadata.difficulty) {
			logger.info("difficulty level", { difficulty: question.metadata.difficulty })
		}

		if (question.metadata.tags || question.metadata.keywords) {
			logger.info("categorization", {
				tags: question.metadata.tags,
				keywords: question.metadata.keywords
			})
		}
	} else {
		logger.info("no metadata found for this question")
	}

	// Show basic question info
	logger.info("question details", {
		identifier: question.identifier,
		title: question.title,
		type: question.type,
		hasXml: !!question.rawXml,
		xmlLength: question.rawXml?.length || 0
	})

	process.exit(0)
}

// Get question ID from command line arguments
const questionId = process.argv[2]

if (!questionId) {
	logger.error("missing question id argument")
	logger.info("usage: bun scripts/get-question-metadata.ts <question-id>")
	logger.info("example: bun scripts/get-question-metadata.ts nice_x3184e0ec_1234")
	process.exit(1)
}

// Run the script
getQuestionMetadata(questionId).catch((error) => {
	logger.error("script crashed", { error })
	process.exit(1)
})
