/**
 * Deep Analysis Script for Perseus Widget-Not-Found Questions
 *
 * This script performs comprehensive data-driven analysis on Perseus questions
 * that failed QTI conversion due to missing widget generators.
 *
 * Prerequisites:
 * - widget-not-found-perseus-data.md must exist (created by dump-widget-not-found-perseus-data.ts)
 *
 * Usage:
 *   bun run scripts/analyze-widget-not-found.ts
 *
 * Output:
 *   - Console output with detailed analysis
 *   - widget-not-found-analysis.md with comprehensive report
 */

import * as fs from "node:fs"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

// Types for our analysis
interface WidgetInfo {
	type: string
	count: number
	questions: string[]
	coOccurrences: Map<string, number>
	exerciseSlugs: Set<string>
	exerciseTitles: Set<string>
}

interface QuestionAnalysis {
	id: string
	widgets: string[]
	exerciseSlug: string
	exerciseTitle: string
	exerciseId: string
	complexity: number // Number of widgets in the question
	hasInteractiveElements: boolean
	hasMathElements: boolean
}

interface ExerciseAnalysis {
	slug: string
	title: string
	questionCount: number
	uniqueWidgetTypes: Set<string>
	avgComplexity: number
}

// Widget types we DO have generators for
export const OUR_WIDGET_GENERATORS = new Set([
	"3dIntersectionDiagram",
	"absoluteValueNumberLine",
	"angleDiagram",
	"barChart",
	"boxGrid",
	"boxPlot",
	"circleDiagram",
	"compositeShapeDiagram",
	"coordinatePlane",
	"dataTable",
	"discreteObjectRatioDiagram",
	"dotPlot",
	"doubleNumberLine",
	"emojiImage",
	"fractionNumberLine",
	"geometricSolidDiagram",
	"hangerDiagram",
	"histogram",
	"inequalityNumberLine",
	"numberLine",
	"numberLineForOpposites",
	"numberLineWithAction",
	"numberLineWithFractionGroups",
	"numberSetDiagram",
	"partitionedShape",
	"pictograph",
	"polyhedronDiagram",
	"probabilitySpinner",
	"polyhedronNetDiagram",
	"pythagoreanProofDiagram",
	"ratioBoxDiagram",
	"scatterPlot",
	"stackedItemsDiagram",
	"tapeDiagram",
	"transformationDiagram",
	"treeDiagram",
	"triangleDiagram",
	"unitBlockDiagram",
	"vennDiagram",
	"verticalArithmeticSetup"
])

// Categorize widget types
const DEFINITELY_MISSING = new Set([
	"definition",
	"dropdown",
	"explanation",
	"expression",
	"group",
	"input-number",
	"interaction",
	"interactive-graph",
	"matcher",
	"multiple",
	"radio"
])

const POSSIBLY_HANDLED_DIFFERENTLY = new Set([
	"image", // We handle images but maybe not as widgets
	"label", // These might be sub-components
	"line", // These might be sub-components
	"point", // These might be sub-components
	"rectangle", // These might be sub-components
	"movable-point", // These might be sub-components
	"table", // We have dataTable
	"number-line", // We have several number line variants
	"numeric-input" // Different naming convention?
])

const INTERACTIVE_WIDGETS = new Set([
	"interaction",
	"interactive-graph",
	"movable-point",
	"matcher",
	"dropdown",
	"radio",
	"multiple",
	"input-number",
	"expression",
	"numeric-input"
])

const MATH_WIDGETS = new Set([
	"expression",
	"interactive-graph",
	"number-line",
	"numeric-input",
	"input-number",
	"coordinate-plane"
])

