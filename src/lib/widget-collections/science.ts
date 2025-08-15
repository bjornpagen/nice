import {
	AreaGraphPropsSchema,
	ConceptualGraphPropsSchema,
	DivergentBarChartPropsSchema,
	HorizontalBarChartPropsSchema,
	KeelingCurvePropsSchema,
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
		divergentBarChart: DivergentBarChartPropsSchema,
		keelingCurve: KeelingCurvePropsSchema,
		horizontalBarChart: HorizontalBarChartPropsSchema
	},
	widgetTypeKeys: [
		...simpleVisualCollection.widgetTypeKeys,
		"lineGraph",
		"conceptualGraph",
		"populationChangeEventGraph",
		"populationBarChart",
		"areaGraph",
		"divergentBarChart",
		"keelingCurve",
		"horizontalBarChart"
	] as const
} as const
