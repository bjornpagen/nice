import { describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import { typedSchemas } from "@/lib/widgets/generators"

function readFileText(p: string): string {
	return fs.readFileSync(p, "utf8")
}

function extractGeneratorCases(source: string): string[] {
	const cases: string[] = []
	const caseRegex = /case\s+"([A-Za-z0-9_]+)"\s*:/g
	let m: RegExpExecArray | null
	m = caseRegex.exec(source)
	while (m !== null) {
		if (m[1]) {
			cases.push(m[1])
		}
		m = caseRegex.exec(source)
	}
	return cases
}

function extractPromptWidgetKeys(source: string): string[] {
	// Capture the array literal assigned to widgetTypeKeys
	const start = source.indexOf("const widgetTypeKeys")
	if (start === -1) return []
	const slice = source.slice(start)
	const arrayMatch = slice.match(/=\s*\[(.*?)\]/s)
	if (!arrayMatch || !arrayMatch[1]) return []
	const inner = arrayMatch[1]
	const itemRegex = /"([A-Za-z0-9_]+)"/g
	const items: string[] = []
	let m: RegExpExecArray | null
	m = itemRegex.exec(inner)
	while (m !== null) {
		if (m[1]) {
			items.push(m[1])
		}
		m = itemRegex.exec(inner)
	}
	return items
}

describe("Widget type consistency", () => {
	test("all widget types in typedSchemas are handled by widget-generator.ts", () => {
		const widgetGenPath = path.resolve(__dirname, "../qti-generation/widget-generator.ts")
		const generatorSource = readFileText(widgetGenPath)

		const schemaKeys = Object.keys(typedSchemas).sort()
		const generatorCases = extractGeneratorCases(generatorSource).sort()

		const inSchemasNotInGenerator = schemaKeys.filter((k) => !generatorCases.includes(k))
		const inGeneratorNotInSchemas = generatorCases.filter((k) => !schemaKeys.includes(k))

		expect(inSchemasNotInGenerator).toEqual([])
		expect(inGeneratorNotInSchemas).toEqual([])
		expect(generatorCases.length).toBe(schemaKeys.length)
	})

	test("all widget types in typedSchemas are listed in prompts.ts", () => {
		const promptsPath = path.resolve(__dirname, "../qti-generation/structured/prompts.ts")
		const promptSource = readFileText(promptsPath)

		const schemaKeys = Object.keys(typedSchemas).sort()
		const promptKeys = extractPromptWidgetKeys(promptSource).sort()

		const inSchemasNotInPrompt = schemaKeys.filter((k) => !promptKeys.includes(k))
		const inPromptNotInSchemas = promptKeys.filter((k) => !schemaKeys.includes(k))

		expect(inSchemasNotInPrompt).toEqual([])
		expect(inPromptNotInSchemas).toEqual([])
		expect(promptKeys.length).toBe(schemaKeys.length)
	})

	test("widget count is as expected", () => {
		const schemaKeys = Object.keys(typedSchemas)
		// Update this number when adding/removing widgets
		const EXPECTED_WIDGET_COUNT = 51
		expect(schemaKeys.length).toBe(EXPECTED_WIDGET_COUNT)
	})
})
