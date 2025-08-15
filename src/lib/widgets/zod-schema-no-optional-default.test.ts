import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { typedSchemas } from "@/lib/widgets/generators"

function isZodSchema(value: unknown): value is z.ZodType {
	return (
		value !== null &&
		typeof value === "object" &&
		"_def" in value &&
		value._def !== null &&
		typeof value._def === "object" &&
		value._def !== undefined &&
		"typeName" in value._def
	)
}

// Type guard to check if an object has the internal _def structure we need
function hasZodDef(obj: unknown): obj is {
	_def: {
		typeName?: string
		shape?: unknown
		type?: unknown
		options?: unknown[]
		innerType?: unknown
		schema?: unknown
		left?: unknown
		right?: unknown
	}
} {
	return typeof obj === "object" && obj !== null && "_def" in obj && typeof obj._def === "object" && obj._def !== null
}

function containsOptionalOrDefault(schema: z.ZodType): boolean {
	if (!hasZodDef(schema)) return false

	const def = schema._def

	// Detect optional wrappers
	if (def.typeName === "ZodOptional") return true
	if (def.typeName === "ZodDefault") return true

	// Traverse common container shapes
	if (def.shape && typeof def.shape === "object" && def.shape !== null) {
		for (const value of Object.values(def.shape)) {
			if (isZodSchema(value) && containsOptionalOrDefault(value)) return true
		}
	}

	if (isZodSchema(def.type)) {
		if (containsOptionalOrDefault(def.type)) return true
	}

	if (Array.isArray(def.options)) {
		for (const option of def.options) {
			if (isZodSchema(option) && containsOptionalOrDefault(option)) return true
		}
	}

	if (isZodSchema(def.innerType)) {
		if (containsOptionalOrDefault(def.innerType)) return true
	}

	if (isZodSchema(def.schema)) {
		if (containsOptionalOrDefault(def.schema)) return true
	}

	if (isZodSchema(def.left) && isZodSchema(def.right)) {
		if (containsOptionalOrDefault(def.left) || containsOptionalOrDefault(def.right)) return true
	}

	return false
}

describe("Zod Schema Optional/Default Ban", () => {
	for (const [widgetType, zodSchema] of Object.entries(typedSchemas)) {
		test(`should not contain any optional/default in '${widgetType}' schema`, () => {
			if (!isZodSchema(zodSchema)) {
				logger.error("widget schema is not valid Zod schema", { widgetType })
				throw errors.new(`${widgetType} is not a valid Zod schema`)
			}
			const hasOptOrDef = containsOptionalOrDefault(zodSchema)

			if (hasOptOrDef) {
				logger.error("widget schema contains banned optional/default", { widgetType })
				throw errors.new(
					`widget schema '${widgetType}' contains banned optional/default. replace optional fields with explicit nullable() where needed and remove default().`
				)
			}

			expect(hasOptOrDef).toBe(false)
		})
	}
})
