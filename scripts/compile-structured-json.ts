#!/usr/bin/env bun
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { compile } from "@/lib/qti-generation/compiler"
import { validateAndSanitizeHtmlFields } from "@/lib/qti-generation/structured/validator"

async function main() {
	const repoRoot = path.resolve(__dirname, "..")

	// Support optional CLI arg: --<file>.json from repo root, or plain <file>.json
	const argv = process.argv.slice(2)
	let inputFile = "bruh.json"
	for (const arg of argv) {
		if (!arg) continue
		if (arg.startsWith("--") && arg.endsWith(".json")) {
			inputFile = arg.slice(2)
			break
		}
		if (arg.endsWith(".json")) {
			inputFile = arg
			break
		}
	}

	const inputPath = path.join(repoRoot, inputFile)
	const outputPath = path.join(repoRoot, inputFile.replace(/\.json$/i, ".xml"))

	logger.info("reading input json", { file: inputPath })
	const readResult = await errors.try(fs.readFile(inputPath, "utf8"))
	if (readResult.error) {
		logger.error("file read", { error: readResult.error, file: inputPath })
		throw errors.wrap(readResult.error, "file read")
	}

	const parseResult = errors.trySync(() => JSON.parse(readResult.data))
	if (parseResult.error) {
		logger.error("json parse", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "json parse")
	}

	// Validate and sanitize HTML fields similar to the Inngest converter step
	logger.info("validating and sanitizing html fields")
	const sanitizeResult = errors.trySync(() => validateAndSanitizeHtmlFields(parseResult.data, logger))
	if (sanitizeResult.error) {
		logger.error("html validation", { error: sanitizeResult.error })
		throw sanitizeResult.error
	}

	logger.info("compiling qti item")
	const compileResult = errors.trySync(() => compile(sanitizeResult.data))
	if (compileResult.error) {
		logger.error("qti compile", { error: compileResult.error })
		throw errors.wrap(compileResult.error, "qti compile")
	}

	logger.info("writing output xml", { file: outputPath })
	const writeResult = await errors.try(fs.writeFile(outputPath, compileResult.data, "utf8"))
	if (writeResult.error) {
		logger.error("file write", { error: writeResult.error, file: outputPath })
		throw errors.wrap(writeResult.error, "file write")
	}

	logger.info("completed", { file: outputPath })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("fatal", { error: result.error })
	process.exit(1)
}
process.exit(0)
