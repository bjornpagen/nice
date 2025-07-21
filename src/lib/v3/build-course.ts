import * as fs from "node:fs"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as types from "@/lib/v3/types"

async function main(): Promise<void> {
	logger.info("starting course build from oneroster data")

	// Read course data
	const courseResult = errors.trySync(() =>
		JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/oneroster/course.json"), "utf-8"))
	)
	if (courseResult.error) {
		logger.error("failed to read course data", { error: courseResult.error })
		throw errors.wrap(courseResult.error, "course data read")
	}
	logger.debug("loaded course data", { course: courseResult.data })

	// Read course components data
	const courseComponentsResult = errors.trySync(() =>
		JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/oneroster/courseComponents.json"), "utf-8"))
	)
	if (courseComponentsResult.error) {
		logger.error("failed to read course components data", { error: courseComponentsResult.error })
		throw errors.wrap(courseComponentsResult.error, "course components data read")
	}
	logger.debug("loaded course components data", { count: courseComponentsResult.data.length })

	// Read component resources data
	const componentResourcesResult = errors.trySync(() =>
		JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/oneroster/componentResources.json"), "utf-8"))
	)
	if (componentResourcesResult.error) {
		logger.error("failed to read component resources data", { error: componentResourcesResult.error })
		throw errors.wrap(componentResourcesResult.error, "component resources data read")
	}
	logger.debug("loaded component resources data", { count: componentResourcesResult.data.length })

	// Read resources data
	const resourcesResult = errors.trySync(() =>
		JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/oneroster/resources.json"), "utf-8"))
	)
	if (resourcesResult.error) {
		logger.error("failed to read resources data", { error: resourcesResult.error })
		throw errors.wrap(resourcesResult.error, "resources data read")
	}
	logger.debug("loaded resources data", { count: resourcesResult.data.length })

	// Build the course
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
	logger.info("successfully built course", { sourcedId: buildResult.data.sourcedId })

	// Write output to JSON file
	const outputPath = path.join(process.cwd(), "data/oneroster/built-course.json")
	const writeResult = errors.trySync(() => fs.writeFileSync(outputPath, JSON.stringify(buildResult.data, null, 2)))
	if (writeResult.error) {
		logger.error("failed to write output file", { error: writeResult.error, outputPath })
		throw errors.wrap(writeResult.error, "output file write")
	}
	logger.info("wrote built course to file", { outputPath })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}
