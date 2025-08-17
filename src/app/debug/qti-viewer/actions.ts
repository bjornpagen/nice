"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
import { Client } from "@/lib/qti"

export interface QtiHint {
	choiceId: string
	choiceText: string
	feedback: string
	isCorrect: boolean
}

export interface QtiHintsResponse {
	questionText: string
	hints: QtiHint[]
}

export async function getQtiHints(identifier: string): Promise<QtiHintsResponse> {
	logger.debug("fetching qti hints", { identifier })

	const qti = new Client({
		serverUrl: env.TIMEBACK_QTI_SERVER_URL,
		tokenUrl: env.TIMEBACK_TOKEN_URL,
		clientId: env.TIMEBACK_CLIENT_ID,
		clientSecret: env.TIMEBACK_CLIENT_SECRET
	})

	const fetchResult = await errors.try(qti.getAssessmentItem(identifier))
	if (fetchResult.error) {
		logger.error("failed to fetch assessment item", { identifier, error: fetchResult.error })
		throw errors.wrap(fetchResult.error, "get assessment item")
	}

	const itemUnknown: unknown = fetchResult.data
	const isRecord = (v: unknown): v is Record<string, unknown> =>
		typeof v === "object" && v !== null && !Array.isArray(v)

	if (!isRecord(itemUnknown)) {
		logger.error("unexpected item shape", { itemType: typeof itemUnknown })
		throw errors.new("unexpected qti item shape")
	}

	const item = itemUnknown
	const rawXml = item.rawXml

	if (typeof rawXml !== "string") {
		logger.error("missing or invalid rawXml", { identifier })
		throw errors.new("missing rawXml in qti item")
	}

	logger.debug("parsing rawXml for hints", { identifier, xmlLength: rawXml.length })

	// Extract question text and hints from rawXml
	const hintsResult = extractHintsFromXml(rawXml)

	logger.debug("extracted hints", { identifier, hintCount: hintsResult.hints.length, questionText: hintsResult.questionText })

	return hintsResult
}

function extractHintsFromXml(xml: string): QtiHintsResponse {
	const hints: QtiHint[] = []

	// Extract question text from qti-item-body - look for first <p> tag after item-body
	const questionPattern = /<qti-item-body[^>]*>.*?<p[^>]*>(.*?)<\/p>/s
	const questionMatch = questionPattern.exec(xml)
	const questionText = questionMatch?.[1]
		? questionMatch[1]
				.replace(/<[^>]*>/g, " ") // Remove XML tags
				.replace(/\s+/g, " ") // Normalize whitespace
				.trim()
		: "Question text not found"

	// Extract correct answer from qti-correct-response
	// First find the correct-response block, then extract the value from within it
	const correctResponseBlockPattern = /<qti-correct-response[^>]*>(.*?)<\/qti-correct-response>/s
	const correctResponseBlockMatch = correctResponseBlockPattern.exec(xml)
	
	let correctAnswer: string | undefined
	if (correctResponseBlockMatch?.[1]) {
		const correctResponseBlock = correctResponseBlockMatch[1]
		const valuePattern = /<qti-value[^>]*>\s*(.*?)\s*<\/qti-value>/s
		const valueMatch = valuePattern.exec(correctResponseBlock)
		correctAnswer = valueMatch?.[1]?.trim()
	}
	
	logger.debug("parsing correct answer", { 
		correctAnswer, 
		hasCorrectResponseBlock: !!correctResponseBlockMatch,
		correctResponseBlockContent: correctResponseBlockMatch?.[1]?.substring(0, 100)
	})

	// Find all qti-simple-choice elements and their associated qti-feedback-inline
	const choicePattern = /<qti-simple-choice[^>]*identifier="([^"]*)"[^>]*>(.*?)<\/qti-simple-choice>/gs
	let choiceMatch: RegExpExecArray | null = null

	while (true) {
		choiceMatch = choicePattern.exec(xml)
		if (choiceMatch === null) break
		
		const choiceId = choiceMatch[1]
		const choiceContent = choiceMatch[2]
		
		if (!choiceId || !choiceContent) continue

		// Extract the choice text by removing the feedback-inline block
		const choiceTextContent = choiceContent.replace(/<qti-feedback-inline[^>]*>.*?<\/qti-feedback-inline>/s, "")
		const choiceText = choiceTextContent
			.replace(/<[^>]*>/g, " ") // Remove XML tags
			.replace(/\s+/g, " ") // Normalize whitespace
			.trim()

		// Look for qti-feedback-inline within this choice
		const feedbackPattern = /<qti-feedback-inline[^>]*>(.*?)<\/qti-feedback-inline>/s
		const feedbackMatch = feedbackPattern.exec(choiceContent)

		if (feedbackMatch?.[1]) {
			// Clean up the feedback content by removing XML tags and normalizing whitespace
			const feedback = feedbackMatch[1]
				.replace(/<[^>]*>/g, " ") // Remove XML tags
				.replace(/\s+/g, " ") // Normalize whitespace
				.trim()

			if (feedback && choiceText) {
				const isCorrect = correctAnswer === choiceId
				logger.debug("processing choice", { choiceId, correctAnswer, isCorrect })
				hints.push({ choiceId, choiceText, feedback, isCorrect })
			}
		}
	}

	return { questionText, hints }
}
