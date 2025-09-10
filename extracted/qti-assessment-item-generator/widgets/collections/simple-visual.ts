import {
	DataTablePropsSchema,
	EmojiImagePropsSchema,
	PeriodicTableWidgetPropsSchema,
	UrlImageWidgetPropsSchema,
	VennDiagramPropsSchema
} from "../registry"

export const simpleVisualCollection = {
	name: "simple-visual",
	schemas: {
		dataTable: DataTablePropsSchema,
		emojiImage: EmojiImagePropsSchema,
		urlImage: UrlImageWidgetPropsSchema,
		vennDiagram: VennDiagramPropsSchema,
		periodicTable: PeriodicTableWidgetPropsSchema
	},
	widgetTypeKeys: ["dataTable", "emojiImage", "urlImage", "vennDiagram", "periodicTable"] as const
} as const
