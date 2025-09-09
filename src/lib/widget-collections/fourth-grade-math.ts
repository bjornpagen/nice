import { BarChartPropsSchema, BoxGridPropsSchema, DataTablePropsSchema, FractionNumberLinePropsSchema, NumberLinePropsSchema, SubtractionWithRegroupingPropsSchema, TapeDiagramPropsSchema, VerticalArithmeticSetupPropsSchema, FractionModelDiagramPropsSchema, FractionFrequencyPlotPropsSchema, DivisionModelDiagramPropsSchema, FactorizationDiagramPropsSchema, EquivalentFractionModelPropsSchema } from "@/lib/widgets/generators"

export const fourthGradeMathCollection = {
	name: "fourth-grade-math",
	schemas: {
		dataTable: DataTablePropsSchema,
		tapeDiagram: TapeDiagramPropsSchema,
		fractionModelDiagram: FractionModelDiagramPropsSchema,
		fractionFrequencyPlot: FractionFrequencyPlotPropsSchema,
		divisionModelDiagram: DivisionModelDiagramPropsSchema,
		factorizationDiagram: FactorizationDiagramPropsSchema,
		numberLine: NumberLinePropsSchema,
		subtractionWithRegrouping: SubtractionWithRegroupingPropsSchema,
		verticalArithmeticSetup: VerticalArithmeticSetupPropsSchema,
		fractionNumberLine: FractionNumberLinePropsSchema,
		boxGrid: BoxGridPropsSchema,
		barChart: BarChartPropsSchema,
		equivalentFractionModel: EquivalentFractionModelPropsSchema
	},
	widgetTypeKeys: [
		"dataTable",
		"tapeDiagram",
		"fractionModelDiagram",
		"fractionFrequencyPlot",
		"divisionModelDiagram",
		"factorizationDiagram",
		"numberLine",
		"subtractionWithRegrouping",
		"verticalArithmeticSetup",
		"fractionNumberLine",
		"boxGrid",
		"barChart",
		"equivalentFractionModel"
	] as const
} as const
