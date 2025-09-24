#!/usr/bin/env bun
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { CanvasClient } from "@/lib/canvas-api"
import { createCanvasClientFromEnv } from "@/lib/canvas-api"

logger.setDefaultLogLevel(logger.INFO)

async function main() {
	const [, , courseIdArg, outDirArg] = process.argv
	if (!courseIdArg) {
		logger.error("missing course id argument")
		throw errors.new("canvas dump: missing course id")
	}

	const outDir = outDirArg || path.join(process.cwd(), "data")
	const mkdirResult = await errors.try(fs.mkdir(outDir, { recursive: true }))
	if (mkdirResult.error) {
		logger.error("failed to create output directory", { error: mkdirResult.error, outDir })
		throw errors.wrap(mkdirResult.error, "canvas dump: create output directory")
	}

	let client: CanvasClient
	const makeClientResult = errors.trySync(() => createCanvasClientFromEnv())
	if (makeClientResult.error) {
		logger.error("failed to create canvas client from env", { error: makeClientResult.error })
		throw makeClientResult.error
	}
	client = makeClientResult.data

	const resp = await client.getCourseModules(courseIdArg)
	if (!resp.data.course) {
		logger.error("no course returned for id", { courseId: courseIdArg })
		throw errors.new("canvas dump: no course in response")
	}

	const filePath = path.join(outDir, `canvas-course-${courseIdArg}-modules.json`)
	const writeResult = await errors.try(fs.writeFile(filePath, JSON.stringify(resp, null, 2)))
	if (writeResult.error) {
		logger.error("failed to write modules file", { error: writeResult.error, file: filePath })
		throw errors.wrap(writeResult.error, "canvas dump: write modules file")
	}
	logger.info("wrote modules json", { file: filePath })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("operation failed", { error: result.error })
	process.exit(1)
}

process.exit(0)
