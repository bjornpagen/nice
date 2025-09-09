import {
	BarChartPropsSchema,
	BoxGridPropsSchema,
	DataTablePropsSchema,
	FractionNumberLinePropsSchema,
	NumberLinePropsSchema,
	SubtractionWithRegroupingPropsSchema,
	TapeDiagramPropsSchema,
	VerticalArithmeticSetupPropsSchema
} from "@/lib/widgets/generators"

export const fourthGradeMathCollection = {
	name: "fourth-grade-math",
	schemas: {
		dataTable: DataTablePropsSchema,
		tapeDiagram: TapeDiagramPropsSchema,
		numberLine: NumberLinePropsSchema,
		subtractionWithRegrouping: SubtractionWithRegroupingPropsSchema,
		verticalArithmeticSetup: VerticalArithmeticSetupPropsSchema,
		fractionNumberLine: FractionNumberLinePropsSchema,
		boxGrid: BoxGridPropsSchema,
		barChart: BarChartPropsSchema
	},
	widgetTypeKeys: [
		"dataTable",
		"tapeDiagram",
		"numberLine",
		"subtractionWithRegrouping",
		"verticalArithmeticSetup",
		"fractionNumberLine",
		"boxGrid",
		"barChart"
	] as const
} as const