async function parseMarkdownData(filePath: string): Promise<QuestionAnalysis[]> {
	const readResult = await errors.try(fs.promises.readFile(filePath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read markdown file", { error: readResult.error })
		throw errors.wrap(readResult.error, "read markdown file")
	}

	const content = readResult.data
	const sections = content.split("## Question ID: ")
	const questions: QuestionAnalysis[] = []

	for (const section of sections.slice(1)) {
		const lines = section.split("\n")
		const questionId = lines[0]?.trim() || ""

		if (!questionId) continue

		// Extract exercise info
		let exerciseSlug = ""
		let exerciseTitle = ""
		let exerciseId = ""

		for (const line of lines) {
			if (line.startsWith("**Exercise Slug**:")) {
				exerciseSlug = line.replace("**Exercise Slug**:", "").trim()
			} else if (line.startsWith("**Exercise Title**:")) {
				exerciseTitle = line.replace("**Exercise Title**:", "").trim()
			} else if (line.startsWith("**Exercise ID**:")) {
				exerciseId = line.replace("**Exercise ID**:", "").trim()
			}
		}

		// Extract widget types
		const widgets = new Set<string>()
		const typeMatches = section.match(/"type": "([^"]+)"/g)

		if (typeMatches) {
			for (const match of typeMatches) {
				const type = match.match(/"type": "([^"]+)"/)?.[1]
				if (type) {
					widgets.add(type)
				}
			}
		}

		const widgetArray = Array.from(widgets)
		const hasInteractive = widgetArray.some((w) => INTERACTIVE_WIDGETS.has(w))
		const hasMath = widgetArray.some((w) => MATH_WIDGETS.has(w))

		questions.push({
			id: questionId,
			widgets: widgetArray,
			exerciseSlug,
			exerciseTitle,
			exerciseId,
			complexity: widgetArray.length,
			hasInteractiveElements: hasInteractive,
			hasMathElements: hasMath
		})
	}

	return questions
}

function analyzeWidgets(questions: QuestionAnalysis[]): Map<string, WidgetInfo> {
	const widgetMap = new Map<string, WidgetInfo>()

	// Initialize widget info
	for (const question of questions) {
		for (const widget of question.widgets) {
			if (!widgetMap.has(widget)) {
				widgetMap.set(widget, {
					type: widget,
					count: 0,
					questions: [],
					coOccurrences: new Map(),
					exerciseSlugs: new Set(),
					exerciseTitles: new Set()
				})
			}

			const info = widgetMap.get(widget)
			if (!info) continue
			info.count++
			info.questions.push(question.id)
			if (question.exerciseSlug && question.exerciseSlug !== "N/A") {
				info.exerciseSlugs.add(question.exerciseSlug)
			}
			if (question.exerciseTitle && question.exerciseTitle !== "N/A") {
				info.exerciseTitles.add(question.exerciseTitle)
			}

			// Track co-occurrences
			for (const otherWidget of question.widgets) {
				if (otherWidget !== widget) {
					info.coOccurrences.set(otherWidget, (info.coOccurrences.get(otherWidget) || 0) + 1)
				}
			}
		}
	}

	return widgetMap
}

function analyzeExercises(questions: QuestionAnalysis[]): Map<string, ExerciseAnalysis> {
	const exerciseMap = new Map<string, ExerciseAnalysis>()

	for (const question of questions) {
		const slug = question.exerciseSlug
		if (!slug || slug === "N/A") continue

		if (!exerciseMap.has(slug)) {
			exerciseMap.set(slug, {
				slug,
				title: question.exerciseTitle,
				questionCount: 0,
				uniqueWidgetTypes: new Set(),
				avgComplexity: 0
			})
		}

		const exercise = exerciseMap.get(slug)
		if (!exercise) continue
		exercise.questionCount++
		for (const w of question.widgets) {
			exercise.uniqueWidgetTypes.add(w)
		}
	}

	// Calculate average complexity
	for (const [slug, exercise] of exerciseMap) {
		const exerciseQuestions = questions.filter((q) => q.exerciseSlug === slug)
		const totalComplexity = exerciseQuestions.reduce((sum, q) => sum + q.complexity, 0)
		exercise.avgComplexity = totalComplexity / exercise.questionCount
	}

	return exerciseMap
}

