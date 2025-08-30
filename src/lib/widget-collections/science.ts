import {
	AreaGraphPropsSchema,
	ConceptualGraphPropsSchema,
	CoordinatePlaneComprehensivePropsSchema,
	DivergentBarChartPropsSchema,
	HistogramPropsSchema,

	KeelingCurvePropsSchema,
	LineGraphPropsSchema,
	ParabolaGraphPropsSchema,
	PieChartWidgetPropsSchema,
	PopulationBarChartPropsSchema,
	PopulationChangeEventGraphPropsSchema,
	ScatterPlotPropsSchema
} from "@/lib/widgets/generators"
import { simpleVisualCollection } from "./simple-visual"

export const scienceCollection = {
	name: "science",
	schemas: {
		...simpleVisualCollection.schemas,
		lineGraph: LineGraphPropsSchema,
		conceptualGraph: ConceptualGraphPropsSchema,
		coordinatePlane: CoordinatePlaneComprehensivePropsSchema,
		populationChangeEventGraph: PopulationChangeEventGraphPropsSchema,
		populationBarChart: PopulationBarChartPropsSchema,
		areaGraph: AreaGraphPropsSchema,
		divergentBarChart: DivergentBarChartPropsSchema,
		keelingCurve: KeelingCurvePropsSchema,

		histogram: HistogramPropsSchema,
		parabolaGraph: ParabolaGraphPropsSchema,
		scatterPlot: ScatterPlotPropsSchema,
		pieChart: PieChartWidgetPropsSchema
	},
	widgetTypeKeys: [
		...simpleVisualCollection.widgetTypeKeys,
		"lineGraph",
		"conceptualGraph",
		"coordinatePlane",
		"populationChangeEventGraph",
		"populationBarChart",
		"areaGraph",
		"divergentBarChart",
		"keelingCurve",

		"histogram",
		"parabolaGraph",
		"scatterPlot",
		"pieChart"
	] as const
} as const
