import {
	AdditionWithRegroupingPropsSchema,
	BarChartPropsSchema,
	BoxGridPropsSchema,
	DataTablePropsSchema,
	DivisionModelDiagramPropsSchema,
	EquivalentFractionModelPropsSchema,
	FactorizationDiagramPropsSchema,
	FractionFrequencyPlotPropsSchema,
	FractionModelDiagramPropsSchema,
	FractionNumberLinePropsSchema,
	NumberLinePropsSchema,
	NumberLineWithActionPropsSchema,
	SubtractionWithRegroupingPropsSchema,
	TapeDiagramPropsSchema,
	VerticalArithmeticSetupPropsSchema
} from "@/lib/widgets/generators"

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
		numberLineWithAction: NumberLineWithActionPropsSchema,
		additionWithRegrouping: AdditionWithRegroupingPropsSchema,
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
		"numberLineWithAction",
		"additionWithRegrouping",
		"subtractionWithRegrouping",
		"verticalArithmeticSetup",
		"fractionNumberLine",
		"boxGrid",
		"barChart",
		"equivalentFractionModel"
	] as const
} as const
