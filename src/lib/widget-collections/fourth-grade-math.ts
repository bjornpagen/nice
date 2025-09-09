import { DataTablePropsSchema, TapeDiagramPropsSchema, CirclePieceComparisonDiagramPropsSchema, FractionFrequencyPlotPropsSchema, DivisionModelDiagramPropsSchema, FactorizationDiagramPropsSchema } from "@/lib/widgets/generators"

export const fourthGradeMathCollection = {
	name: "fourth-grade-math",
	schemas: {
		dataTable: DataTablePropsSchema,
		tapeDiagram: TapeDiagramPropsSchema,
		circlePieceComparisonDiagram: CirclePieceComparisonDiagramPropsSchema,
		fractionFrequencyPlot: FractionFrequencyPlotPropsSchema,
		divisionModelDiagram: DivisionModelDiagramPropsSchema,
		factorizationDiagram: FactorizationDiagramPropsSchema
	},
	widgetTypeKeys: ["dataTable", "tapeDiagram", "circlePieceComparisonDiagram", "fractionFrequencyPlot", "divisionModelDiagram", "factorizationDiagram"] as const
} as const


