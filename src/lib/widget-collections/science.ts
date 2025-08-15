import { ConceptualGraphPropsSchema, LineGraphPropsSchema } from "@/lib/widgets/generators"
import { simpleVisualCollection } from "./simple-visual"

export const scienceCollection = {
	name: "science",
	schemas: {
		...simpleVisualCollection.schemas,
		lineGraph: LineGraphPropsSchema,
		conceptualGraph: ConceptualGraphPropsSchema
	},
	widgetTypeKeys: [...simpleVisualCollection.widgetTypeKeys, "lineGraph", "conceptualGraph"] as const
} as const
