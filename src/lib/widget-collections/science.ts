import { LineGraphPropsSchema } from "@/lib/widgets/generators"
import { mathCoreCollection } from "./math-core"

export const scienceCollection = {
	name: "science",
	schemas: {
		...mathCoreCollection.schemas,
		lineGraph: LineGraphPropsSchema
	},
	widgetTypeKeys: [...mathCoreCollection.widgetTypeKeys, "lineGraph"] as const
} as const
