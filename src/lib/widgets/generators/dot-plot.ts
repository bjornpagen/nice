import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrInvalidDimensions = errors.new("invalid chart dimensions or axis range")

const DataPoint = z
	.object({
		value: z
			.number()
			.describe(
				"The numerical value on the axis where dots are placed (e.g., 5, 12.5, -3, 0). Must be within axis min/max range."
			),
		count: z
			.number()
			.int()
			.min(0)
			.describe(
				"Number of dots to stack at this value. Represents frequency (e.g., 3 means 3 dots stacked vertically). Must be non-negative."
			)
	})
	.strict()

export const DotPlotPropsSchema = z
	.object({
		type: z.literal("dotPlot").describe("Identifies this as a dot plot widget for displaying frequency distributions."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the plot in pixels including margins (e.g., 500, 600, 400). Wider plots prevent dot overlap on dense data."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the plot in pixels including labels (e.g., 300, 400, 250). Taller plots accommodate higher dot stacks."
			),
		axis: z
			.object({
				label: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
					.describe(
						"Title for the horizontal axis describing the variable (e.g., 'Test Score', 'Number of Siblings', 'Temperature (°C)', null). Null shows no label."
					),
				min: z
					.number()
					.describe(
						"Minimum value shown on the axis (e.g., 0, -10, 50). Should be less than or equal to smallest data value."
					),
				max: z
					.number()
					.describe(
						"Maximum value shown on the axis (e.g., 100, 20, 10). Should be greater than or equal to largest data value."
					),
				tickInterval: z
					.number()
					.describe(
						"Spacing between axis tick marks (e.g., 10, 5, 0.5, 1). Should evenly divide the range for clean appearance."
					)
			})
			.strict()
			.describe("Configuration for the horizontal number line axis."),
		data: z
			.array(DataPoint)
			.describe(
				"Array of values and their frequencies. Each unique value gets its own dot stack. Order doesn't matter. Can be empty for blank plot."
			),
		dotColor: z
			.string()
			.regex(
				CSS_COLOR_PATTERN,
				"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
			)
			.describe(
				"Hex-only color for the dots (e.g., '#4472C4', '#1E90FF', '#FF0000CC' for ~80% alpha). Should contrast with white background."
			),
		dotRadius: z
			.number()
			.positive()
			.describe(
				"Radius of each dot in pixels (e.g., 4, 5, 3). Larger dots are more visible but may overlap. Typical range: 3-6."
			)
	})
	.strict()
	.describe(
		"Creates a dot plot (line plot) showing frequency distribution of numerical data. Each value is represented by stacked dots indicating count/frequency. Excellent for small datasets, showing distribution shape, clusters, gaps, and outliers. Dots stack vertically when multiple observations have the same value."
	)

export type DotPlotProps = z.infer<typeof DotPlotPropsSchema>

/**
 * Generates a clear, accessible, and standards-compliant dot plot as an SVG graphic.
 * Dot plots are used to visualize the distribution of a numerical data set,
 * especially when the data consists of discrete values or has been binned.
 */
export const generateDotPlot: WidgetGenerator<typeof DotPlotPropsSchema> = (data) => {
	const { width, height, axis, data: plotData, dotColor, dotRadius } = data
	const margin = { top: 20, right: 20, bottom: 60, left: 20 }
	const chartWidth = width - margin.left - margin.right
	const chartHeight = height - margin.top - margin.bottom
	const axisY = height - margin.bottom

	if (chartWidth <= 0 || chartHeight <= 0 || axis.min >= axis.max) {
		logger.error("invalid chart dimensions or axis range", {
			width,
			height,
			chartWidth,
			chartHeight,
			axisMin: axis.min,
			axisMax: axis.max
		})
		throw errors.wrap(ErrInvalidDimensions, `width: ${width}, height: ${height}, axis range: ${axis.min}-${axis.max}`)
	}

	const scale = chartWidth / (axis.max - axis.min)
	const toSvgX = (val: number) => margin.left + (val - axis.min) * scale

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	// Axis line
	svg += `<line x1="${margin.left}" y1="${axisY}" x2="${width - margin.right}" y2="${axisY}" stroke="black"/>`

	// Axis label
	if (axis.label !== null) {
		svg += `<text x="${width / 2}" y="${height - 15}" fill="black" text-anchor="middle" font-size="14">${axis.label}</text>`
	}

	// Ticks and tick labels
	// Dynamically thin tick labels to prevent overlap when ticks are very dense (e.g., interval = 0.1)
	const tickPixelStep = scale * axis.tickInterval
	const minLabelSpacingPx = 28 // approx width needed per label at font-size 12
	const labelEvery = Math.max(1, Math.ceil(minLabelSpacingPx / tickPixelStep))

	// Determine decimal places for formatting based on tickInterval
	const intervalStr = String(axis.tickInterval)
	const decimals = intervalStr.includes(".") ? (intervalStr.split(".")[1] ?? "").length : 0
	let i = 0
	for (let t = axis.min; t <= axis.max + 1e-9; t += axis.tickInterval) {
		const x = toSvgX(t)
		svg += `<line x1="${x}" y1="${axisY - 5}" x2="${x}" y2="${axisY + 5}" stroke="black"/>`
		// Only render label if spacing allows, but always include min and max labels
		const isEndpoint = Math.abs(t - axis.min) < 1e-9 || Math.abs(t - axis.max) < 1e-9
		if (isEndpoint || i % labelEvery === 0) {
			const label = t.toFixed(decimals)
			svg += `<text x="${x}" y="${axisY + 20}" fill="black" text-anchor="middle">${label}</text>`
		}
		i++
	}

	const dotDiameter = dotRadius * 2
	const dotSpacing = 2 // Vertical space between dots
	const baseOffset = 10 // Additional space between axis and first dot
	for (const dp of plotData) {
		if (dp.count > 0) {
			const x = toSvgX(dp.value)
			for (let i = 0; i < dp.count; i++) {
				const y = axisY - dotRadius - baseOffset - i * (dotDiameter + dotSpacing)
				svg += `<circle cx="${x}" cy="${y}" r="${dotRadius}" fill="${dotColor}"/>`
			}
		}
	}

	svg += "</svg>"
	return svg
}
