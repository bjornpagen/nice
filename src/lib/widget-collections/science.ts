import {
	AreaGraphPropsSchema,
	ConceptualGraphPropsSchema,
	CoordinatePlaneComprehensivePropsSchema,
	DivergentBarChartPropsSchema,
	FreeBodyDiagramPropsSchema,
	HistogramPropsSchema,
	KeelingCurvePropsSchema,
	LineGraphPropsSchema,
	ParabolaGraphPropsSchema,
	PESSpectrumPropsSchema,
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
		pesSpectrum: PESSpectrumPropsSchema,

		histogram: HistogramPropsSchema,
		parabolaGraph: ParabolaGraphPropsSchema,
		scatterPlot: ScatterPlotPropsSchema,
		freeBodyDiagram: FreeBodyDiagramPropsSchema,
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
		"pesSpectrum",

		"histogram",
		"parabolaGraph",
		"scatterPlot",
		"freeBodyDiagram",
		"pieChart"
	] as const
} as const
