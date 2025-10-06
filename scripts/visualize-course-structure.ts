#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as fs from "node:fs"
import * as path from "node:path"

interface PayloadFile {
	course: {
		sourcedId: string
		title: string
	}
	courseComponents: Array<{
		sourcedId: string
		title: string
		parent?: { sourcedId: string }
		sortOrder: number
	}>
	componentResources: Array<{
		sourcedId: string
		title: string
		courseComponent: { sourcedId: string }
		resource: { sourcedId: string }
		sortOrder: number
	}>
	resources: Array<{
		sourcedId: string
		title: string
		metadata?: {
			khanActivityType?: string
			xp?: number
		}
	}>
}

function main(): void {
	const args = process.argv.slice(2)
	if (args.length === 0) {
		console.log("usage: bun run scripts/visualize-course-structure.ts <path-to-oneroster-json>")
		process.exit(1)
	}

	const rawPath = args[0]
	if (!rawPath) {
		logger.error("json path is required")
		throw errors.new("json path is required")
	}

	const jsonPath = path.resolve(process.cwd(), rawPath)

	const readResult = errors.trySync(() => fs.readFileSync(jsonPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read json file", { path: jsonPath, error: readResult.error })
		throw errors.wrap(readResult.error, "file read")
	}

	const parseResult = errors.trySync(() => JSON.parse(readResult.data))
	if (parseResult.error) {
		logger.error("failed to parse json", { path: jsonPath, error: parseResult.error })
		throw errors.wrap(parseResult.error, "json parse")
	}

	const payload = parseResult.data as PayloadFile

	// Validate payload structure
	if (!payload.course || !payload.courseComponents || !payload.resources || !payload.componentResources) {
		logger.error("invalid payload structure", {
			hasCourse: !!payload.course,
			hasCourseComponents: !!payload.courseComponents,
			hasResources: !!payload.resources,
			hasComponentResources: !!payload.componentResources
		})
		throw errors.new("file is not a valid oneroster payload")
	}

	// Build maps
	const resourcesById = new Map(payload.resources.map((r) => [r.sourcedId, r]))
	const componentResourcesByComponentId = new Map<string, typeof payload.componentResources>()

	for (const cr of payload.componentResources) {
		const componentId = cr.courseComponent.sourcedId
		if (!componentResourcesByComponentId.has(componentId)) {
			componentResourcesByComponentId.set(componentId, [])
		}
		componentResourcesByComponentId.get(componentId)?.push(cr)
	}

	// Sort component resources by sortOrder
	for (const crs of componentResourcesByComponentId.values()) {
		crs.sort((a, b) => a.sortOrder - b.sortOrder)
	}

	// Build component hierarchy
	const rootComponents = payload.courseComponents.filter((cc) => !cc.parent).sort((a, b) => a.sortOrder - b.sortOrder)
	const childrenByParent = new Map<string, typeof payload.courseComponents>()

	for (const cc of payload.courseComponents) {
		if (cc.parent) {
			const parentId = cc.parent.sourcedId
			if (!childrenByParent.has(parentId)) {
				childrenByParent.set(parentId, [])
			}
			childrenByParent.get(parentId)?.push(cc)
		}
	}

	// Sort children by sortOrder
	for (const children of childrenByParent.values()) {
		children.sort((a, b) => a.sortOrder - b.sortOrder)
	}

	// Print tree
	console.log(`\n📚 ${payload.course.title}`)
	console.log(`   (${payload.course.sourcedId})`)

	for (const unit of rootComponents) {
		console.log(`\n├─ 📦 ${unit.title}`)
		console.log(`│  (${unit.sourcedId})`)

		const lessons = childrenByParent.get(unit.sourcedId) || []
		for (let lessonIdx = 0; lessonIdx < lessons.length; lessonIdx++) {
			const lesson = lessons[lessonIdx]
			if (!lesson) {
				continue
			}
			const isLastLesson = lessonIdx === lessons.length - 1
			const lessonPrefix = isLastLesson ? "└─" : "├─"
			const contentPrefix = isLastLesson ? "   " : "│  "

			console.log(`${contentPrefix}`)
			console.log(`${contentPrefix}${lessonPrefix} 📖 ${lesson.title}`)
			console.log(`${contentPrefix}   (${lesson.sourcedId})`)

			const componentResources = componentResourcesByComponentId.get(lesson.sourcedId) || []
			for (let crIdx = 0; crIdx < componentResources.length; crIdx++) {
				const cr = componentResources[crIdx]
				if (!cr) {
					continue
				}
				const resource = resourcesById.get(cr.resource.sourcedId)
				if (!resource) {
					continue
				}

				const isLastResource = crIdx === componentResources.length - 1
				const resourcePrefix = isLastResource ? "└─" : "├─"

				const activityType = resource.metadata?.khanActivityType || "Unknown"
				const xp = resource.metadata?.xp || 0

				let icon = "📄"
				if (activityType === "Video") {
					icon = "🎥"
				} else if (activityType === "Exercise") {
					icon = "✏️"
				} else if (activityType === "Article") {
					icon = "📰"
				}

				console.log(`${contentPrefix}   ${resourcePrefix} ${icon} ${resource.title} [${activityType}, ${xp}xp]`)
			}
		}
	}

	console.log("")
}

main()
