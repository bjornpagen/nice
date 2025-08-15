import {
	AreaGraphPropsSchema,
	ConceptualGraphPropsSchema,
	DivergentBarChartPropsSchema,
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
		areaGraph: AreaGraphPropsSchema,
		divergentBarChart: DivergentBarChartPropsSchema
	},
	widgetTypeKeys: [
		...simpleVisualCollection.widgetTypeKeys,
		"lineGraph",
		"conceptualGraph",
		"populationChangeEventGraph",
		"populationBarChart",
		"areaGraph",
		"divergentBarChart"
	] as const
} as const
