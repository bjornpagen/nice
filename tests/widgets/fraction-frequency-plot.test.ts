import { expect, test } from "bun:test"
import type { z } from "zod"
import { FractionFrequencyPlotPropsSchema, generateFractionFrequencyPlot } from "@/lib/widgets/generators"

type FractionFrequencyPlotInput = z.input<typeof FractionFrequencyPlotPropsSchema>

test("fraction-frequency-plot - basic stacked Xs", async () => {
    const input = {
        type: "fractionFrequencyPlot",
        width: 600,
        height: 300,
        title: "Fraction frequency plot",
        ticks: [
            { label: { type: "fraction", numerator: 1, denominator: 2 }, frequency: 3 },
            { label: { type: "mixed", whole: 1, numerator: 1, denominator: 4 }, frequency: 1 },
            { label: { type: "whole", value: 2 }, frequency: 2 }
        ]
    } satisfies FractionFrequencyPlotInput

    const parse = FractionFrequencyPlotPropsSchema.safeParse(input)
    if (!parse.success) {
        throw new Error(parse.error.message)
    }

    const svg = await generateFractionFrequencyPlot(parse.data)
    expect(svg).toMatchSnapshot()
})


