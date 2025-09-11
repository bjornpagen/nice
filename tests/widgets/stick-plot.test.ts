import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { generateStickPlot, StickPlotPropsSchema } from "@/lib/widgets/generators"

// A small set mirroring isotopic-abundance style stick plot
test("stick-plot - categorical sticks snapshot", async () => {
	const parsed = StickPlotPropsSchema.safeParse({
		type: "stickPlot",
		width: 308,
		height: 250,
		title: "Atomic mass example",
		xAxis: {
			label: "Atomic mass (u)",
			categories: ["19", "21", "23", "24", "25", "26", "27", "29", "31"],
			showGridLines: false
		},
		yAxis: {
			label: "Relative abundance (%)",
			min: 0,
			max: 100,
			tickInterval: 20,
			showGridLines: true
		},
		sticks: [
			{ xLabel: "24", yValue: 79, color: "#000" },
			{ xLabel: "25", yValue: 10, color: "#000" },
			{ xLabel: "26", yValue: 12, color: "#000" }
		]
	})

	if (!parsed.success) {
		logger.error("schema validation failed for stick plot", { error: parsed.error })
		throw errors.new("schema validation failed for stick plot")
	}

	const svg = await generateStickPlot(parsed.data)
	expect(svg).toMatchSnapshot()
})
