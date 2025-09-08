import { DataTablePropsSchema, TapeDiagramPropsSchema, CirclePieceComparisonDiagramPropsSchema } from "@/lib/widgets/generators"

export const fourthGradeMathCollection = {
	name: "fourth-grade-math",
	schemas: {
		dataTable: DataTablePropsSchema,
		tapeDiagram: TapeDiagramPropsSchema,
		circlePieceComparisonDiagram: CirclePieceComparisonDiagramPropsSchema
	},
	widgetTypeKeys: ["dataTable", "tapeDiagram", "circlePieceComparisonDiagram"] as const
} as const


