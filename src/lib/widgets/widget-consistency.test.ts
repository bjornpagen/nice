import { describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import { mathCoreCollection } from "@/lib/widget-collections/math-core"
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

// Removed prompt parsing: prompts.ts no longer contains a static list of widget keys.

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

	test("all math-core collection keys are defined in typedSchemas", () => {
		const schemaKeys = Object.keys(typedSchemas)
		const collectionKeys = [...mathCoreCollection.widgetTypeKeys]

		const inCollectionNotInSchemas = collectionKeys.filter((k) => !schemaKeys.includes(k))
		expect(inCollectionNotInSchemas).toEqual([])
	})

	test("widget count is as expected", () => {
		const schemaKeys = Object.keys(typedSchemas)
		// Update this number when adding/removing widgets
		const EXPECTED_WIDGET_COUNT = 70
		expect(schemaKeys.length).toBe(EXPECTED_WIDGET_COUNT)
	})
})
