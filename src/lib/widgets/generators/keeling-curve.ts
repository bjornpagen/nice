import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { initExtents, includeText, computeDynamicWidth } from "@/lib/widgets/utils/layout"

const AnnotationSchema = z.object({
	year: z.number().describe("The year on the x-axis that the annotation arrow should point to."),
	text: z.array(z.string()).describe("The annotation text, with each string in the array representing a new line.")
})

export const KeelingCurvePropsSchema = z
	.object({
		type: z.literal("keelingCurve"),
		width: z.number().positive().describe("Total width of the SVG in pixels."),
		height: z.number().positive().describe("Total height of the SVG in pixels."),
		xAxisLabel: z.string().describe("Label for the horizontal axis."),
		yAxisLabel: z.string().describe("Label for the vertical axis, including units."),
		annotations: z
			.array(AnnotationSchema)
			.describe("An array of declarative annotations pointing to specific years on the curve.")
	})
	.strict()
	.describe(
		"Renders a scientifically accurate, non-interactive graph of historical CO2 levels with declarative annotations."
	)

export type KeelingCurveProps = z.infer<typeof KeelingCurvePropsSchema>

// Hardcoded CO2 data for consistency and accuracy.
const CO2_DATA = [
	// Pre-industrial stable period (ice core data approximations)
	{ year: 1, ppm: 277 },
	{ year: 200, ppm: 278 },
	{ year: 400, ppm: 277 },
	{ year: 600, ppm: 278 },
	{ year: 800, ppm: 279 },
	{ year: 1000, ppm: 280 },
	{ year: 1100, ppm: 279 },
	{ year: 1200, ppm: 280 },
	{ year: 1300, ppm: 279 },
	{ year: 1400, ppm: 278 }, // Little Ice Age begins
	{ year: 1500, ppm: 279 },
	{ year: 1600, ppm: 277 },
	{ year: 1650, ppm: 277 },
	{ year: 1700, ppm: 278 },
	{ year: 1750, ppm: 278 },
	{ year: 1775, ppm: 279 },
	{ year: 1800, ppm: 280 },
	{ year: 1825, ppm: 281 },
	{ year: 1850, ppm: 285 }, // Industrial Revolution accelerating
	{ year: 1875, ppm: 289 },
	{ year: 1900, ppm: 295 },
	{ year: 1910, ppm: 299 },
	{ year: 1920, ppm: 303 },
	{ year: 1930, ppm: 307 },
	{ year: 1940, ppm: 310 },
	{ year: 1950, ppm: 312 },
	{ year: 1955, ppm: 314 },
	// Modern NOAA Data (Mauna Loa)
	{ year: 1959, ppm: 315.98 },
	{ year: 1960, ppm: 316.91 },
	{ year: 1961, ppm: 317.64 },
	{ year: 1962, ppm: 318.45 },
	{ year: 1963, ppm: 318.99 },
	{ year: 1964, ppm: 319.62 },
	{ year: 1965, ppm: 320.04 },
	{ year: 1966, ppm: 321.37 },
	{ year: 1967, ppm: 322.18 },
	{ year: 1968, ppm: 323.05 },
	{ year: 1969, ppm: 324.62 },
	{ year: 1970, ppm: 325.68 },
	{ year: 1971, ppm: 326.32 },
	{ year: 1972, ppm: 327.46 },
	{ year: 1973, ppm: 329.68 },
	{ year: 1974, ppm: 330.19 },
	{ year: 1975, ppm: 331.13 },
	{ year: 1976, ppm: 332.03 },
	{ year: 1977, ppm: 333.84 },
	{ year: 1978, ppm: 335.41 },
	{ year: 1979, ppm: 336.84 },
	{ year: 1980, ppm: 338.76 },
	{ year: 1981, ppm: 340.12 },
	{ year: 1982, ppm: 341.48 },
	{ year: 1983, ppm: 343.15 },
	{ year: 1984, ppm: 344.87 },
	{ year: 1985, ppm: 346.35 },
	{ year: 1986, ppm: 347.61 },
	{ year: 1987, ppm: 349.31 },
	{ year: 1988, ppm: 351.69 },
	{ year: 1989, ppm: 353.2 },
	{ year: 1990, ppm: 354.45 },
	{ year: 1991, ppm: 355.7 },
	{ year: 1992, ppm: 356.54 },
	{ year: 1993, ppm: 357.21 },
	{ year: 1994, ppm: 358.96 },
	{ year: 1995, ppm: 360.97 },
	{ year: 1996, ppm: 362.74 },
	{ year: 1997, ppm: 363.88 },
	{ year: 1998, ppm: 366.84 },
	{ year: 1999, ppm: 368.54 },
	{ year: 2000, ppm: 369.71 },
	{ year: 2001, ppm: 371.32 },
	{ year: 2002, ppm: 373.45 },
	{ year: 2003, ppm: 375.98 },
	{ year: 2004, ppm: 377.7 },
	{ year: 2005, ppm: 379.98 },
	{ year: 2006, ppm: 382.09 },
	{ year: 2007, ppm: 384.02 },
	{ year: 2008, ppm: 385.83 },
	{ year: 2009, ppm: 387.64 },
	{ year: 2010, ppm: 390.1 },
	{ year: 2011, ppm: 391.85 },
	{ year: 2012, ppm: 394.06 },
	{ year: 2013, ppm: 396.74 },
	{ year: 2014, ppm: 398.81 },
	{ year: 2015, ppm: 401.01 },
	{ year: 2016, ppm: 404.41 },
	{ year: 2017, ppm: 406.76 },
	{ year: 2018, ppm: 408.72 },
	{ year: 2019, ppm: 411.65 },
	{ year: 2020, ppm: 414.21 },
	{ year: 2021, ppm: 416.41 },
	{ year: 2022, ppm: 418.53 },
	{ year: 2023, ppm: 421.08 },
	{ year: 2024, ppm: 424.61 }
]

