import { expect, test } from "bun:test"
import type { z } from "zod"
import { EquivalentFractionModelPropsSchema, generateEquivalentFractionModel } from "@/lib/widgets/generators"

type EqFracModelInput = z.input<typeof EquivalentFractionModelPropsSchema>

test("equivalent-fraction-model - tenths vs hundredths", async () => {
    const input = {
        type: "equivalentFractionModel",
        width: 600,
        height: 300,
        numerator: 3,
        tenthsColor: "#63D9EA",
        hundredthsColor: "#AA87FF"
    } satisfies EqFracModelInput

    const parsed = EquivalentFractionModelPropsSchema.safeParse(input)
    if (!parsed.success) {
        throw new Error(parsed.error.message)
    }

    const svg = await generateEquivalentFractionModel(parsed.data)
    expect(svg).toMatchSnapshot()
})


