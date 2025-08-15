import {
	AreaGraphPropsSchema,
	ConceptualGraphPropsSchema,
	LineGraphPropsSchema,
	PopulationBarChartPropsSchema,
	PopulationChangeEventGraphPropsSchema
} from "@/lib/widgets/generators"
import { simpleVisualCollection } from "./simple-visual"

export const scienceCollection = {
	name: "science",
	schemas: {
		...simpleVisualCollection.schemas,
		lineGraph: LineGraphPropsSchema,
		conceptualGraph: ConceptualGraphPropsSchema,
		populationChangeEventGraph: PopulationChangeEventGraphPropsSchema,
		populationBarChart: PopulationBarChartPropsSchema,
		areaGraph: AreaGraphPropsSchema
	},
	widgetTypeKeys: [
		...simpleVisualCollection.widgetTypeKeys,
		"lineGraph",
		"conceptualGraph",
		"populationChangeEventGraph",
		"populationBarChart",
		"areaGraph"
	] as const
} as const
