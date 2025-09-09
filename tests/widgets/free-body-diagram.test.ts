import { describe, expect, it } from "bun:test"
import { FreeBodyDiagramPropsSchema, generateFreeBodyDiagram } from "@/lib/widgets/generators/free-body-diagram"

describe("FreeBodyDiagram Widget Generator", () => {
	it("should generate diagram with all four forces labeled", async () => {
		const props = FreeBodyDiagramPropsSchema.parse({
			type: "freeBodyDiagram",
			top: "Normal",
			bottom: "Gravity",
			left: "Friction",
			right: "Applied"
		})

		const svg = await generateFreeBodyDiagram(props)
		expect(svg).toMatchSnapshot()
	})

	it("should generate diagram with only vertical forces", async () => {
		const props = FreeBodyDiagramPropsSchema.parse({
			type: "freeBodyDiagram",
			top: "Normal",
			bottom: "Weight",
			left: null,
			right: null
		})

		const svg = await generateFreeBodyDiagram(props)
		expect(svg).toMatchSnapshot()
	})

	it("should generate diagram with only horizontal forces", async () => {
		const props = FreeBodyDiagramPropsSchema.parse({
			type: "freeBodyDiagram",
			top: null,
			bottom: null,
			left: "Drag",
			right: "Thrust"
		})

		const svg = await generateFreeBodyDiagram(props)
		expect(svg).toMatchSnapshot()
	})

	it("should generate diagram with arrows but no labels (empty strings)", async () => {
		const props = FreeBodyDiagramPropsSchema.parse({
			type: "freeBodyDiagram",
			top: "",
			bottom: "",
			left: "",
			right: ""
		})

		const svg = await generateFreeBodyDiagram(props)
		expect(svg).toMatchSnapshot()
	})

	it("should generate diagram with no forces (all null)", async () => {
		const props = FreeBodyDiagramPropsSchema.parse({
			type: "freeBodyDiagram",
			top: null,
			bottom: null,
			left: null,
			right: null
		})

		const svg = await generateFreeBodyDiagram(props)
		expect(svg).toMatchSnapshot()
	})

	it("should generate diagram with mixed states", async () => {
		const props = FreeBodyDiagramPropsSchema.parse({
			type: "freeBodyDiagram",
			top: "Lift",
			bottom: "",
			left: null,
			right: "Push"
		})

		const svg = await generateFreeBodyDiagram(props)
		expect(svg).toMatchSnapshot()
	})

	it("should generate diagram for inclined plane scenario", async () => {
		const props = FreeBodyDiagramPropsSchema.parse({
			type: "freeBodyDiagram",
			top: "Normal",
			bottom: "Gravity",
			left: "Friction",
			right: null
		})

		const svg = await generateFreeBodyDiagram(props)
		expect(svg).toMatchSnapshot()
	})

	it("should generate diagram for buoyancy scenario", async () => {
		const props = FreeBodyDiagramPropsSchema.parse({
			type: "freeBodyDiagram",
			top: "Buoyant",
			bottom: "Weight",
			left: null,
			right: null
		})

		const svg = await generateFreeBodyDiagram(props)
		expect(svg).toMatchSnapshot()
	})

	it("should generate diagram for tension scenario", async () => {
		const props = FreeBodyDiagramPropsSchema.parse({
			type: "freeBodyDiagram",
			top: "Tension",
			bottom: "Gravity",
			left: "Tension",
			right: "Tension"
		})

		const svg = await generateFreeBodyDiagram(props)
		expect(svg).toMatchSnapshot()
	})

	it("should generate diagram for projectile motion", async () => {
		const props = FreeBodyDiagramPropsSchema.parse({
			type: "freeBodyDiagram",
			top: null,
			bottom: "Gravity",
			left: "AirResistance",
			right: null
		})

		const svg = await generateFreeBodyDiagram(props)
		expect(svg).toMatchSnapshot()
	})

	it("should handle special force names", async () => {
		const props = FreeBodyDiagramPropsSchema.parse({
			type: "freeBodyDiagram",
			top: "Spring",
			bottom: "Gravitational",
			left: "Centripetal",
			right: "Electromagnetic"
		})

		const svg = await generateFreeBodyDiagram(props)
		expect(svg).toMatchSnapshot()
	})

	it("should generate diagram with single force", async () => {
		const props = FreeBodyDiagramPropsSchema.parse({
			type: "freeBodyDiagram",
			top: null,
			bottom: "Weight",
			left: null,
			right: null
		})

		const svg = await generateFreeBodyDiagram(props)
		expect(svg).toMatchSnapshot()
	})

	it("should not duplicate 'Force' when already present in label", async () => {
		const props = FreeBodyDiagramPropsSchema.parse({
			type: "freeBodyDiagram",
			top: "Normal Force",
			bottom: "Gravitational Force",
			left: "Friction Force",
			right: "Applied Force"
		})

		const svg = await generateFreeBodyDiagram(props)
		expect(svg).toMatchSnapshot()
		// Verify no duplication like "Normal Force Force"
		expect(svg).toContain("Normal Force")
		expect(svg).not.toContain("Force Force")
	})

	it("should handle mixed case 'force' in labels", async () => {
		const props = FreeBodyDiagramPropsSchema.parse({
			type: "freeBodyDiagram",
			top: "normal force",
			bottom: "DRAG FORCE",
			left: "Tension force",
			right: "Spring FORCE"
		})

		const svg = await generateFreeBodyDiagram(props)
		expect(svg).toMatchSnapshot()
		// Verify no duplication
		expect(svg).not.toContain("force Force")
		expect(svg).not.toContain("FORCE Force")
	})
})
