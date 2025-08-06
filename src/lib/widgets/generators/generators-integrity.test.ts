import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import * as errors from "@superbuilders/errors"

const generatorsDir = path.resolve(__dirname)

// Get the ground truth: the list of all widget generator source files.
const widgetSourceFiles = fs.readdirSync(generatorsDir).filter(
	(file) =>
		file.endsWith(".ts") && // Only TypeScript files
		!file.endsWith(".test.ts") && // Exclude test files
		!file.startsWith("generators.") && // Exclude old monolith test file
		!file.startsWith("zod-schema-ref") && // Exclude other meta-tests
		!file.startsWith("generators-integrity") && // Exclude this file itself
		file !== "index.ts" && // Exclude the index manifest
		file !== "types.ts" // Exclude shared types
)

describe("Widget Generator Test File Integrity", () => {
	test("should have found at least one widget generator file", () => {
		expect(widgetSourceFiles.length).toBeGreaterThan(0)
	})

	for (const sourceFile of widgetSourceFiles) {
		const testFileName = sourceFile.replace(".ts", ".test.ts")
		const testFilePath = path.join(generatorsDir, testFileName)

		describe(`Widget: ${sourceFile}`, () => {
			test(`should have a corresponding test file at '${testFileName}'`, () => {
				const testFileExists = fs.existsSync(testFilePath)
				if (!testFileExists) {
					throw errors.new(`Test file not found for ${sourceFile}. Please create ${testFileName}.`)
				}
				expect(testFileExists).toBe(true)
			})

			if (fs.existsSync(testFilePath)) {
				test("test file should contain at least one 'test' or 'it' block", () => {
					const testFileContent = fs.readFileSync(testFilePath, "utf8")
					const hasTestBlock = /test\(|it\(/.test(testFileContent)
					if (!hasTestBlock) {
						throw errors.new(`The test file ${testFileName} does not seem to contain any tests.`)
					}
					expect(hasTestBlock).toBe(true)
				})
			}
		})
	}
})
