#!/usr/bin/env bun

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { generateRulerOverlayHTML } from "@/lib/jom"

async function main() {
	// Read all input from stdin using Bun's file API
	const input = await Bun.stdin.text()

	if (!input.trim()) {
		throw errors.new("no input provided")
	}

	// Parse JSON input
	const parseResult = errors.trySync(() => JSON.parse(input))
	if (parseResult.error) {
		logger.error("invalid JSON input", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "JSON parsing")
	}

	// Generate HTML
	const htmlResult = errors.trySync(() => generateRulerOverlayHTML(parseResult.data))
	if (htmlResult.error) {
		logger.error("HTML generation failed", { error: htmlResult.error })
		throw htmlResult.error
	}

	// Output the HTML directly to stdout
	await Bun.write(Bun.stdout, htmlResult.data)
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script execution failed", { error: result.error })
	process.exit(1)
}
