#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as fs from "node:fs"
import * as fsp from "node:fs/promises"
import * as path from "node:path"
import { parseCoverageMarkdown } from "@/lib/parsers/coverage-markdown"
import { generateSupplementaryPayload } from "@/lib/payloads/oneroster/supplementary-builder"

interface GradeConfig {
	grade: string
	ordinal: string
	markdownFile: string
}

const GRADE_CONFIGS: Record<string, GradeConfig> = {
	"4": {
		grade: "4",
		ordinal: "4th",
		markdownFile: "khan-coverage-report-4th.md"
	},
	"5": {
		grade: "5",
		ordinal: "5th",
		markdownFile: "khan-coverage-report-5th.md"
	},
	"6": {
		grade: "6",
		ordinal: "6th",
		markdownFile: "khan-coverage-report-6th.md"
	},
	"7": {
		grade: "7",
		ordinal: "7th",
		markdownFile: "khan-coverage-report-7th.md"
	},
	"8": {
		grade: "8",
		ordinal: "8th",
		markdownFile: "khan-coverage-report.md" // 8th grade uses the base file
	}
}

async function main(): Promise<void> {
	// Parse command line arguments
	const args = process.argv.slice(2)
	if (args.length !== 1) {
		console.error("Usage: bun run scripts/generate-supplementary-course.ts --{4|5|6|7|8}")
		process.exit(1)
	}
	
	const gradeFlag = args[0]
	if (!gradeFlag?.startsWith("--")) {
		console.error("Invalid flag format. Use --4, --5, --6, --7, or --8")
		process.exit(1)
	}
	
	const gradeNumber = gradeFlag.substring(2)
	const config = GRADE_CONFIGS[gradeNumber]
	if (!config) {
		console.error(`Invalid grade: ${gradeNumber}. Use --4, --5, --6, --7, or --8`)
		process.exit(1)
	}
	
	logger.info("starting supplementary course generation", { grade: gradeNumber })
	
	// Check if coverage file exists
	const markdownPath = path.join(process.cwd(), config.markdownFile)
	if (!fs.existsSync(markdownPath)) {
		if (gradeNumber === "4" || gradeNumber === "5") {
			logger.warn("coverage file not available yet", { 
				grade: gradeNumber,
				file: config.markdownFile 
			})
			console.log(`Coverage data for ${config.ordinal} grade is not available yet.`)
			process.exit(0)
		} else {
			logger.error("coverage file not found", { 
				grade: gradeNumber,
				file: config.markdownFile,
				path: markdownPath
			})
			throw errors.new(`coverage file not found: ${config.markdownFile}`)
		}
	}
	
	// Read and parse the markdown file
	const markdownResult = await errors.try(fsp.readFile(markdownPath, "utf-8"))
	if (markdownResult.error) {
		logger.error("failed to read markdown file", { error: markdownResult.error })
		throw errors.wrap(markdownResult.error, "read markdown file")
	}
	
	// Parse the coverage data
	const coverage = parseCoverageMarkdown(markdownResult.data, config.ordinal)
	
	// Generate course metadata
	const courseTitle = `${config.ordinal} Grade Supplementary Math Course`
	const courseSlug = `supp-${config.ordinal.toLowerCase()}-grade-math`
	const courseDescription = `A supplementary math course covering ${config.ordinal} grade Common Core State Standards with curated Khan Academy content`
	
	logger.info("generating oneroster payload", {
		courseTitle,
		courseSlug,
		unitCount: coverage.units.length
	})
	
	// Generate the OneRoster payload
	const payloadResult = await errors.try(generateSupplementaryPayload(
		coverage,
		courseTitle,
		courseSlug,
		courseDescription
	))
	if (payloadResult.error) {
		logger.error("failed to generate payload", { error: payloadResult.error })
		throw errors.wrap(payloadResult.error, "generate payload")
	}
	const payload = payloadResult.data
	
	// Create output directory
	const outputDir = path.join(process.cwd(), "data", courseSlug, "oneroster")
	const mkdirResult = await errors.try(fsp.mkdir(outputDir, { recursive: true }))
	if (mkdirResult.error) {
		logger.error("failed to create output directory", { error: mkdirResult.error })
		throw errors.wrap(mkdirResult.error, "create output directory")
	}
	
	// Write individual JSON files
	const files = [
		{ name: "course.json", data: payload.course },
		{ name: "class.json", data: payload.class },
		{ name: "courseComponents.json", data: payload.courseComponents },
		{ name: "resources.json", data: payload.resources },
		{ name: "componentResources.json", data: payload.componentResources },
		{ name: "assessmentLineItems.json", data: payload.assessmentLineItems }
	]
	
	for (const file of files) {
		const filePath = path.join(outputDir, file.name)
		const writeResult = await errors.try(
			fsp.writeFile(filePath, JSON.stringify(file.data, null, 2))
		)
		if (writeResult.error) {
			logger.error("failed to write file", { 
				file: file.name, 
				error: writeResult.error 
			})
			throw errors.wrap(writeResult.error, `write ${file.name}`)
		}
		logger.info("wrote file", { 
			file: file.name,
			path: filePath,
			size: Array.isArray(file.data) ? file.data.length : 1
		})
	}
	
	// Log summary
	logger.info("supplementary course generation complete", {
		grade: config.ordinal,
		outputDir,
		courseSlug,
		unitCount: payload.courseComponents.filter(c => !c.parent).length,
		lessonCount: payload.courseComponents.filter(c => c.parent).length,
		resourceCount: payload.resources.length,
		assessmentLineItemCount: payload.assessmentLineItems.length
	})
	
	console.log(`\n✅ Successfully generated ${config.ordinal} grade supplementary course`)
	console.log(`📁 Output: ${outputDir}/`)
	console.log(`   - course.json`)
	console.log(`   - class.json`)
	console.log(`   - courseComponents.json (${payload.courseComponents.length} items)`)
	console.log(`   - resources.json (${payload.resources.length} items)`)
	console.log(`   - componentResources.json (${payload.componentResources.length} items)`)
	console.log(`   - assessmentLineItems.json (${payload.assessmentLineItems.length} items)`)
	
	process.exit(0)
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	console.error("❌ Script failed:", result.error.toString())
	process.exit(1)
}
