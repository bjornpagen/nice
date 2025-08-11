import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

// OneRoster schemas
const CourseComponentSchema = z.object({
	sourcedId: z.string(),
	title: z.string(),
	parent: z
		.object({
			sourcedId: z.string()
		})
		.optional(),
	metadata: z.object({
		khanSlug: z.string()
	})
})

const ResourceSchema = z.object({
	sourcedId: z.string(),
	metadata: z.object({
		khanId: z.string(),
		type: z.literal("interactive"),
		activityType: z.enum(["Exercise", "Quiz", "UnitTest", "Article", "Video", "CourseChallenge"]) // comprehensive
	})
})

const ComponentResourceSchema = z.object({
	resource: z.object({
		sourcedId: z.string()
	}),
	courseComponent: z.object({
		sourcedId: z.string()
	})
})

// QTI schemas
const AssessmentItemMetadataSchema = z.object({
	khanId: z.string(),
	khanExerciseId: z.string()
})

const AssessmentItemSchema = z.object({
	xml: z.string(),
	metadata: AssessmentItemMetadataSchema
})

async function main() {
	logger.info("Starting assessment items XML extraction using OneRoster data")

	const pigdataDir = path.join(process.cwd(), "data")
	const outputBaseDir = path.join(process.cwd(), "qti-grouping-analysis")

	// Get all course directories
	const readDirResult = await errors.try(fs.readdir(pigdataDir))
	if (readDirResult.error) {
		logger.error("failed to read data directory", { error: readDirResult.error })
		throw errors.wrap(readDirResult.error, "data directory read")
	}

	// Process each course
	for (const courseSlug of readDirResult.data) {
		const coursePath = path.join(pigdataDir, courseSlug)
		const statResult = await errors.try(fs.stat(coursePath))
		if (statResult.error || !statResult.data.isDirectory()) {
			continue
		}

		logger.info("Processing course", { courseSlug })

		// Read OneRoster data
		const courseComponentsPath = path.join(coursePath, "oneroster", "courseComponents.json")
		const resourcesPath = path.join(coursePath, "oneroster", "resources.json")
		const componentResourcesPath = path.join(coursePath, "oneroster", "componentResources.json")
		const assessmentItemsPath = path.join(coursePath, "qti", "assessmentItems.json")

		// Load all JSON files
		const [componentsResult, resourcesResult, componentResourcesResult, assessmentItemsResult] = await Promise.all([
			errors.try(fs.readFile(courseComponentsPath, "utf-8")),
			errors.try(fs.readFile(resourcesPath, "utf-8")),
			errors.try(fs.readFile(componentResourcesPath, "utf-8")),
			errors.try(fs.readFile(assessmentItemsPath, "utf-8"))
		])

		if (
			componentsResult.error ||
			resourcesResult.error ||
			componentResourcesResult.error ||
			assessmentItemsResult.error
		) {
			logger.error("Failed to read course data files", { courseSlug })
			continue
		}

		// Parse JSON
		const components = z.array(CourseComponentSchema).parse(JSON.parse(componentsResult.data))
		const resources = z.array(ResourceSchema).parse(JSON.parse(resourcesResult.data))
		const componentResources = z.array(ComponentResourceSchema).parse(JSON.parse(componentResourcesResult.data))
		const assessmentItems = z.array(AssessmentItemSchema).parse(JSON.parse(assessmentItemsResult.data))

		logger.info("Loaded course data", {
			courseSlug,
			components: components.length,
			resources: resources.length,
			assessmentItems: assessmentItems.length
		})

		// Build lookup maps
		const componentById = new Map(components.map((c) => [c.sourcedId, c]))
		const exerciseResources = resources.filter(
			(r) => r.metadata.type === "interactive" && r.metadata.activityType === "Exercise"
		)
		const exerciseByKhanId = new Map(exerciseResources.map((r) => [r.metadata.khanId, r]))

		// Map resources to components
		const resourceToComponent = new Map<string, string>()
		for (const cr of componentResources) {
			resourceToComponent.set(cr.resource.sourcedId, cr.courseComponent.sourcedId)
		}

		// Group assessment items by exercise
		const itemsByExercise = new Map<string, typeof assessmentItems>()
		for (const item of assessmentItems) {
			const exerciseId = item.metadata.khanExerciseId
			if (!itemsByExercise.has(exerciseId)) {
				itemsByExercise.set(exerciseId, [])
			}
			const items = itemsByExercise.get(exerciseId)
			if (items) {
				items.push(item)
			}
		}

		// Process each exercise
		let processedCount = 0
		let skippedCount = 0

		for (const [exerciseKhanId, items] of itemsByExercise) {
			// Find the exercise resource
			const exercise = exerciseByKhanId.get(exerciseKhanId)
			if (!exercise) {
				logger.warn("Exercise not found in resources", { exerciseKhanId })
				skippedCount += items.length
				continue
			}

			// Find which component contains this exercise
			const componentId = resourceToComponent.get(exercise.sourcedId)
			if (!componentId) {
				logger.warn("Exercise not mapped to any component", { exerciseKhanId })
				skippedCount += items.length
				continue
			}

			// Get the component (lesson)
			const lesson = componentById.get(componentId)
			if (!lesson) {
				logger.warn("Component not found", { componentId })
				skippedCount += items.length
				continue
			}

			// Get the parent component (unit) if it exists
			let unitSlug = ""
			if (lesson.parent) {
				const unit = componentById.get(lesson.parent.sourcedId)
				if (unit) {
					unitSlug = unit.metadata.khanSlug
				}
			}

			// Create directory path
			const outputDir = unitSlug
				? path.join(outputBaseDir, courseSlug, unitSlug, lesson.metadata.khanSlug)
				: path.join(outputBaseDir, courseSlug, lesson.metadata.khanSlug)

			const mkdirResult = await errors.try(fs.mkdir(outputDir, { recursive: true }))
			if (mkdirResult.error) {
				logger.error("Failed to create output directory", {
					outputDir,
					error: mkdirResult.error
				})
				continue
			}

			// Write each XML as a separate file
			for (const item of items) {
				const filename = `${item.metadata.khanId}.xml`
				const filePath = path.join(outputDir, filename)

				const writeResult = await errors.try(fs.writeFile(filePath, item.xml))
				if (writeResult.error) {
					logger.error("Failed to write XML file", {
						filePath,
						error: writeResult.error
					})
				} else {
					processedCount++
				}
			}
		}

		logger.info("Completed processing course", {
			course: courseSlug,
			processedItems: processedCount,
			skippedItems: skippedCount,
			totalItems: assessmentItems.length
		})
	}

	logger.info("Assessment items XML extraction complete", {
		outputDir: outputBaseDir
	})
}

// Run the script
main().catch((error) => {
	logger.error("Script failed", { error })
	process.exit(1)
})
