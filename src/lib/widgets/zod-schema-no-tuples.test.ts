import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import type { z } from "zod"
import { typedSchemas } from "@/lib/widgets/generators"

/**
 * Type guard to check if a value is a Zod schema
 */
function isZodSchema(value: unknown): value is z.ZodType {
	return (
		value !== null &&
		typeof value === "object" &&
		"_def" in value &&
		value._def !== null &&
		typeof value._def === "object" &&
		"typeName" in value._def
	)
}

/**
 * Recursively checks if a Zod schema contains any tuple types.
 * Tuples cause issues with OpenAI's schema validation as they get serialized
 * as arrays of type definitions like [{'type': 'string'}, {'type': 'string'}]
 * instead of proper array schemas.
 */
function containsTuple(schema: z.ZodType): boolean {
	// Check if this is a tuple
	if ("typeName" in schema._def && schema._def.typeName === "ZodTuple") {
		return true
	}

	// Recursively check nested schemas
	if ("shape" in schema._def && schema._def.shape && typeof schema._def.shape === "object") {
		// Object schema - check all properties
		for (const value of Object.values(schema._def.shape)) {
			if (isZodSchema(value) && containsTuple(value)) {
				return true
			}
		}
	}

	if ("type" in schema._def && isZodSchema(schema._def.type)) {
		// Array schema - check element type
		return containsTuple(schema._def.type)
	}

	if ("options" in schema._def && Array.isArray(schema._def.options)) {
		// Union schema - check all options
		for (const option of schema._def.options) {
			if (isZodSchema(option) && containsTuple(option)) {
				return true
			}
		}
	}

	if ("innerType" in schema._def && isZodSchema(schema._def.innerType)) {
		// Nullable/optional schema - check inner type
		return containsTuple(schema._def.innerType)
	}

	if ("schema" in schema._def && isZodSchema(schema._def.schema)) {
		// Transform/preprocess schema - check inner schema
		return containsTuple(schema._def.schema)
	}

	if (
		"left" in schema._def &&
		isZodSchema(schema._def.left) &&
		"right" in schema._def &&
		isZodSchema(schema._def.right)
	) {
		// Intersection schema - check both sides
		return containsTuple(schema._def.left) || containsTuple(schema._def.right)
	}

	return false
}

describe("Zod Schema Tuple Ban", () => {
	// This test ensures that no widget schemas use Zod tuples.
	// Tuples cause compatibility issues with OpenAI's API because they are serialized
	// incorrectly as arrays of type objects (e.g., [{'type': 'string'}, {'type': 'string'}])
	// instead of proper JSON Schema array definitions.
	//
	// Instead of tuples like:
	//   z.tuple([z.string(), z.string(), z.string()])
	//
	// Use arrays with runtime validation:
	//   z.array(z.string()) // with runtime length check
	//
	// This prevents the schema validation errors that were affecting 98.8% of widget generation failures.
	for (const [widgetType, zodSchema] of Object.entries(typedSchemas)) {
		test(`should not contain any tuple types in '${widgetType}' schema`, () => {
			const hasTuples = containsTuple(zodSchema)

			if (hasTuples) {
				throw errors.new(
					`Widget schema '${widgetType}' contains tuple types which are not compatible with OpenAI's API. ` +
						"Replace tuples with arrays and add runtime validation. " +
						"Example: change z.tuple([z.string(), z.string()]) to z.array(z.string()) with a runtime length check."
				)
			}

			expect(hasTuples).toBe(false)
		})
	}
})