const renderMultiLineText = (
	lines: string[],
	x: number,
	y: number,
	className: string,
	lineHeight = "1.2em"
): string => {
	const tspans = lines
		.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? "0" : lineHeight}">${line}</tspan>`)
		.join("")
	return `<text x="${x}" y="${y}" class="${className}">${tspans}</text>`
}

export const generateKeelingCurve: WidgetGenerator<typeof KeelingCurvePropsSchema> = (props) => {
	const { width, height, xAxisLabel, yAxisLabel, annotations } = props

	const margin = { top: 20, right: 20, bottom: 50, left: 70 }
	const chartWidth = width - margin.left - margin.right
	const chartHeight = height - margin.top - margin.bottom

	// Hardcoded axis ranges to match the visual
	const xAxis = { min: 1, max: 2021 }
	const yAxis = { min: 240, max: 420 }

	const toSvgX = (val: number) => margin.left + ((val - xAxis.min) / (xAxis.max - xAxis.min)) * chartWidth
	const toSvgY = (val: number) => height - margin.bottom - ((val - yAxis.min) / (yAxis.max - yAxis.min)) * chartHeight

	// Helper to find PPM for a given year via linear interpolation
	const getPpmForYear = (year: number): number => {
		const p1 = CO2_DATA.filter((p) => p.year <= year).pop()
		const p2 = CO2_DATA.find((p) => p.year > year)
		if (!p1) return CO2_DATA[0]?.ppm ?? yAxis.min
		if (!p2) return p1.ppm
		const t = (year - p1.year) / (p2.year - p1.year)
		return p1.ppm + t * (p2.ppm - p1.ppm)
	}

	const ext = initExtents(width)
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">`
	svg += `<defs><marker id="co2-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="black"/></marker></defs>`
	svg +=
		"<style>.axis-label { font-size: 16px; text-anchor: middle; } .annotation-label { font-size: 16px; font-weight: bold; text-anchor: start; }</style>"

	// Gridlines and Axes
	for (let t = yAxis.min; t <= yAxis.max; t += 20) {
		const y = toSvgY(t)
		svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e0e0e0"/>`
		svg += `<text x="${margin.left - 10}" y="${y + 5}" text-anchor="end">${t}</text>`
		includeText(ext, margin.left - 10, String(t), "end", 7)
	}
	svg += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="black" stroke-width="1.5"/>`
	for (const year of [1, 500, 1000, 1500, 2021]) {
		const x = toSvgX(year)
		svg += `<line x1="${x}" y1="${height - margin.bottom}" x2="${x}" y2="${height - margin.bottom + 5}" stroke="black" stroke-width="1.5"/>`
		svg += `<text x="${x}" y="${height - margin.bottom + 20}" text-anchor="middle">${year}</text>`
		includeText(ext, x, String(year), "middle", 7)
	}

	// Axis Labels
	svg += `<text x="${margin.left + chartWidth / 2}" y="${height - 10}" class="axis-label">${xAxisLabel}</text>`
	includeText(ext, margin.left + chartWidth / 2, xAxisLabel, "middle", 7)
	svg += `<text x="${margin.left - 50}" y="${margin.top + chartHeight / 2}" class="axis-label" transform="rotate(-90, ${margin.left - 50}, ${margin.top + chartHeight / 2})">${yAxisLabel}</text>`
	includeText(ext, margin.left - 50, yAxisLabel, "middle", 7)

	// Data Line
	const pointsStr = CO2_DATA.map((p) => `${toSvgX(p.year)},${toSvgY(p.ppm)}`).join(" ")
	svg += `<polyline points="${pointsStr}" fill="none" stroke="black" stroke-width="2.5"/>`

	// Annotations - always placed in upper left corner area
	annotations.forEach((anno, index) => {
		const ppm = getPpmForYear(anno.year)
		const targetX = toSvgX(anno.year)
		const targetY = toSvgY(ppm)

		// Fixed position in upper left area
		const textX = margin.left + 40
		const textY = margin.top + 40 + index * 60 // Stack multiple annotations vertically

		// Draw arrow from text to target point on curve
		svg += `<line x1="${textX}" y1="${textY + 20}" x2="${targetX}" y2="${targetY}" stroke="black" stroke-width="1.5" marker-end="url(#co2-arrow)"/>`
		svg += renderMultiLineText(anno.text, textX, textY, "annotation-label", "1.1em")
		for (const line of anno.text) {
			includeText(ext, textX, line, "start", 7)
		}
	})

	svg += "</svg>"
	return svg
}
