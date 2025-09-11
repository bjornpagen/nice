import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { generatePESSpectrum, PESSpectrumPropsSchema } from "@/lib/widgets/generators"

type PESSpectrumInput = z.input<typeof PESSpectrumPropsSchema>

// These tests generate PES spectra intended to visually match the five corrected SVGs
// referenced in prompt.md. We fix width/height to those documents and snapshot the output.

test("pes-spectrum - corrected svg 1 layout", async () => {
	const input = {
		type: "pesSpectrum",
		title: null,
		width: 413.333,
		height: 264.016,
		peaks: [
			{ energy: 80, heightUnits: 4, topLabel: "Cl" },
			{ energy: 5, heightUnits: 2, topLabel: "O" },
			{ energy: 2, heightUnits: 2, topLabel: "H" }
		],
		yAxisLabel: "Intensity"
	} satisfies PESSpectrumInput

	const parsed = PESSpectrumPropsSchema.safeParse(input)
	if (!parsed.success) {
		logger.error("schema validation failed for pes spectrum", { error: parsed.error })
		throw errors.new("schema validation failed for pes spectrum")
	}

	const svg = await generatePESSpectrum(parsed.data)
	expect(svg).toMatchSnapshot()
})
