import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single node in the tree diagram
const TreeNodeSchema = z
	.object({
		id: z.string().describe("A unique identifier for this node (e.g., 'root', 'n1-left')."),
		label: z.string().describe("The text content to display within or near the node (e.g., '144', 'x')."),
		position: z
			.object({
				x: z.number().describe("The horizontal coordinate for the center of the node."),
				y: z.number().describe("The vertical coordinate for the center of the node.")
			})
			.strict()
			.describe("The explicit {x, y} coordinates for the node's position."),
		style: z
			.enum(["circled", "default"])
			.nullable()
			.transform((val) => val ?? "default")
			.describe("The visual style of the node. All nodes are now rendered with circles regardless of this setting."),
		color: z
			.string()
			.nullable()
			.transform((val) => val ?? "black")
			.describe("The CSS color for the node's text and circle stroke.")
	})
	.strict()

// Defines a directed edge (a connecting line) between two nodes
const TreeEdgeSchema = z
	.object({
		from: z.string().describe("The `id` of the parent node where the edge originates."),
		to: z.string().describe("The `id` of the child node where the edge terminates."),
		style: z
			.enum(["solid", "dashed"])
			.nullable()
			.transform((val) => val ?? "solid")
			.describe("The style of the connecting line.")
	})
	.strict()

// The main Zod schema for the treeDiagram function
export const TreeDiagramPropsSchema = z
	.object({
		type: z.literal("treeDiagram"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total height of the output SVG container in pixels."),
		nodes: z.array(TreeNodeSchema).min(1).describe("An array of all nodes to be rendered in the diagram."),
		edges: z.array(TreeEdgeSchema).describe("An array of all edges connecting the nodes."),
		nodeFontSize: z
			.number()
			.nullable()
			.transform((val) => val ?? 16)
			.describe("The font size for the text inside the nodes."),
		nodeRadius: z
			.number()
			.nullable()
			.transform((val) => val ?? 20)
			.describe("The radius of the circle for 'circled' nodes.")
	})
	.strict()
	.describe(
		"Generates a versatile SVG tree diagram for representing hierarchical data. This widget is ideal for visualizing structures like prime factorization trees, probability diagrams, or simple organizational charts. It renders a collection of nodes (with text labels) and edges (lines) based on explicit coordinate positions, providing full control over the final layout."
	)

export type TreeDiagramProps = z.infer<typeof TreeDiagramPropsSchema>

/**
 * Generates a flexible SVG tree diagram from a set of nodes and edges.
 * Ideal for factor trees, probability trees, and other hierarchical structures.
 */
export const generateTreeDiagram: WidgetGenerator<typeof TreeDiagramPropsSchema> = (props) => {
	const { width, height, nodes, edges, nodeFontSize, nodeRadius } = props

	const padding = 20
	const minX = Math.min(...nodes.map((n) => n.position.x))
	const maxX = Math.max(...nodes.map((n) => n.position.x))
	const minY = Math.min(...nodes.map((n) => n.position.y))
	const maxY = Math.max(...nodes.map((n) => n.position.y))

	// Calculate a viewBox that encompasses all nodes with padding
	const vbX = minX - padding - nodeRadius
	const vbY = minY - padding - nodeRadius
	const vbWidth = maxX - minX + (padding + nodeRadius) * 2
	const vbHeight = maxY - minY + (padding + nodeRadius) * 2

	let svg = `<svg width="${width}" height="${height}" viewBox="${vbX} ${vbY} ${vbWidth} ${vbHeight}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`

	// Create a map for quick node lookup by ID
	const nodeMap = new Map(nodes.map((node) => [node.id, node]))

	// 1. Draw Edges (in the background)
	for (const edge of edges) {
		const fromNode = nodeMap.get(edge.from)
		const toNode = nodeMap.get(edge.to)
		if (!fromNode || !toNode) continue

		const dash = edge.style === "dashed" ? 'stroke-dasharray="5 3"' : ""
		svg += `<line x1="${fromNode.position.x}" y1="${fromNode.position.y}" x2="${toNode.position.x}" y2="${toNode.position.y}" stroke="black" stroke-width="2" ${dash}/>`
	}

	// 2. Draw Nodes (on top of edges)
	for (const node of nodes) {
		const { x, y } = node.position
		// Draw a circle for all nodes
		svg += `<circle cx="${x}" cy="${y}" r="${nodeRadius}" fill="white" stroke="${node.color}" stroke-width="2"/>`
		// Draw the text label for all nodes
		svg += `<text x="${x}" y="${y}" fill="${node.color}" font-size="${nodeFontSize}px" text-anchor="middle" dominant-baseline="middle">${node.label}</text>`
	}

	svg += "</svg>"
	return svg
}
