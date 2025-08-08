import * as errors from "@superbuilders/errors"
import { z } from "zod"

function formatJsonPath(path: Array<string | number>): string {
	if (path.length === 0) return ""
	const segments = path.map((seg) => String(seg))
	return `/${segments.join("/")}`
}

/**
 * Recursively generates a Zod schema from a JavaScript object or value at runtime.
 *
 * CRITICAL: This function follows a FAIL-FAST philosophy. Any unexpected data
 * structure will cause an immediate failure rather than providing fallback schemas.
 * This is a safety-critical requirement - NO FALLBACKS are allowed.
 *
 * @param obj The object or value to generate a schema from.
 * @param visited A map to track visited objects to prevent infinite recursion from circular references.
 * @returns A Zod schema that validates the structure and types of the input object.
 * @throws {Error} When encountering unsupported types, empty arrays, or circular references.
 */
export function generateZodSchemaFromObject(
	obj: unknown,
	visited = new Map<object, z.ZodTypeAny>(),
	processing = new Set<object>(),
	path: Array<string | number> = []
): z.ZodTypeAny {
	if (obj === null) {
		return z.null()
	}

	// Handle objects (including arrays) to check for circular references first.
	if (typeof obj === "object") {
		// Check if we already have a completed schema for this object
		if (visited.has(obj)) {
			const existingSchema = visited.get(obj)
			if (!existingSchema) {
				// CRITICAL: Map corruption - has() returned true but get() returned undefined
				throw errors.new("zod schema generation: schema map corruption detected")
			}
			return existingSchema
		}

		// Check if we're currently processing this object (circular reference)
		if (processing.has(obj)) {
			// CRITICAL: Circular reference detected - cannot generate schema
			throw errors.new("zod schema generation: circular reference detected")
		}

		// Mark this object as being processed
		processing.add(obj)
	}

	switch (typeof obj) {
		case "string":
			return z.string()
		case "number":
			return z.number()
		case "boolean":
			return z.boolean()
		case "undefined":
			return z.undefined()
		case "bigint":
			return z.bigint()
		case "object": {
			if (obj instanceof Date) {
				return z.date()
			}

			if (Array.isArray(obj)) {
				if (obj.length === 0) {
					// CRITICAL: Cannot infer type from empty array - FAIL FAST
					const where = path.length ? ` at ${formatJsonPath(path)}` : ""
					throw errors.new(`zod schema generation: cannot infer type from empty array${where}`)
				}

				// FIX: Handle heterogeneous arrays by creating a union of all possible element types.
				const elementTypes = obj.map((element, idx) =>
					generateZodSchemaFromObject(element, visited, processing, [...path, idx])
				)
				const uniqueElementSchemas = Array.from(
					// Use a reliable property like JSON stringified description for the uniqueness key
					new Map(elementTypes.map((schema) => [JSON.stringify(schema.description), schema])).values()
				)

				let schema: z.ZodArray<z.ZodTypeAny>
				if (uniqueElementSchemas.length === 0) {
					// CRITICAL: No schemas found for array elements - data corruption
					throw errors.new("zod schema generation: no valid schemas for array elements")
				}

				if (uniqueElementSchemas.length === 1) {
					// This is now safe because we've confirmed the length.
					const firstSchema = uniqueElementSchemas[0]
					if (!firstSchema) {
						// CRITICAL: Array destructuring failed - logic error
						throw errors.new("zod schema generation: array element schema is undefined")
					}
					schema = z.array(firstSchema)
				} else {
					// Create a union with validated tuple structure
					const [first, second, ...rest] = uniqueElementSchemas
					if (!first || !second) {
						// CRITICAL: Union creation failed - data structure error
						throw errors.new("zod schema generation: cannot create union from array schemas")
					}
					schema = z.array(z.union([first, second, ...rest]))
				}

				// Update the visited map with the final schema.
				visited.set(obj, schema)
				// Remove from processing set now that we're done
				processing.delete(obj)
				return schema
			}

			const shape: { [key: string]: z.ZodTypeAny } = {}
			// Use Object.entries to safely iterate over the object
			const entries = Object.entries(obj)
			for (const [key, value] of entries) {
				shape[key] = generateZodSchemaFromObject(value, visited, processing, [...path, key])
			}

			// Create a strict object schema to disallow any extra properties.
			const schema = z.object(shape).strict()

			// Update the visited map with the final, fully-defined schema.
			visited.set(obj, schema)
			// Remove from processing set now that we're done
			processing.delete(obj)
			return schema
		}

		default:
			// CRITICAL: Unsupported type - FAIL FAST
			throw errors.new(`zod schema generation: unsupported type '${typeof obj}'`)
	}
}
