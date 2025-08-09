import { describe, expect, test } from "bun:test"
import { generateUrlImage } from "./url-image"

describe("generateUrlImage", () => {
	test("should render with minimal props", () => {
		const result = generateUrlImage({
			type: "urlImage",
			url: "https://example.com/image.png",
			alt: "Example image",
			width: null,
			height: null,
			caption: null
		})

		expect(result).toMatchSnapshot()
		expect(result).toContain('<img src="https://example.com/image.png"')
		expect(result).toContain('alt="Example image"')
	})

	test("should render with all props specified", () => {
		const result = generateUrlImage({
			type: "urlImage",
			url: "https://example.com/photo.jpg",
			alt: "A beautiful landscape",
			width: 400,
			height: 300,
			caption: "Sunset over the mountains"
		})

		expect(result).toMatchSnapshot()
		expect(result).toContain('<img src="https://example.com/photo.jpg"')
		expect(result).toContain('alt="A beautiful landscape"')
		expect(result).toContain("width: 400px;")
		expect(result).toContain("height: 300px;")
		expect(result).toContain("Sunset over the mountains")
	})

	test("should render with width only", () => {
		const result = generateUrlImage({
			type: "urlImage",
			url: "https://example.com/diagram.svg",
			alt: "Diagram showing process flow",
			width: 600,
			height: null,
			caption: null
		})

		expect(result).toMatchSnapshot()
		expect(result).toContain("width: 600px;")
		expect(result).not.toContain("height:")
	})

	test("should render with height only", () => {
		const result = generateUrlImage({
			type: "urlImage",
			url: "https://example.com/chart.png",
			alt: "Sales chart",
			width: null,
			height: 450,
			caption: null
		})

		expect(result).toMatchSnapshot()
		expect(result).toContain("height: 450px;")
		expect(result).not.toContain("width:")
	})

	test("should render with caption only", () => {
		const result = generateUrlImage({
			type: "urlImage",
			url: "https://example.com/figure.jpg",
			alt: "Scientific figure",
			width: null,
			height: null,
			caption: "Figure 1: Cell division process"
		})

		expect(result).toMatchSnapshot()
		expect(result).toContain("Figure 1: Cell division process")
		expect(result).toContain("font-size: 0.9em")
		expect(result).toContain("color: #555")
	})
})
