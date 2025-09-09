import { DataTablePropsSchema, TapeDiagramPropsSchema, CirclePieceComparisonDiagramPropsSchema, FractionFrequencyPlotPropsSchema, DivisionModelDiagramPropsSchema, FactorizationDiagramPropsSchema, NumberLinePropsSchema } from "@/lib/widgets/generators"

export const fourthGradeMathCollection = {
	name: "fourth-grade-math",
	schemas: {
		dataTable: DataTablePropsSchema,
		tapeDiagram: TapeDiagramPropsSchema,
		circlePieceComparisonDiagram: CirclePieceComparisonDiagramPropsSchema,
		fractionFrequencyPlot: FractionFrequencyPlotPropsSchema,
		divisionModelDiagram: DivisionModelDiagramPropsSchema,
		factorizationDiagram: FactorizationDiagramPropsSchema,
		numberLine: NumberLinePropsSchema
	},
	widgetTypeKeys: ["dataTable", "tapeDiagram", "circlePieceComparisonDiagram", "fractionFrequencyPlot", "divisionModelDiagram", "factorizationDiagram", "numberLine"] as const
} as const


