import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { buildCourseContents, buildUnitAssessments, buildUnitContents, type Course, CourseSchema } from "@/lib/v3/types"

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
		contents: ReturnType<typeof buildUnitContents>
		assessments: ReturnType<typeof buildUnitAssessments>
	}

	type AnalysisResults = {
		course: {
			sourcedId: string
			title: string
			contents: ReturnType<typeof buildCourseContents>
		}
		units: UnitAnalysis[]
	}

	const results: AnalysisResults = {
		course: {
			sourcedId: course.sourcedId,
			title: course.title,
			contents: buildCourseContents(course)
		},
		units: []
	}

	logger.debug("built course contents", { count: results.course.contents.length })

	// Process each unit
	for (const unit of Object.values(course.children)) {
		logger.debug("processing unit", { unitSourcedId: unit.sourcedId, title: unit.title })

		const unitContents = buildUnitContents(unit)
		const unitAssessments = buildUnitAssessments(unit)

		results.units.push({
			sourcedId: unit.sourcedId,
			title: unit.title,
			contents: unitContents,
			assessments: unitAssessments
		})

		logger.debug("processed unit", {
			unitSourcedId: unit.sourcedId,
			contentsCount: unitContents.length,
			assessmentsCount: unitAssessments.length
		})
	}

	logger.info("completed analysis", {
		courseSourcedId: course.sourcedId,
		unitsProcessed: results.units.length,
		totalContents: results.course.contents.length,
		totalUnitContents: results.units.reduce((sum, unit) => sum + unit.contents.length, 0),
		totalAssessments: results.units.reduce((sum, unit) => sum + unit.assessments.length, 0)
	})

	// Generate markdown content
	const markdownResult = errors.trySync(() => {
		let md = "# Course Analysis Results\n\n"
		md += `**Course**: ${course.title} (${course.sourcedId})\n\n`

		// buildCourseContents() results
		md += "## buildCourseContents() Results\n\n"
		md += `Found ${results.course.contents.length} course-level contents:\n\n`

		for (const content of results.course.contents) {
			md += `- **${content.title}** (${content.type})\n`
			md += `  - sourcedId: \`${content.sourcedId}\`\n`
			md += `  - order: ${content.order}\n`
			if (content.description) {
				md += `  - description: ${content.description}\n`
			}
			md += "\n"
		}

		md += "### Raw JSON Data\n\n"
		md += `\`\`\`json\n${JSON.stringify(results.course.contents, null, 2)}\n\`\`\`\n\n`

		// Process each unit
		for (const unit of results.units) {
			md += `## Unit: ${unit.title}\n\n`
			md += `**SourcedId**: \`${unit.sourcedId}\`\n\n`

			// buildUnitContents() results
			md += "### buildUnitContents() Results\n\n"
			md += `Found ${unit.contents.length} unit contents:\n\n`

			for (const content of unit.contents) {
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

			md += "#### Raw JSON Data\n\n"
			md += `\`\`\`json\n${JSON.stringify(unit.contents, null, 2)}\n\`\`\`\n\n`

			// buildUnitAssessments() results
			md += "### buildUnitAssessments() Results\n\n"
			md += `Found ${unit.assessments.length} assessments:\n\n`

			for (const assessment of unit.assessments) {
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

			md += "#### Raw JSON Data\n\n"
			md += `\`\`\`json\n${JSON.stringify(unit.assessments, null, 2)}\n\`\`\`\n\n`

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
