import { z } from "zod"

// This is the single source of truth for allowed widget collection names.
// It is defined here and MUST NOT be imported from the deleted widget-collections directory.
// The developer must verify that these collections are supported by the version of the
// @superbuilders/qti-assessment-item-generator library being installed.
export const WidgetCollectionNameSchema = z.enum(["math-core", "fourth-grade-math", "science", "simple-visual"])
export type WidgetCollectionName = z.infer<typeof WidgetCollectionNameSchema>

// Schema for the 'qti/item.migrate' event.data payload.
// The widgetCollection is NOT optional and has NO default.
export const MigrateQtiItemEventDataSchema = z.object({
	questionId: z.string().min(1),
	widgetCollection: WidgetCollectionNameSchema
})

// Schema for the 'qti/item.differentiate' event.data payload.
// Differentiation requires only the question identifier and a count 'n'.
export const DifferentiateQtiItemEventDataSchema = z.object({
	questionId: z.string().min(1),
	n: z.number().int().positive()
})
