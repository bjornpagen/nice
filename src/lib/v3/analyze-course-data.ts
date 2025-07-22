import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import {
	buildCourseContents,
	buildUnitAssessments,
	buildUnitContents,
	type Course,
	CourseSchema,
	type Model,
	type SourcedId,
	type UnitComponent
} from "@/lib/v3/types"

// Helper function to resolve course content SourcedIds to their objects
function resolveCourseContents(course: Course, sourcedIds: SourcedId[]): Model[] {
	const resolved: Model[] = []

	for (const sourcedId of sourcedIds) {
		const child = course.children[sourcedId]
		if (child) {
			resolved.push(child)
			continue
		}

		const resource = course.resources[sourcedId]
		if (resource) {
			resolved.push(resource)
			continue
		}

		logger.error("failed to resolve course content", { sourcedId })
		throw errors.new(`failed to resolve course content: ${sourcedId}`)
	}

	return resolved
}

// Helper function to resolve unit content SourcedIds to their objects
function resolveUnitContents(unit: UnitComponent, sourcedIds: SourcedId[]): Model[] {
	const resolved: Model[] = []

	for (const sourcedId of sourcedIds) {
		const child = unit.children[sourcedId]
		if (child) {
			resolved.push(child)
			continue
		}

		const resource = unit.resources[sourcedId]
		if (resource) {
			resolved.push(resource)
			continue
		}

		logger.error("failed to resolve unit content", { sourcedId })
		throw errors.new(`failed to resolve unit content: ${sourcedId}`)
	}

	return resolved
}

// Helper function to resolve unit assessment SourcedIds to their objects
function resolveUnitAssessments(unit: UnitComponent, sourcedIds: SourcedId[]): Model[] {
	const resolved: Model[] = []

	for (const sourcedId of sourcedIds) {
		// Check unit resources first (quizzes, unit tests)
		const resource = unit.resources[sourcedId]
		if (resource) {
			resolved.push(resource)
			continue
		}

		// Check if it's a lesson (for exercises within lessons)
		const lesson = unit.children[sourcedId]
		if (lesson) {
			resolved.push(lesson)
			continue
		}

		// Check within lesson resources for exercises
		let found = false
		for (const lesson of Object.values(unit.children)) {
			const exercise = lesson.resources[sourcedId]
			if (exercise && exercise.type === "exercise") {
				resolved.push(exercise)
				found = true
				break
			}
		}

		if (!found) {
			logger.error("failed to resolve unit assessment", { sourcedId })
			throw errors.new(`failed to resolve unit assessment: ${sourcedId}`)
		}
	}

	return resolved
}

