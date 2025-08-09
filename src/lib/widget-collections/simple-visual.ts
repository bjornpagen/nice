import {
	DataTablePropsSchema,
	EmojiImagePropsSchema,
	UrlImageWidgetPropsSchema,
	VennDiagramPropsSchema
} from "@/lib/widgets/generators"

export const simpleVisualCollection = {
	name: "simple-visual",
	schemas: {
		dataTable: DataTablePropsSchema,
		emojiImage: EmojiImagePropsSchema,
		urlImage: UrlImageWidgetPropsSchema,
		vennDiagram: VennDiagramPropsSchema
	},
	widgetTypeKeys: ["dataTable", "emojiImage", "urlImage", "vennDiagram"] as const
} as const
