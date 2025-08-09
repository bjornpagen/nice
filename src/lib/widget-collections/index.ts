import { mathCoreCollection } from "@/lib/widget-collections/math-core"
import { simpleVisualCollection } from "@/lib/widget-collections/simple-visual"

export const widgetCollections = {
	[mathCoreCollection.name]: mathCoreCollection,
	[simpleVisualCollection.name]: simpleVisualCollection
} as const

export type WidgetCollectionName = keyof typeof widgetCollections
