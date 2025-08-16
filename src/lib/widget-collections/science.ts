import {
	AreaGraphPropsSchema,
	ConceptualGraphPropsSchema,
	DivergentBarChartPropsSchema,
	HistogramPropsSchema,
	HorizontalBarChartPropsSchema,
	KeelingCurvePropsSchema,
	LineGraphPropsSchema,
	ParabolaGraphPropsSchema,
	PopulationBarChartPropsSchema,
	PopulationChangeEventGraphPropsSchema,
	ScatterPlotPropsSchema,
	PieChartWidgetPropsSchema
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
		horizontalBarChart: HorizontalBarChartPropsSchema,
		histogram: HistogramPropsSchema,
		parabolaGraph: ParabolaGraphPropsSchema,
		scatterPlot: ScatterPlotPropsSchema,
		pieChart: PieChartWidgetPropsSchema
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
		"horizontalBarChart",
		"histogram",
		"parabolaGraph",
		"scatterPlot",
		"pieChart"
	] as const
} as const
