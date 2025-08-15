import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { typedSchemas } from "@/lib/widgets/generators"
import type { z } from "zod"

function isZodSchema(value: unknown): value is z.ZodType {
  return (
    value !== null &&
    typeof value === "object" &&
    "_def" in value &&
    (value as any)._def !== null && typeof (value as any)._def === "object" && "typeName" in (value as any)._def
  )
}

function containsOptionalOrDefault(schema: z.ZodType): boolean {
  const def: any = (schema as any)._def

  // Detect optional wrappers
  if (def && def.typeName === "ZodOptional") return true
  if (def && def.typeName === "ZodDefault") return true

  // Traverse common container shapes
  if (def && def.shape && typeof def.shape === "object") {
    for (const value of Object.values(def.shape)) {
      if (isZodSchema(value) && containsOptionalOrDefault(value)) return true
    }
  }

  if (def && def.type && isZodSchema(def.type)) {
    if (containsOptionalOrDefault(def.type)) return true
  }

  if (def && Array.isArray(def.options)) {
    for (const option of def.options) {
      if (isZodSchema(option) && containsOptionalOrDefault(option)) return true
    }
  }

  if (def && def.innerType && isZodSchema(def.innerType)) {
    if (containsOptionalOrDefault(def.innerType)) return true
  }

  if (def && def.schema && isZodSchema(def.schema)) {
    if (containsOptionalOrDefault(def.schema)) return true
  }

  if (def && def.left && def.right && isZodSchema(def.left) && isZodSchema(def.right)) {
    if (containsOptionalOrDefault(def.left) || containsOptionalOrDefault(def.right)) return true
  }

  return false
}

describe("Zod Schema Optional/Default Ban", () => {
  for (const [widgetType, zodSchema] of Object.entries(typedSchemas)) {
    test(`should not contain any optional/default in '${widgetType}' schema`, () => {
      const hasOptOrDef = containsOptionalOrDefault(zodSchema as any)

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


