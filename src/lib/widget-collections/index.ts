import { z } from "zod" // NEW: Import z for Zod schema definition
import { mathCoreCollection } from "@/lib/widget-collections/math-core"
import { scienceCollection } from "@/lib/widget-collections/science"
import { simpleVisualCollection } from "@/lib/widget-collections/simple-visual"

export const widgetCollections = {
	[mathCoreCollection.name]: mathCoreCollection,
	[scienceCollection.name]: scienceCollection,
	[simpleVisualCollection.name]: simpleVisualCollection
} as const

export type WidgetCollectionName = keyof typeof widgetCollections

// NEW: Define and export Zod enum schema for widget collection names.
// Using literal values to avoid type assertion issues
export const WidgetCollectionNameSchema = z.enum(["math-core", "simple-visual", "science"])
