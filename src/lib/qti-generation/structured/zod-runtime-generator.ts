import { z } from "zod"

/**
 * Recursively generates a Zod schema from a JavaScript object or value at runtime.
 * This function is designed to be robust, handling complex nested structures,
 * heterogeneous arrays, and circular references.
 *
 * @param obj The object or value to generate a schema from.
 * @param visited A map to track visited objects to prevent infinite recursion from circular references.
 * @returns A Zod schema that validates the structure and types of the input object.
 */
export function generateZodSchemaFromObject(obj: unknown, visited = new Map<object, z.ZodTypeAny>()): z.ZodTypeAny {
	if (obj === null) {
		return z.null()
	}

	// Handle objects (including arrays) to check for circular references first.
	if (typeof obj === "object") {
		if (visited.has(obj)) {
			// If we've seen this object before in this path, return the existing schema to break the loop.
			const existingSchema = visited.get(obj)
			if (!existingSchema) {
				// This should never happen since we just checked has()
				return z.any()
			}
			return existingSchema
		}
		// Mark the object as visited for this recursive path.
		visited.set(obj, z.any()) // Placeholder, will be replaced later.
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
					// Cannot infer type from an empty array, so we allow any array.
					return z.array(z.unknown())
				}

				// Handle heterogeneous arrays by creating a union of all possible element types.
				const elementTypes = obj.map((element) => generateZodSchemaFromObject(element, visited))
				const uniqueElementSchemas = Array.from(
					// Corrected from `schema.describe` to `schema.description` for a more reliable key
					new Map(elementTypes.map((schema) => [JSON.stringify(schema.description), schema])).values()
				)

				let schema: z.ZodArray<z.ZodTypeAny>
				if (uniqueElementSchemas.length === 0) {
					schema = z.array(z.unknown())
				} else if (uniqueElementSchemas.length === 1) {
					// This is now safe because we've confirmed the length.
					const firstSchema = uniqueElementSchemas[0]
					if (!firstSchema) {
						// This should never happen given the length check
						schema = z.array(z.unknown())
					} else {
						schema = z.array(firstSchema)
					}
				} else {
					// Create a union with validated tuple structure
					const [first, second, ...rest] = uniqueElementSchemas
					if (first && second) {
						schema = z.array(z.union([first, second, ...rest]))
					} else {
						// Fallback, though this should not happen given the length check
						schema = z.array(z.unknown())
					}
				}

				// Update the visited map with the final schema.
				visited.set(obj, schema)
				return schema
			}

			const shape: { [key: string]: z.ZodTypeAny } = {}
			// Use Object.entries to safely iterate over the object
			const entries = Object.entries(obj)
			for (const [key, value] of entries) {
				shape[key] = generateZodSchemaFromObject(value, visited)
			}

			// Create a strict object schema to disallow any extra properties.
			const schema = z.object(shape).strict()

			// Update the visited map with the final, fully-defined schema.
			visited.set(obj, schema)
			return schema
		}

		default:
			// Fallback for other types like 'function' or 'symbol'.
			return z.unknown()
	}
}
