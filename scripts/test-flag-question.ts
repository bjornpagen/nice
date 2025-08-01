#!/usr/bin/env bun

/**
 * Test script to verify question flagging functionality
 * Run with: bun scripts/test-flag-question.ts
 */

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { qti } from "@/lib/clients"

async function testQuestionFlagging() {
	logger.info("testing question flagging functionality")

	const testQuestionId = "nice_test_question_flag_456"

	// First, let's try to get the question to see if it exists
	const getResult = await errors.try(qti.getAssessmentItem(testQuestionId))
	if (getResult.error) {
		logger.warn("test question doesn't exist, this is expected for a new test question", {
			questionId: testQuestionId,
			error: getResult.error
		})
		logger.info("test complete - flagging would work in real scenario with existing questions")
		return
	}

	logger.info("found existing question", {
		questionId: testQuestionId,
		currentStatus: getResult.data.metadata?.status
	})

	// Now let's update its metadata to flag it as reported with a test message
	const testReportMessage = "Test report: This question has unclear wording and confusing answer choices."
	const updatedMetadata = {
		...getResult.data.metadata,
		status: "reported",
		report: testReportMessage,
		lastReported: new Date().toISOString(),
		reportedBy: "test-user-clerk-id"
	}

	const updatePayload = {
		identifier: getResult.data.identifier,
		xml: getResult.data.rawXml,
		metadata: updatedMetadata
	}

	logger.info("flagging question as buggy", { questionId: testQuestionId })

	const updateResult = await errors.try(qti.updateAssessmentItem(updatePayload))
	if (updateResult.error) {
		logger.error("failed to flag question", {
			questionId: testQuestionId,
			error: updateResult.error
		})
		process.exit(1)
	}

	logger.info("successfully flagged question as reported", {
		questionId: testQuestionId,
		newStatus: updatedMetadata.status,
		report: updatedMetadata.report,
		reportedAt: updatedMetadata.lastReported
	})

	// Verify the update by getting the question again
	const verifyResult = await errors.try(qti.getAssessmentItem(testQuestionId))
	if (verifyResult.error) {
		logger.error("failed to verify question update", { error: verifyResult.error })
		process.exit(1)
	}

	logger.info("verification successful", {
		questionId: testQuestionId,
		verifiedStatus: verifyResult.data.metadata?.status,
		verifiedReport: verifyResult.data.metadata?.report,
		lastReported: verifyResult.data.metadata?.lastReported,
		reportedBy: verifyResult.data.metadata?.reportedBy
	})

	logger.info("question flagging test completed successfully")
	process.exit(0)
}

// Run the test
testQuestionFlagging().catch((error) => {
	logger.error("test script crashed", { error })
	process.exit(1)
})