async function main(): Promise<void> {
	logger.info("starting course data analysis")

	// Load the built course data
	const builtCourseResult = errors.trySync(() => {
		const filePath = join(process.cwd(), "data", "oneroster", "built-course.json")
		const fileContent = readFileSync(filePath, "utf-8")
		return JSON.parse(fileContent)
	})
	if (builtCourseResult.error) {
		logger.error("failed to load built course data", { error: builtCourseResult.error })
		throw errors.wrap(builtCourseResult.error, "failed to load built course data")
	}

	logger.debug("loaded built course data", { size: JSON.stringify(builtCourseResult.data).length })

	// Parse the course data
	const courseParseResult = CourseSchema.safeParse(builtCourseResult.data)
	if (!courseParseResult.success) {
		logger.error("failed to parse course data", { error: courseParseResult.error })
		throw errors.wrap(courseParseResult.error, "failed to parse course data")
	}

	const course: Course = courseParseResult.data
	logger.info("parsed course data", {
		courseSourcedId: course.sourcedId,
		title: course.title,
		unitCount: Object.keys(course.children).length
	})

	type UnitAnalysis = {
		sourcedId: string
		title: string
		contentSourcedIds: SourcedId[]
		contentObjects: Model[]
		assessmentSourcedIds: SourcedId[]
		assessmentObjects: Model[]
	}

	type AnalysisResults = {
		course: {
			sourcedId: string
			title: string
			contentSourcedIds: SourcedId[]
			contentObjects: Model[]
		}
		units: UnitAnalysis[]
	}

	// Get course contents
	const courseContentSourcedIds = buildCourseContents(course)
	const courseContentObjects = resolveCourseContents(course, courseContentSourcedIds)

	const results: AnalysisResults = {
		course: {
			sourcedId: course.sourcedId,
			title: course.title,
			contentSourcedIds: courseContentSourcedIds,
			contentObjects: courseContentObjects
		},
		units: []
	}

	logger.debug("built course contents", { count: courseContentSourcedIds.length })

	// Process each unit
	for (const unit of Object.values(course.children)) {
		logger.debug("processing unit", { unitSourcedId: unit.sourcedId, title: unit.title })

		const unitContentSourcedIds = buildUnitContents(unit)
		const unitContentObjects = resolveUnitContents(unit, unitContentSourcedIds)

		const unitAssessmentSourcedIds = buildUnitAssessments(unit)
		const unitAssessmentObjects = resolveUnitAssessments(unit, unitAssessmentSourcedIds)

		results.units.push({
			sourcedId: unit.sourcedId,
			title: unit.title,
			contentSourcedIds: unitContentSourcedIds,
			contentObjects: unitContentObjects,
			assessmentSourcedIds: unitAssessmentSourcedIds,
			assessmentObjects: unitAssessmentObjects
		})

		logger.debug("processed unit", {
			unitSourcedId: unit.sourcedId,
			contentsCount: unitContentSourcedIds.length,
			assessmentsCount: unitAssessmentSourcedIds.length
		})
	}

	logger.info("completed analysis", {
		courseSourcedId: course.sourcedId,
		unitsProcessed: results.units.length,
		totalContents: results.course.contentSourcedIds.length,
		totalUnitContents: results.units.reduce((sum, unit) => sum + unit.contentSourcedIds.length, 0),
		totalAssessments: results.units.reduce((sum, unit) => sum + unit.assessmentSourcedIds.length, 0)
	})

	// Generate markdown content
	const markdownResult = errors.trySync(() => {
		let md = "# Course Analysis Results\n\n"
		md += `**Course**: ${course.title} (${course.sourcedId})\n\n`

		// buildCourseContents() results
		md += "## buildCourseContents() Results\n\n"
		md += `Found ${results.course.contentSourcedIds.length} course-level contents:\n\n`

		for (const content of results.course.contentObjects) {
			md += `- **${content.title}** (${content.type})\n`
			md += `  - sourcedId: \`${content.sourcedId}\`\n`
			md += `  - order: ${content.order}\n`
			if (content.description) {
				md += `  - description: ${content.description}\n`
			}
			md += "\n"
		}

		md += "### SourcedId Array\n\n"
		md += `\`\`\`json\n${JSON.stringify(results.course.contentSourcedIds, null, 2)}\n\`\`\`\n\n`

		md += "### Resolved Objects Array\n\n"
		const simplifiedCourseObjects = results.course.contentObjects.map((obj) => ({
			sourcedId: obj.sourcedId,
			type: obj.type,
			title: obj.title,
			order: obj.order,
			description: obj.description,
			childrenCount: "children" in obj ? Object.keys(obj.children).length : 0,
			resourcesCount: "resources" in obj ? Object.keys(obj.resources).length : 0
		}))
		md += `\`\`\`json\n${JSON.stringify(simplifiedCourseObjects, null, 2)}\n\`\`\`\n\n`

		// Process each unit
		for (const unit of results.units) {
			md += `## Unit: ${unit.title}\n\n`
			md += `**SourcedId**: \`${unit.sourcedId}\`\n\n`

			// buildUnitContents() results
			md += "### buildUnitContents() Results\n\n"
			md += `Found ${unit.contentSourcedIds.length} unit contents:\n\n`

			for (const content of unit.contentObjects) {
				md += `- **${content.title}** (${content.type})\n`
				md += `  - sourcedId: \`${content.sourcedId}\`\n`
				md += `  - order: ${content.order}\n`

				if (content.type === "lesson" && "resources" in content) {
					const resourceCount = Object.keys(content.resources).length
					md += `  - resources: ${resourceCount} items\n`
				}

				if ("questions" in content && content.questions) {
					md += `  - questions: ${content.questions.length}\n`
				}

				if (content.description) {
					md += `  - description: ${content.description}\n`
				}
				md += "\n"
			}

			md += "#### SourcedId Array\n\n"
			md += `\`\`\`json\n${JSON.stringify(unit.contentSourcedIds, null, 2)}\n\`\`\`\n\n`

			md += "#### Resolved Objects Array\n\n"
			const simplifiedUnitContentObjects = unit.contentObjects.map((obj) => ({
				sourcedId: obj.sourcedId,
				type: obj.type,
				title: obj.title,
				order: obj.order,
				description: obj.description,
				resourcesCount: "resources" in obj ? Object.keys(obj.resources).length : 0,
				questionsCount: "questions" in obj ? obj.questions.length : 0
			}))
			md += `\`\`\`json\n${JSON.stringify(simplifiedUnitContentObjects, null, 2)}\n\`\`\`\n\n`

			// buildUnitAssessments() results
			md += "### buildUnitAssessments() Results\n\n"
			md += `Found ${unit.assessmentSourcedIds.length} assessments:\n\n`

			for (const assessment of unit.assessmentObjects) {
				md += `- **${assessment.title}** (${assessment.type})\n`
				md += `  - sourcedId: \`${assessment.sourcedId}\`\n`
				md += `  - order: ${assessment.order}\n`

				if ("questions" in assessment && assessment.questions) {
					md += `  - questions: ${assessment.questions.length}\n`
				}

				if (assessment.description) {
					md += `  - description: ${assessment.description}\n`
				}
				md += "\n"
			}

			md += "#### SourcedId Array\n\n"
			md += `\`\`\`json\n${JSON.stringify(unit.assessmentSourcedIds, null, 2)}\n\`\`\`\n\n`

			md += "#### Resolved Objects Array\n\n"
			const simplifiedUnitAssessmentObjects = unit.assessmentObjects.map((obj) => ({
				sourcedId: obj.sourcedId,
				type: obj.type,
				title: obj.title,
				order: obj.order,
				description: obj.description,
				resourcesCount: "resources" in obj ? Object.keys(obj.resources).length : 0,
				questionsCount: "questions" in obj ? obj.questions.length : 0
			}))
			md += `\`\`\`json\n${JSON.stringify(simplifiedUnitAssessmentObjects, null, 2)}\n\`\`\`\n\n`

			md += "---\n\n"
		}

		return md
	})
	if (markdownResult.error) {
		logger.error("failed to generate markdown", { error: markdownResult.error })
		throw errors.wrap(markdownResult.error, "failed to generate markdown")
	}

	// Write results to file
	const outputResult = errors.trySync(() => {
		const outputPath = join(process.cwd(), "data", "oneroster", "analysis-results.md")
		writeFileSync(outputPath, markdownResult.data, "utf-8")
		return outputPath
	})
	if (outputResult.error) {
		logger.error("failed to write analysis results", { error: outputResult.error })
		throw errors.wrap(outputResult.error, "failed to write analysis results")
	}

	logger.info("analysis complete", { outputFile: outputResult.data })
}

const result = errors.trySync(() => main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}
