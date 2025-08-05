import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"

// --- Configuration ---
// Adjust these paths for your project structure
const generatorsDir = path.resolve(__dirname)
const indexFilePath = path.join(generatorsDir, "index.ts")
const widgetGeneratorFilePath = path.resolve(__dirname, "../../qti-generation/widget-generator.ts")
const testFilePath = path.join(generatorsDir, "generators.test.ts")

// --- Helper Functions ---
/**
 * Converts a kebab-case filename into camelCase for widget types.
 * e.g., "absolute-value-number-line" -> "absoluteValueNumberLine"
 */
const kebabToCamel = (s: string) => s.replace(/-./g, (x) => x[1]?.toUpperCase() ?? "")

/**
 * Converts a kebab-case filename to the expected generator function name.
 * e.g., "absolute-value-number-line" -> "generateAbsoluteValueNumberLine"
 */
const kebabToGeneratorName = (s: string) => `generate${s.charAt(0).toUpperCase() + kebabToCamel(s).slice(1)}`

/**
 * Special case handling for numeric-prefixed files
 * e.g., "3d-intersection-diagram" -> "3dIntersectionDiagram" (keeps the number)
 */
const kebabToCamelSpecial = (s: string) => {
	// Handle special case for 3d- prefix
	if (s.startsWith("3d-")) {
		return `3d${s
			.slice(3)
			.split("-")
			.map((part, i) =>
				i === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part.charAt(0).toUpperCase() + part.slice(1)
			)
			.join("")}`
	}
	return kebabToCamel(s)
}

/**
 * Generator name for special cases
 * e.g., "3d-intersection-diagram" -> "generateThreeDIntersectionDiagram"
 */
const kebabToGeneratorNameSpecial = (s: string) => {
	if (s.startsWith("3d-")) {
		return `generateThreeD${s
			.slice(3)
			.split("-")
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join("")}`
	}
	return kebabToGeneratorName(s)
}

// --- Test Suite ---
describe("Widget Generator System Integrity", () => {
	// 1. Get the ground truth: the list of all widget files.
	const widgetFiles = fs.readdirSync(generatorsDir).filter(
		(file) =>
			file.endsWith(".ts") && // Only TypeScript files
			!file.endsWith(".test.ts") && // Exclude test files
			file !== "index.ts" && // Exclude the index manifest itself
			file !== "types.ts" && // Exclude shared types
			file !== "widget-generator.ts" // Exclude the dispatcher
	)

	// 2. Read the content of the files we need to check.
	const indexFileContent = fs.readFileSync(indexFilePath, "utf8")
	const widgetGeneratorFileContent = fs.readFileSync(widgetGeneratorFilePath, "utf8")
	const testFileContent = fs.readFileSync(testFilePath, "utf8")

	// 3. Dynamically create a test suite for each discovered widget file.
	test("should have found at least one widget generator file", () => {
		expect(widgetFiles.length).toBeGreaterThan(0)
	})

	for (const widgetFile of widgetFiles) {
		const fileBaseName = widgetFile.replace(".ts", "") // e.g., "absolute-value-number-line"
		const widgetType = fileBaseName.startsWith("3d-") ? kebabToCamelSpecial(fileBaseName) : kebabToCamel(fileBaseName)
		const generatorName = fileBaseName.startsWith("3d-")
			? kebabToGeneratorNameSpecial(fileBaseName)
			: kebabToGeneratorName(fileBaseName)

		describe(`Widget: ${fileBaseName}`, () => {
			test("should be correctly registered in the manifest (generators/index.ts)", () => {
				// Check for the import statement
				expect(indexFileContent).toInclude(`from "./${fileBaseName}"`)

				// Check for its inclusion in the `typedSchemas` object
				// Handle special case for "3dIntersectionDiagram" which uses quotes
				const schemaKey = widgetType === "3dIntersectionDiagram" ? `"3dIntersectionDiagram"` : widgetType
				expect(indexFileContent).toInclude(`${schemaKey}:`)

				// Check for its inclusion in the discriminated union
				// Special handling for 3dIntersectionDiagram which uses array notation
				if (widgetType === "3dIntersectionDiagram") {
					expect(indexFileContent).toInclude(`typedSchemas["3dIntersectionDiagram"]`)
				} else {
					expect(indexFileContent).toInclude(`typedSchemas.${widgetType}`)
				}

				// Check for its generator function being exported
				expect(indexFileContent).toInclude(generatorName)
			})

			test("should be handled in the dispatcher (widget-generator.ts)", () => {
				// Check for the import from the manifest
				expect(widgetGeneratorFileContent).toInclude(generatorName)

				// Check for a case in the switch statement
				expect(widgetGeneratorFileContent).toInclude(`case "${widgetType}":`)
			})

			test("should have a test suite in the integration test file (generators.test.ts)", () => {
				// Check that a describe block exists for this generator
				expect(testFileContent).toInclude(`describe("${generatorName}"`)
			})
		})
	}
})
