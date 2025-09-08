import { DataTablePropsSchema, TapeDiagramPropsSchema } from "@/lib/widgets/generators"

export const fourthGradeMathCollection = {
	name: "fourth-grade-math",
	schemas: {
		dataTable: DataTablePropsSchema,
		tapeDiagram: TapeDiagramPropsSchema
	},
	widgetTypeKeys: ["dataTable", "tapeDiagram"] as const
} as const


