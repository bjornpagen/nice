import { DataTablePropsSchema, TapeDiagramPropsSchema, CirclePieceComparisonDiagramPropsSchema, FractionFrequencyPlotPropsSchema } from "@/lib/widgets/generators"

export const fourthGradeMathCollection = {
	name: "fourth-grade-math",
	schemas: {
		dataTable: DataTablePropsSchema,
		tapeDiagram: TapeDiagramPropsSchema,
		circlePieceComparisonDiagram: CirclePieceComparisonDiagramPropsSchema,
		fractionFrequencyPlot: FractionFrequencyPlotPropsSchema
	},
	widgetTypeKeys: ["dataTable", "tapeDiagram", "circlePieceComparisonDiagram", "fractionFrequencyPlot"] as const
} as const


