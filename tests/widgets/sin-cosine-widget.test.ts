import { describe, expect, it } from "bun:test"
import { generateSinCosineWidget, SinCosineWidgetPropsSchema } from "@/lib/widgets/generators/sin-cosine-widget"

describe("sin-cosine-widget", () => {
	it("generates basic sine wave", async () => {
		const props = {
			type: "sinCosineWidget" as const,
			width: 400,
			height: 300,
			xAxis: {
				min: -Math.PI,
				max: Math.PI,
				tickInterval: Math.PI / 2,
				label: "x",
				showGridLines: false
			},
			yAxis: {
				min: -1.5,
				max: 1.5,
				tickInterval: 0.5,
				label: "y",
				showGridLines: false
			},
			plots: [
				{
					type: "sin" as const,
					color: "#0066cc",
					strokeWidth: 2,
					style: "solid" as const
				}
			],
			points: []
		}

		const validationResult = SinCosineWidgetPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSinCosineWidget(validationResult.data)
		expect(svg).toMatchSnapshot()
	})

	it("generates basic cosine wave", async () => {
		const props = {
			type: "sinCosineWidget" as const,
			width: 400,
			height: 300,
			xAxis: {
				min: -Math.PI,
				max: Math.PI,
				tickInterval: Math.PI / 2,
				label: "x",
				showGridLines: false
			},
			yAxis: {
				min: -1.5,
				max: 1.5,
				tickInterval: 0.5,
				label: "y",
				showGridLines: false
			},
			plots: [
				{
					type: "cos" as const,
					color: "#cc6600",
					strokeWidth: 2,
					style: "solid" as const
				}
			],
			points: []
		}

		const validationResult = SinCosineWidgetPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSinCosineWidget(validationResult.data)
		expect(svg).toMatchSnapshot()
	})

	it("generates both sine and cosine waves", async () => {
		const props = {
			type: "sinCosineWidget" as const,
			width: 400,
			height: 300,
			xAxis: {
				min: -Math.PI,
				max: Math.PI,
				tickInterval: Math.PI / 2,
				label: "x",
				showGridLines: false
			},
			yAxis: {
				min: -1.5,
				max: 1.5,
				tickInterval: 0.5,
				label: "y",
				showGridLines: false
			},
			plots: [
				{
					type: "sin" as const,
					color: "#0066cc",
					strokeWidth: 2,
					style: "solid" as const
				},
				{
					type: "cos" as const,
					color: "#cc6600",
					strokeWidth: 2,
					style: "solid" as const
				}
			],
			points: []
		}

		const validationResult = SinCosineWidgetPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSinCosineWidget(validationResult.data)
		expect(svg).toMatchSnapshot()
	})

	it("generates with custom styling", async () => {
		const props = {
			type: "sinCosineWidget" as const,
			width: 400,
			height: 300,
			xAxis: {
				min: -Math.PI,
				max: Math.PI,
				tickInterval: Math.PI / 2,
				label: "x",
				showGridLines: false
			},
			yAxis: {
				min: -1.5,
				max: 1.5,
				tickInterval: 0.5,
				label: "y",
				showGridLines: false
			},
			plots: [
				{
					type: "sin" as const,
					color: "#ff4444",
					strokeWidth: 3,
					style: "solid" as const
				}
			],
			points: []
		}

		const validationResult = SinCosineWidgetPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSinCosineWidget(validationResult.data)
		expect(svg).toMatchSnapshot()
	})

	it("generates with dashed line style", async () => {
		const props = {
			type: "sinCosineWidget" as const,
			width: 400,
			height: 300,
			xAxis: {
				min: -Math.PI,
				max: Math.PI,
				tickInterval: Math.PI / 2,
				label: "x",
				showGridLines: false
			},
			yAxis: {
				min: -1.5,
				max: 1.5,
				tickInterval: 0.5,
				label: "y",
				showGridLines: false
			},
			plots: [
				{
					type: "cos" as const,
					color: "#44aa44",
					strokeWidth: 2,
					style: "dashed" as const
				}
			],
			points: []
		}

		const validationResult = SinCosineWidgetPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSinCosineWidget(validationResult.data)
		expect(svg).toMatchSnapshot()
	})

	it("generates with grid lines", async () => {
		const props = {
			type: "sinCosineWidget" as const,
			width: 400,
			height: 300,
			xAxis: {
				min: -Math.PI,
				max: Math.PI,
				tickInterval: Math.PI / 2,
				label: "x",
				showGridLines: true
			},
			yAxis: {
				min: -1.5,
				max: 1.5,
				tickInterval: 0.5,
				label: "y",
				showGridLines: true
			},
			plots: [
				{
					type: "sin" as const,
					color: "#0066cc",
					strokeWidth: 2,
					style: "solid" as const
				}
			],
			points: []
		}

		const validationResult = SinCosineWidgetPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSinCosineWidget(validationResult.data)
		expect(svg).toMatchSnapshot()
	})

	it("generates with highlighted points", async () => {
		const props = {
			type: "sinCosineWidget" as const,
			width: 400,
			height: 300,
			xAxis: {
				min: -Math.PI,
				max: Math.PI,
				tickInterval: Math.PI / 2,
				label: "x",
				showGridLines: false
			},
			yAxis: {
				min: -1.5,
				max: 1.5,
				tickInterval: 0.5,
				label: "y",
				showGridLines: false
			},
			plots: [
				{
					type: "sin" as const,
					color: "#0066cc",
					strokeWidth: 2,
					style: "solid" as const
				}
			],
			points: [
				{ id: "origin", x: 0, y: 0, label: "(0,0)", color: "#ff0000", style: "closed" as const },
				{ id: "pi-half", x: Math.PI/2, y: 1, label: "(π/2,1)", color: "#00ff00", style: "closed" as const },
				{ id: "pi", x: Math.PI, y: 0, label: "(π,0)", color: "#0000ff", style: "closed" as const }
			]
		}

		const validationResult = SinCosineWidgetPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSinCosineWidget(validationResult.data)
		expect(svg).toMatchSnapshot()
	})

	it("generates with extended range", async () => {
		const props = {
			type: "sinCosineWidget" as const,
			width: 400,
			height: 300,
			xAxis: {
				min: -2 * Math.PI,
				max: 2 * Math.PI,
				tickInterval: Math.PI / 2,
				label: "x",
				showGridLines: false
			},
			yAxis: {
				min: -1.5,
				max: 1.5,
				tickInterval: 0.5,
				label: "y",
				showGridLines: false
			},
			plots: [
				{
					type: "sin" as const,
					color: "#aa00aa",
					strokeWidth: 2,
					style: "solid" as const
				}
			],
			points: []
		}

		const validationResult = SinCosineWidgetPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSinCosineWidget(validationResult.data)
		expect(svg).toMatchSnapshot()
	})

	it("generates multiple waves with different styles", async () => {
		const props = {
			type: "sinCosineWidget" as const,
			width: 500,
			height: 350,
			xAxis: {
				min: -Math.PI,
				max: Math.PI,
				tickInterval: Math.PI / 4,
				label: "θ",
				showGridLines: true
			},
			yAxis: {
				min: -2,
				max: 2,
				tickInterval: 0.5,
				label: "amplitude",
				showGridLines: true
			},
			plots: [
				{
					type: "sin" as const,
					color: "#0066cc",
					strokeWidth: 3,
					style: "solid" as const
				},
				{
					type: "cos" as const,
					color: "#cc6600",
					strokeWidth: 2,
					style: "dashed" as const
				}
			],
			points: [
				{ id: "origin", x: 0, y: 0, label: "origin", color: "#ff0000", style: "closed" as const },
				{ id: "sin-quarter", x: Math.PI/4, y: Math.sin(Math.PI/4), label: "sin(π/4)", color: "#00ff00", style: "closed" as const },
				{ id: "cos-quarter", x: Math.PI/4, y: Math.cos(Math.PI/4), label: "cos(π/4)", color: "#0000ff", style: "closed" as const }
			]
		}

		const validationResult = SinCosineWidgetPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSinCosineWidget(validationResult.data)
		expect(svg).toMatchSnapshot()
	})
})
