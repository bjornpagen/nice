import { DataTablePropsSchema } from "@/lib/widgets/generators"

export const fourthGradeMathCollection = {
	name: "fourth-grade-math",
	schemas: {
		dataTable: DataTablePropsSchema
	},
	widgetTypeKeys: ["dataTable"] as const
} as const


