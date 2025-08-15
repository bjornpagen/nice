import {
	ConceptualGraphPropsSchema,
	LineGraphPropsSchema,
	PopulationChangeEventGraphPropsSchema
} from "@/lib/widgets/generators"
import { simpleVisualCollection } from "./simple-visual"

export const scienceCollection = {
	name: "science",
	schemas: {
		...simpleVisualCollection.schemas,
		lineGraph: LineGraphPropsSchema,
		conceptualGraph: ConceptualGraphPropsSchema,
		populationChangeEventGraph: PopulationChangeEventGraphPropsSchema
	},
	widgetTypeKeys: [
		...simpleVisualCollection.widgetTypeKeys,
		"lineGraph",
		"conceptualGraph",
		"populationChangeEventGraph"
	] as const
} as const
