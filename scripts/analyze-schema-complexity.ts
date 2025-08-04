#!/usr/bin/env bun
/**
 * Script to analyze the complexity of AssessmentItemSchema and identify potential issues
 */

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { zodResponseFormat } from "openai/helpers/zod"
import { AssessmentItemSchema } from "@/lib/qti/schemas"
import { WidgetSchema } from "@/lib/widgets/generators"

function analyzeJsonSchema(
	schema: unknown,
	path = "root",
	depth = 0
): {
	totalNodes: number
	maxDepth: number
	anyOfCount: number
	unionCount: number
	definitions: number
	refs: number
} {
	let totalNodes = 1
	let maxDepth = depth
	let anyOfCount = 0
	let unionCount = 0
	let definitions = 0
	let refs = 0

	// Type-safe property access using 'in' operator and property checks
	if (schema && typeof schema === "object" && schema !== null) {
		if ("$ref" in schema) {
			refs++
		}

		if ("anyOf" in schema && Array.isArray(schema.anyOf)) {
			anyOfCount++
			unionCount += schema.anyOf.length
			for (const [index, item] of schema.anyOf.entries()) {
				const result = analyzeJsonSchema(item, `${path}.anyOf[${index}]`, depth + 1)
				totalNodes += result.totalNodes
				maxDepth = Math.max(maxDepth, result.maxDepth)
				anyOfCount += result.anyOfCount
				unionCount += result.unionCount
				definitions += result.definitions
				refs += result.refs
			}
		}

		if ("oneOf" in schema && Array.isArray(schema.oneOf)) {
			unionCount += schema.oneOf.length
			for (const [index, item] of schema.oneOf.entries()) {
				const result = analyzeJsonSchema(item, `${path}.oneOf[${index}]`, depth + 1)
				totalNodes += result.totalNodes
				maxDepth = Math.max(maxDepth, result.maxDepth)
				anyOfCount += result.anyOfCount
				unionCount += result.unionCount
				definitions += result.definitions
				refs += result.refs
			}
		}

		if ("properties" in schema && schema.properties && typeof schema.properties === "object") {
			for (const [key, property] of Object.entries(schema.properties)) {
				const result = analyzeJsonSchema(property, `${path}.properties.${key}`, depth + 1)
				totalNodes += result.totalNodes
				maxDepth = Math.max(maxDepth, result.maxDepth)
				anyOfCount += result.anyOfCount
				unionCount += result.unionCount
				definitions += result.definitions
				refs += result.refs
			}
		}

		if ("items" in schema && schema.items) {
			const result = analyzeJsonSchema(schema.items, `${path}.items`, depth + 1)
			totalNodes += result.totalNodes
			maxDepth = Math.max(maxDepth, result.maxDepth)
			anyOfCount += result.anyOfCount
			unionCount += result.unionCount
			definitions += result.definitions
			refs += result.refs
		}

		if ("definitions" in schema && schema.definitions && typeof schema.definitions === "object") {
			definitions += Object.keys(schema.definitions).length
			for (const [key, definition] of Object.entries(schema.definitions)) {
				const result = analyzeJsonSchema(definition, `definitions.${key}`, depth + 1)
				totalNodes += result.totalNodes
				maxDepth = Math.max(maxDepth, result.maxDepth)
				anyOfCount += result.anyOfCount
				unionCount += result.unionCount
				definitions += result.definitions
				refs += result.refs
			}
		}
	}

	return { totalNodes, maxDepth, anyOfCount, unionCount, definitions, refs }
}

async function main() {
	logger.info("analyzing AssessmentItemSchema complexity")

	const formatResult = errors.trySync(() => zodResponseFormat(AssessmentItemSchema, "qti_assessment_item_generator"))
	if (formatResult.error) {
		logger.error("failed to generate response format", { error: formatResult.error })
		throw errors.wrap(formatResult.error, "zodResponseFormat generation")
	}

	const jsonSchema = formatResult.data.json_schema?.schema
	if (!jsonSchema || typeof jsonSchema !== "object") {
		logger.error("no JSON schema found")
		throw errors.new("missing json schema in response format")
	}

	// Analyze complexity
	const analysisResult = errors.trySync(() => analyzeJsonSchema(jsonSchema))
	if (analysisResult.error) {
		logger.error("failed to analyze json schema", { error: analysisResult.error })
		throw errors.wrap(analysisResult.error, "schema analysis")
	}

	const analysis = analysisResult.data
	logger.info("AssessmentItemSchema complexity analysis", {
		...analysis,
		schemaSizeBytes: JSON.stringify(jsonSchema).length,
		schemaLineCount: JSON.stringify(jsonSchema, null, 2).split("\n").length
	})

	// Also analyze just the WidgetSchema to see its contribution
	logger.info("analyzing WidgetSchema complexity for comparison")
	const widgetFormatResult = errors.trySync(() => zodResponseFormat(WidgetSchema, "widget_test"))
	if (widgetFormatResult.error) {
		logger.error("failed to generate widget response format", { error: widgetFormatResult.error })
		throw errors.wrap(widgetFormatResult.error, "widget zodResponseFormat generation")
	}

	const widgetJsonSchema = widgetFormatResult.data.json_schema?.schema
	if (widgetJsonSchema && typeof widgetJsonSchema === "object") {
		const widgetAnalysisResult = errors.trySync(() => analyzeJsonSchema(widgetJsonSchema))
		if (widgetAnalysisResult.error) {
			logger.error("failed to analyze widget schema", { error: widgetAnalysisResult.error })
		} else {
			logger.info("WidgetSchema complexity analysis", {
				...widgetAnalysisResult.data,
				schemaSizeBytes: JSON.stringify(widgetJsonSchema).length,
				schemaLineCount: JSON.stringify(widgetJsonSchema, null, 2).split("\n").length
			})
		}
	}

	// Check for specific OpenAI limits
	const schemaSize = JSON.stringify(jsonSchema).length
	logger.info("checking against known OpenAI limits", {
		schemaSizeBytes: schemaSize,
		approximateTokens: Math.ceil(schemaSize / 4), // Rough estimate
		exceedsRecommendedSize: schemaSize > 100000, // 100KB rough guideline
		maxDepth: analysis.maxDepth,
		exceedsRecommendedDepth: analysis.maxDepth > 10
	})

	// Look for the most complex anyOf unions
	logger.info("looking for complex unions in schema")

	// Check if we can simplify by making widget content optional or simpler
	logger.info("recommendations", {
		recommendations: [
			"Consider making widget content optional with a simpler fallback",
			"Split complex unions into separate schemas",
			"Use string-based content with runtime parsing instead of full schema validation",
			"Implement a two-pass approach: generate simplified structure first, then enrich"
		]
	})
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script execution failed", { error: result.error })
	process.exit(1)
}
