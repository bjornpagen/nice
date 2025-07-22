import * as fs from "node:fs"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as types from "@/lib/v3/types"

async function main(): Promise<void> {
	const scriptStartTime = performance.now()
	const initialMemory = process.memoryUsage()
	logger.info("starting course build from oneroster data", {
		initialMemoryMB: {
			rss: (initialMemory.rss / 1024 / 1024).toFixed(2),
			heapUsed: (initialMemory.heapUsed / 1024 / 1024).toFixed(2),
			heapTotal: (initialMemory.heapTotal / 1024 / 1024).toFixed(2)
		}
	})

	// Read course data
	const courseReadStart = performance.now()
	const courseResult = errors.trySync(() =>
		JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/oneroster/course.json"), "utf-8"))
	)
	if (courseResult.error) {
		logger.error("failed to read course data", { error: courseResult.error })
		throw errors.wrap(courseResult.error, "course data read")
	}
	const courseReadDuration = performance.now() - courseReadStart
	logger.info("loaded course data", { durationMs: courseReadDuration.toFixed(2) })
	logger.debug("course data details", { course: courseResult.data })

	// Read course components data
	const courseComponentsReadStart = performance.now()
	const courseComponentsResult = errors.trySync(() =>
		JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/oneroster/courseComponents.json"), "utf-8"))
	)
	if (courseComponentsResult.error) {
		logger.error("failed to read course components data", { error: courseComponentsResult.error })
		throw errors.wrap(courseComponentsResult.error, "course components data read")
	}
	const courseComponentsReadDuration = performance.now() - courseComponentsReadStart
	logger.info("loaded course components data", {
		count: courseComponentsResult.data.length,
		durationMs: courseComponentsReadDuration.toFixed(2)
	})

	// Read component resources data
	const componentResourcesReadStart = performance.now()
	const componentResourcesResult = errors.trySync(() =>
		JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/oneroster/componentResources.json"), "utf-8"))
	)
	if (componentResourcesResult.error) {
		logger.error("failed to read component resources data", { error: componentResourcesResult.error })
		throw errors.wrap(componentResourcesResult.error, "component resources data read")
	}
	const componentResourcesReadDuration = performance.now() - componentResourcesReadStart
	logger.info("loaded component resources data", {
		count: componentResourcesResult.data.length,
		durationMs: componentResourcesReadDuration.toFixed(2)
	})

	// Read resources data
	const resourcesReadStart = performance.now()
	const resourcesResult = errors.trySync(() =>
		JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/oneroster/resources.json"), "utf-8"))
	)
	if (resourcesResult.error) {
		logger.error("failed to read resources data", { error: resourcesResult.error })
		throw errors.wrap(resourcesResult.error, "resources data read")
	}
	const resourcesReadDuration = performance.now() - resourcesReadStart
	logger.info("loaded resources data", {
		count: resourcesResult.data.length,
		durationMs: resourcesReadDuration.toFixed(2)
	})

	// Build the course
	const buildStart = performance.now()
	logger.info("building course from oneroster data")
	const buildResult = errors.trySync(() =>
		types.buildOneRosterCourse(
			courseResult.data,
			courseComponentsResult.data,
			componentResourcesResult.data,
			resourcesResult.data
		)
	)
	if (buildResult.error) {
		logger.error("failed to build course", { error: buildResult.error })
		throw errors.wrap(buildResult.error, "course build")
	}
	const buildDuration = performance.now() - buildStart
	logger.info("successfully built course", {
		sourcedId: buildResult.data.sourcedId,
		durationMs: buildDuration.toFixed(2)
	})

	// Write output to JSON file
	const writeStart = performance.now()
	const outputPath = path.join(process.cwd(), "data/oneroster/built-course.json")
	const writeResult = errors.trySync(() => fs.writeFileSync(outputPath, JSON.stringify(buildResult.data, null, 2)))
	if (writeResult.error) {
		logger.error("failed to write output file", { error: writeResult.error, outputPath })
		throw errors.wrap(writeResult.error, "output file write")
	}
	const writeDuration = performance.now() - writeStart
	const totalDuration = performance.now() - scriptStartTime
	const finalMemory = process.memoryUsage()

	logger.info("wrote built course to file", {
		outputPath,
		writeMs: writeDuration.toFixed(2),
		totalMs: totalDuration.toFixed(2),
		finalMemoryMB: {
			rss: (finalMemory.rss / 1024 / 1024).toFixed(2),
			heapUsed: (finalMemory.heapUsed / 1024 / 1024).toFixed(2),
			heapTotal: (finalMemory.heapTotal / 1024 / 1024).toFixed(2)
		},
		memoryDeltaMB: {
			rss: ((finalMemory.rss - initialMemory.rss) / 1024 / 1024).toFixed(2),
			heapUsed: ((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2),
			heapTotal: ((finalMemory.heapTotal - initialMemory.heapTotal) / 1024 / 1024).toFixed(2)
		}
	})
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}