function generateReport(
	questions: QuestionAnalysis[],
	widgetAnalysis: Map<string, WidgetInfo>,
	exerciseAnalysis: Map<string, ExerciseAnalysis>
): string {
	let report = "# Comprehensive Analysis: Perseus Widget-Not-Found Questions\n\n"
	report += `Generated on: ${new Date().toISOString()}\n\n`
	report += "---\n\n"

	// Executive Summary
	report += "## 📊 Executive Summary\n\n"

	const totalQuestions = questions.length
	const trulyMissingQuestions = questions.filter((q) => q.widgets.some((w) => DEFINITELY_MISSING.has(w)))
	const possiblyHandledQuestions = questions.filter(
		(q) =>
			!q.widgets.some((w) => DEFINITELY_MISSING.has(w)) && q.widgets.some((w) => POSSIBLY_HANDLED_DIFFERENTLY.has(w))
	)

	report += `- **Total Questions Analyzed**: ${totalQuestions}\n`
	report += `- **Questions with Definitely Missing Widgets**: ${trulyMissingQuestions.length} (${((trulyMissingQuestions.length / totalQuestions) * 100).toFixed(1)}%)\n`
	report += `- **Questions with Possibly Handled Widgets**: ${possiblyHandledQuestions.length} (${((possiblyHandledQuestions.length / totalQuestions) * 100).toFixed(1)}%)\n`
	report += `- **Unique Widget Types Found**: ${widgetAnalysis.size}\n`
	report += `- **Unique Exercises Affected**: ${exerciseAnalysis.size}\n\n`

	// Widget Type Analysis
	report += "## 🔧 Widget Type Analysis\n\n"
	report += "### Definitely Missing Widgets (We Don't Have Generators)\n\n"

	const sortedMissingWidgets = Array.from(widgetAnalysis.entries())
		.filter(([type]) => DEFINITELY_MISSING.has(type))
		.sort(([, a], [, b]) => b.count - a.count)

	report += "| Widget Type | Count | % of Questions | Top Co-occurring Widgets | # Exercises |\n"
	report += "|-------------|-------|----------------|--------------------------|-------------|\n"

	for (const [type, info] of sortedMissingWidgets) {
		const percentage = ((info.count / totalQuestions) * 100).toFixed(1)
		const topCoOccurrences = Array.from(info.coOccurrences.entries())
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3)
			.map(([widget, count]) => `${widget}(${count})`)
			.join(", ")

		report += `| **${type}** | ${info.count} | ${percentage}% | ${topCoOccurrences} | ${info.exerciseSlugs.size} |\n`
	}

	report += "\n### Possibly Handled Differently (May Have Alternative Solutions)\n\n"

	const sortedPossibleWidgets = Array.from(widgetAnalysis.entries())
		.filter(([type]) => POSSIBLY_HANDLED_DIFFERENTLY.has(type))
		.sort(([, a], [, b]) => b.count - a.count)

	report += "| Widget Type | Count | % of Questions | Our Potential Alternative |\n"
	report += "|-------------|-------|----------------|---------------------------|\n"

	for (const [type, info] of sortedPossibleWidgets) {
		const percentage = ((info.count / totalQuestions) * 100).toFixed(1)
		let alternative = ""

		if (type === "table") alternative = "dataTable"
		else if (type === "number-line") alternative = "numberLine variants"
		else if (type === "numeric-input") alternative = "input handling system"
		else if (type === "image") alternative = "image processing"
		else if (["label", "line", "point", "rectangle", "movable-point"].includes(type)) {
			alternative = "sub-components of interaction/coordinatePlane"
		}

		report += `| ${type} | ${info.count} | ${percentage}% | ${alternative} |\n`
	}

	// Question Complexity Analysis
	report += "\n## 📈 Question Complexity Analysis\n\n"

	const complexityDistribution = new Map<number, number>()
	for (const question of questions) {
		complexityDistribution.set(question.complexity, (complexityDistribution.get(question.complexity) || 0) + 1)
	}

	report += "### Widget Count Distribution\n\n"
	report += "| # Widgets | # Questions | % of Total |\n"
	report += "|-----------|-------------|------------|\n"

	const sortedComplexity = Array.from(complexityDistribution.entries()).sort(([a], [b]) => a - b)
	for (const [widgetCount, questionCount] of sortedComplexity) {
		const percentage = ((questionCount / totalQuestions) * 100).toFixed(1)
		report += `| ${widgetCount} | ${questionCount} | ${percentage}% |\n`
	}

	// Exercise Analysis
	report += "\n## 📚 Exercise Analysis\n\n"
	report += "### Top 10 Exercises by Question Count\n\n"

	const sortedExercises = Array.from(exerciseAnalysis.entries())
		.sort(([, a], [, b]) => b.questionCount - a.questionCount)
		.slice(0, 10)

	report += "| Exercise Title | Questions | Avg Complexity | Unique Widgets |\n"
	report += "|----------------|-----------|----------------|----------------|\n"

	for (const [, exercise] of sortedExercises) {
		report += `| ${exercise.title} | ${exercise.questionCount} | ${exercise.avgComplexity.toFixed(1)} | ${exercise.uniqueWidgetTypes.size} |\n`
	}

	// Interactive vs Math Analysis
	report += "\n## 🎯 Content Type Analysis\n\n"

	const interactiveQuestions = questions.filter((q) => q.hasInteractiveElements)
	const mathQuestions = questions.filter((q) => q.hasMathElements)
	const bothTypes = questions.filter((q) => q.hasInteractiveElements && q.hasMathElements)

	report += `- **Interactive Questions**: ${interactiveQuestions.length} (${((interactiveQuestions.length / totalQuestions) * 100).toFixed(1)}%)\n`
	report += `- **Math Questions**: ${mathQuestions.length} (${((mathQuestions.length / totalQuestions) * 100).toFixed(1)}%)\n`
	report += `- **Both Interactive & Math**: ${bothTypes.length} (${((bothTypes.length / totalQuestions) * 100).toFixed(1)}%)\n\n`

	// Implementation Priority
	report += "## 🎯 Implementation Priority Recommendations\n\n"
	report += "### Immediate Impact (Top 3)\n\n"

	const top3Missing = sortedMissingWidgets.slice(0, 3)
	let cumulativeQuestions = new Set<string>()

	for (const [type, info] of top3Missing) {
		for (const q of info.questions) {
			cumulativeQuestions.add(q)
		}
		const uniqueQuestions = cumulativeQuestions.size
		const coverage = ((uniqueQuestions / trulyMissingQuestions.length) * 100).toFixed(1)

		report += `#### ${type}\n`
		report += `- **Questions Affected**: ${info.count}\n`
		report += `- **Cumulative Coverage**: ${coverage}% of missing widget questions\n`
		report += `- **Common Exercise Types**: ${Array.from(info.exerciseTitles).slice(0, 3).join(", ")}\n`
		report += `- **Co-occurs with**: ${Array.from(info.coOccurrences.entries())
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3)
			.map(([w]) => w)
			.join(", ")}\n\n`
	}

	// Widget Combination Patterns
	report += "### Common Widget Combinations\n\n"

	const combinationMap = new Map<string, number>()
	for (const question of questions) {
		if (question.widgets.length > 1) {
			const combo = question.widgets.sort().join(" + ")
			combinationMap.set(combo, (combinationMap.get(combo) || 0) + 1)
		}
	}

	const topCombinations = Array.from(combinationMap.entries())
		.sort(([, a], [, b]) => b - a)
		.slice(0, 10)

	report += "| Widget Combination | Count |\n"
	report += "|-------------------|-------|\n"

	for (const [combo, count] of topCombinations) {
		report += `| ${combo} | ${count} |\n`
	}

	// Question ID Lists
	report += "\n## 📋 Question ID Lists\n\n"
	report += "### Questions with Only Definitely Missing Widgets\n\n"

	const onlyMissingWidgets = trulyMissingQuestions
		.filter((q) => q.widgets.every((w) => DEFINITELY_MISSING.has(w)))
		.map((q) => q.id)
		.sort()

	report += `Total: ${onlyMissingWidgets.length} questions\n\n`
	report += "```\n"
	for (let i = 0; i < onlyMissingWidgets.length; i += 10) {
		report += `${onlyMissingWidgets.slice(i, i + 10).join(", ")}\n`
	}
	report += "```\n\n"

	// Data Quality Issues
	report += "## ⚠️ Data Quality Observations\n\n"

	const noExerciseInfo = questions.filter((q) => !q.exerciseSlug || q.exerciseSlug === "N/A")
	const singleWidgetQuestions = questions.filter((q) => q.complexity === 1)
	const highComplexityQuestions = questions.filter((q) => q.complexity >= 5)

	report += `- **Questions without exercise info**: ${noExerciseInfo.length}\n`
	report += `- **Single-widget questions**: ${singleWidgetQuestions.length}\n`
	report += `- **High-complexity questions (5+ widgets)**: ${highComplexityQuestions.length}\n\n`

	// Conclusion
	report += "## 💡 Key Insights & Recommendations\n\n"
	report += "1. **Widget Priority**: Implementing `radio`, `explanation`, and `input-number` would resolve "
	report += `${((cumulativeQuestions.size / trulyMissingQuestions.length) * 100).toFixed(1)}% of missing widget issues.\n\n`

	report += "2. **Exercise Patterns**: Certain exercises heavily rely on specific widget types. "
	report += "Consider exercise-specific solutions for high-impact exercises.\n\n"

	report += "3. **Widget Combinations**: Many questions use multiple widgets together. "
	report += "Ensure new widget implementations work well in combination.\n\n"

	report += "4. **False Positive Rate**: Approximately "
	report += `${((possiblyHandledQuestions.length / totalQuestions) * 100).toFixed(1)}% of reported failures `
	report += "might be resolvable with existing tools or naming adjustments.\n\n"

	return report
}

