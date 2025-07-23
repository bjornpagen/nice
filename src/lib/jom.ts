import * as errors from "@superbuilders/errors"
import { z } from "zod"

const PerseusPlotterOptionsSchema = z.object({
	categories: z.array(z.string())
})

const PerseusWidgetsSchema = z.object({
	"plotter 2": z.object({
		options: PerseusPlotterOptionsSchema
	})
})

const PerseusImageSchema = z.object({
	width: z.number(),
	height: z.number()
})

const PerseusQuestionSchema = z.object({
	images: z.record(z.string(), PerseusImageSchema),
	widgets: PerseusWidgetsSchema
})

const PerseusJSONSchema = z.object({
	question: PerseusQuestionSchema
})

export function generateRulerOverlayHTML(perseusJSON: unknown): string {
	const validationResult = PerseusJSONSchema.safeParse(perseusJSON)

	if (!validationResult.success) {
		throw errors.wrap(validationResult.error, "invalid perseus JSON structure")
	}

	const json = validationResult.data

	const graphieKeys = Object.keys(json.question.images)
	if (graphieKeys.length === 0) {
		throw errors.new("no images found in perseus JSON")
	}

	const graphieKey = graphieKeys[0]
	if (!graphieKey) {
		throw errors.new("no graphie key found")
	}
	const image = json.question.images[graphieKey]
	if (!image) {
		throw errors.new("image not found for graphie key")
	}
	const width = image.width
	const height = image.height

	const plotterOptions = json.question.widgets["plotter 2"].options
	const max = plotterOptions.categories.length - 1

	let pad_left_unit = 0.5
	let pad_right_unit = 0.5
	if (max <= 6) {
		pad_left_unit = 0.95
		pad_right_unit = 1.0
	}
	const total_units = max + pad_left_unit + pad_right_unit
	const scale_px_per_unit = width / total_units

	const buffer_px = 5.56
	const left_cm_px = pad_left_unit * scale_px_per_unit - buffer_px
	const left_cm_pct = ((left_cm_px / width) * 100).toFixed(6)

	let top_pct = 78.763
	if (height === 183) {
		top_pct = 76.3617
	}

	const font_size = 16
	const margin_top = -19
	const padding = 7

	const cm_style = `position: absolute; top: ${top_pct}%; left: ${left_cm_pct}%; z-index: 1; font-size: ${font_size}px; font-family: sans-serif; margin-top: ${margin_top}px; padding: ${padding}px;`

	const cm_content = `<math xmlns="http://www.w3.org/1998/Math/MathML"><mtext mathsize="0.85">cm</mtext></math>`

	let html = `<div style="${cm_style}">${cm_content}</div>`

	const margin_left = -11

	for (let i = 1; i <= max; i++) {
		const left_px = (i + pad_left_unit) * scale_px_per_unit
		const left_pct = ((left_px / width) * 100).toFixed(6)
		const style = `position: absolute; top: ${top_pct}%; left: ${left_pct}%; z-index: 1; font-size: ${font_size}px; font-family: sans-serif; margin-top: ${margin_top}px; margin-left: ${margin_left}px; padding: ${padding}px;`
		const content = `<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>${i}</mn></math>`
		html += `<div style="${style}">${content}</div>`
	}

	return html
}
