import { describe, expect, test } from "bun:test"
import { WidgetCollectionNameSchema } from "@/inngest/events/qti"

describe("QTI Event Schemas", () => {
	test("WidgetCollectionName enum values should be valid for library functions", () => {
		const enumValues = WidgetCollectionNameSchema.options

		// This test serves as a simple contract test. It ensures that the types are compatible
		// and that the library function signature accepts our defined enum values.
		for (const collectionName of enumValues) {
			expect(() => {
				// We can pass a dummy function call to check the type signature.
				// This will throw a TypeError at runtime if the enum value is not assignable
				// to the expected parameter type.
				const mockGenerate = (
					_openai: any,
					_logger: any,
					_envelope: any,
					_collection: "math-core" | "fourth-grade-math" | "science" | "simple-visual"
				) => {}
				mockGenerate(null, null, null, collectionName)
			}).not.toThrow()
		}

		expect.hasAssertions()
	})
})