async function main() {
	logger.info("starting widget-not-found analysis")

	const inputPath = path.join(process.cwd(), "widget-not-found-perseus-data.md")
	const outputPath = path.join(process.cwd(), "widget-not-found-analysis.md")

	// Parse the markdown data
	logger.debug("parsing markdown data")
	const questions = await parseMarkdownData(inputPath)
	logger.info("parsed questions", { count: questions.length })

	// Perform analyses
	logger.debug("analyzing widgets")
	const widgetAnalysis = analyzeWidgets(questions)

	logger.debug("analyzing exercises")
	const exerciseAnalysis = analyzeExercises(questions)

	// Generate comprehensive report
	logger.debug("generating report")
	const report = generateReport(questions, widgetAnalysis, exerciseAnalysis)

	// Write report to file
	const writeResult = await errors.try(fs.promises.writeFile(outputPath, report, "utf-8"))
	if (writeResult.error) {
		logger.error("failed to write analysis report", { error: writeResult.error })
		throw errors.wrap(writeResult.error, "write analysis report")
	}

	// Also output key findings to logger
	logger.info("================================================================================")
	logger.info("WIDGET-NOT-FOUND ANALYSIS COMPLETE")
	logger.info("================================================================================")

	// Summary
	const trulyMissing = questions.filter((q) => q.widgets.some((w) => DEFINITELY_MISSING.has(w)))
	logger.info("summary", {
		totalQuestions: questions.length,
		missingWidgetQuestions: trulyMissing.length,
		successRateIfFixed: `${(((questions.length - trulyMissing.length) / questions.length) * 100).toFixed(1)}%`
	})

	logger.info("top 5 missing widget types:")
	const topMissing = Array.from(widgetAnalysis.entries())
		.filter(([type]) => DEFINITELY_MISSING.has(type))
		.sort(([, a], [, b]) => b.count - a.count)
		.slice(0, 5)

	for (const [type, info] of topMissing) {
		logger.info("missing widget", { type, count: info.count })
	}

	logger.info("analysis report written", { outputPath })

	logger.info("analysis completed", {
		outputFile: outputPath,
		totalQuestions: questions.length,
		missingWidgetQuestions: trulyMissing.length
	})
}

// Run the script
const result = await errors.try(main())
if (result.error) {
	logger.error("analysis failed", { error: result.error })
	process.exit(1)
}

process.exit(0)
