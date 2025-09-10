import { z } from "zod" // NEW: Import z for Zod schema definition
import { mathCoreCollection } from "./math-core"
import { scienceCollection } from "./science"
import { simpleVisualCollection } from "./simple-visual"
import { fourthGradeMathCollection } from "./fourth-grade-math"

export const widgetCollections = {
	[mathCoreCollection.name]: mathCoreCollection,
	[scienceCollection.name]: scienceCollection,
	[simpleVisualCollection.name]: simpleVisualCollection,
	[fourthGradeMathCollection.name]: fourthGradeMathCollection
} as const

export type WidgetCollectionName = keyof typeof widgetCollections

// NEW: Define and export Zod enum schema for widget collection names.
// Using literal values to avoid type assertion issues
export const WidgetCollectionNameSchema = z.enum(["math-core", "simple-visual", "science", "fourth-grade-math"])
