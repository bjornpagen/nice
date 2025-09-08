import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { Path2D } from "@/lib/widgets/utils/path-builder"
import { theme } from "@/lib/widgets/utils/theme"
import { estimateWrappedTextDimensions } from "@/lib/widgets/utils/text"

// A simple, safe regex for identifiers.
const identifierRegex = /^[A-Za-z0-9_]+$/;

/**
 * Defines a structured label for dimensions, separating the numeric or variable
 * value from its unit for clear, consistent rendering.
 *
 * Factory pattern to avoid shared Zod instances which cause $ref generation.
 */
function createLabelSchema() {
    return z.object({
        value: z.union([z.number(), z.string()])
            .describe("The numerical value or variable for the label (e.g., 10, 7.5, 'x')."),
        unit: z.string().nullable()
            .describe("The unit for the value (e.g., 'cm', 'in', 'm'). If the unit is unknown or not applicable, this MUST be null.")
    }).strict().nullable();
}

/**
 * Defines a single vertex with a unique ID and coordinates.
 * This is the single source of truth for all points in the diagram.
 *
 * Factory to prevent $ref generation.
 */
function createVertexSchema() {
    return z.object({
        id: z.string().regex(identifierRegex)
            .describe("A unique identifier for this vertex (e.g., 'A', 'B', 'midpoint1'). This ID is used to reference this point in all other parts of the schema."),
        x: z.number()
            .describe("The horizontal coordinate in the diagram's logical space. The shape is auto-centered, so coordinates can be relative to a logical origin (0,0)."),
        y: z.number()
            .describe("The vertical coordinate in the diagram's logical space. Positive y is downward.")
    }).strict();
}

/**
 * Describes a single, labeled segment that is part of a larger partitioned edge.
 * This is the building block for creating boundaries with multiple labels.
 *
 * Factory to prevent $ref generation.
 */
function createPartitionedSegmentSchema() {
    return z.object({
        label: createLabelSchema()
            .describe("Structured label for this specific segment of an edge. Use null for no label."),
        style: z.enum(["solid", "dashed"])
            .describe("The visual style of this segment's line. 'solid' is standard, 'dashed' can indicate an unmeasured or auxiliary part.")
    }).strict();
}

/**
 * A discriminated union to explicitly define a boundary edge.
 * An edge can either be a simple line between two vertices or a
 * complex path composed of multiple, individually labeled segments.
 *
 * Factory to prevent $ref generation.
 */
function createBoundaryEdgeSchema() {
    return z.discriminatedUnion("type", [
        z.object({
            type: z.literal("simple").describe("A single, continuous edge between two vertices."),
            from: z.string().regex(identifierRegex)
                .describe("The ID of the vertex where this edge starts. Must match an ID in the `vertices` array."),
            to: z.string().regex(identifierRegex)
                .describe("The ID of the vertex where this edge ends. Must match an ID in the `vertices` array."),
            label: createLabelSchema()
                .describe("A single structured label for the entire length of this edge. Use null for no label.")
        }).strict(),
        z.object({
            type: z.literal("partitioned").describe("An edge composed of multiple segments connected in a path."),
            path: z.array(z.string().regex(identifierRegex)).min(3)
                .describe("An ordered list of vertex IDs defining the path of the edge (e.g., ['A', 'M', 'B']). Must contain at least 3 IDs to define at least two segments."),
            segments: z.array(createPartitionedSegmentSchema())
                .describe("The definitions for each segment along the path. CRITICAL: The number of segments in this array must be exactly one less than the number of vertex IDs in the `path` array.")
        }).strict()
    ]);
}

/**
 * Defines a line segment that is *internal* to the shape, used for decomposition.
 *
 * Factory to prevent $ref generation.
 */
function createInternalSegmentSchema() {
    return z.object({
		fromVertexId: z.string().regex(identifierRegex)
			.describe("ID of the starting vertex. Must be a valid ID from the `vertices` array."),
		toVertexId: z.string().regex(identifierRegex)
			.describe("ID of the ending vertex. Must be a valid ID from the `vertices` array."),
		style: z.enum(["solid", "dashed"]) 
			.describe("Visual style of the line. 'dashed' is common for heights or decomposition lines."),
		label: createLabelSchema()
			.describe("Structured label for the segment's length or name. Use null for no label.")
    }).strict();
}

/**
 * Defines a shaded polygonal region within the composite shape.
 *
 * Factory to prevent $ref generation.
 */
function createShadedRegionSchema() {
    return z.object({
		vertexIds: z.array(z.string().regex(identifierRegex)).min(3)
			.describe("An ordered array of vertex IDs defining the boundary of the region to shade."),
		fillColor: z.string().regex(CSS_COLOR_PATTERN)
			.describe("CSS fill color for this region (e.g., '#FFE5CC', 'rgba(0,128,255,0.3)'). Use alpha for transparency.")
    }).strict();
}

/**
 * Defines a text label placed at an arbitrary position inside a region.
 *
 * Factory to prevent $ref generation.
 */
function createRegionLabelSchema() {
    return z.object({
		text: z.string()
			.describe("The label text to display (e.g., 'Region A', '45 cm²')."),
		position: z.object({
			x: z.number().describe("Horizontal position for the label in the same coordinate system as vertices."),
			y: z.number().describe("Vertical position for the label in the same coordinate system as vertices.")
		}).strict()
    }).strict();
}

/**
 * Defines a right-angle marker at a vertex.
 *
 * Factory to prevent $ref generation.
 */
function createRightAngleMarkerSchema() {
    return z.object({
		cornerVertexId: z.string().regex(identifierRegex)
        .describe("The ID of the vertex where the right angle's corner is located."),
		adjacentVertex1Id: z.string().regex(identifierRegex)
        .describe("The ID of the first adjacent vertex, forming one leg of the angle."),
		adjacentVertex2Id: z.string().regex(identifierRegex)
        .describe("The ID of the second adjacent vertex, forming the other leg of the angle.")
    }).strict();
}

/**
 * Creates complex composite polygons with internal divisions, shaded regions, and geometric annotations.
 * This API is designed to be explicit and robust, defining the shape's perimeter as a collection of `boundaryEdges`.
 * This approach avoids ambiguity and allows for clear, semantically correct definitions of complex boundaries with multiple labels.
 */
export const CompositeShapeDiagramPropsSchema = z.object({
	type: z.literal("compositeShapeDiagram")
		.describe("Identifies this as a composite shape diagram widget."),
	width: z.number().positive()
		.describe("Total width of the SVG canvas in pixels. The diagram will be auto-centered and scaled to fit within this dimension."),
	height: z.number().positive()
		.describe("Total height of the SVG canvas in pixels. The diagram will be auto-centered and scaled to fit within this dimension."),
	vertices: z.array(createVertexSchema())
		.describe("An array of all vertex points that define the shape. Each vertex must have a unique ID, which is used to construct edges and regions."),
	
	boundaryEdges: z.array(createBoundaryEdgeSchema())
        .describe("An ordered array of edge definitions that trace the outer perimeter of the shape. This is the primary mechanism for defining the shape's boundary and its labels."),

	internalSegments: z.array(createInternalSegmentSchema()).nullable()
		.describe("Line segments *inside* the shape, used for area decomposition (e.g., showing the height). This should NOT be used to define the outer boundary."),

	shadedRegions: z.array(createShadedRegionSchema()).nullable()
		.describe("Polygonal regions to fill with color, defined by a list of vertex IDs."),

	regionLabels: z.array(createRegionLabelSchema()).nullable()
		.describe("Text labels positioned freely inside the shape's regions."),

	rightAngleMarkers: z.array(createRightAngleMarkerSchema()).nullable()
		.describe("Square markers indicating 90° angles at specified vertices.")

}).strict();

export type CompositeShapeDiagramProps = z.infer<typeof CompositeShapeDiagramPropsSchema>;
type Point = { x: number; y: number };
type Label = z.infer<ReturnType<typeof createLabelSchema>>;

// Helper function to format the label object into a display string.
const formatLabel = (label: Label): string | null => {
    if (!label) return null;
    if (label.unit) {
        return `${label.value} ${label.unit}`;
    }
    return String(label.value);
};

/**
 * Generates a diagram of a composite polygon from a set of vertices. Ideal for area
 * problems involving the decomposition of a complex shape into simpler figures.
 */
export const generateCompositeShapeDiagram: WidgetGenerator<typeof CompositeShapeDiagramPropsSchema> = async (data) => {
	const {
		width,
		height,
		vertices,
		boundaryEdges,
		internalSegments = [],
		shadedRegions = [],
		regionLabels = [],
		rightAngleMarkers = [],
	} = data;

	if (vertices.length === 0) {
		return `<svg width="${width}" height="${height}" />`;
	}

	const vertexMap = new Map(vertices.map(v => [v.id, { x: v.x, y: v.y }]));

    // --- Data Validation ---
    for (const edge of boundaryEdges) {
        if (edge.type === "partitioned") {
            if (edge.segments.length !== edge.path.length - 1) {
                logger.error("Partitioned edge segment/path mismatch", {
                    pathCount: edge.path.length,
                    segmentCount: edge.segments.length,
                });
                throw errors.new(`For a partitioned edge, segments length (${edge.segments.length}) must be one less than path length (${edge.path.length}).`);
            }
        }
    }
    // --- End Validation ---

	// Fit-to-canvas projection (uniform scale + centering)
	const allPoints: Point[] = [...vertices.map(v => ({ x: v.x, y: v.y })), ...(regionLabels || []).map(l => ({ x: l.position.x, y: l.position.y }))];

	const computeFit = (points: Point[]) => {
		if (points.length === 0) return { scale: 1, project: (p: Point) => p };
		const minX = Math.min(...points.map((p) => p.x));
		const maxX = Math.max(...points.map((p) => p.x));
		const minY = Math.min(...points.map((p) => p.y));
		const maxY = Math.max(...points.map((p) => p.y));
		const rawW = maxX - minX;
		const rawH = maxY - minY;
		const scale = Math.min((width - 2 * PADDING) / (rawW || 1), (height - 2 * PADDING) / (rawH || 1));
		const offsetX = (width - scale * rawW) / 2 - scale * minX;
		const offsetY = (height - scale * rawH) / 2 - scale * minY;
		const project = (p: Point) => ({ x: offsetX + scale * p.x, y: offsetY + scale * p.y });
		return { scale, project };
	};

	const { scale, project } = computeFit(allPoints);
	const canvas = new CanvasImpl({ chartArea: { left: 0, top: 0, width, height }, fontPxDefault: 12, lineHeightDefault: 1.2 });

	// 1. Shaded regions (drawn first)
	for (const region of shadedRegions || []) {
		const regionPoints = region.vertexIds.map(id => vertexMap.get(id)).filter((p): p is Point => !!p).map(project);
		if (regionPoints.length >= 3) {
			canvas.drawPolygon(regionPoints, { fill: region.fillColor, stroke: "none" });
		}
	}

	// 2. Main shape boundary and its labels
	const outerBoundaryPath = new Path2D();
	const transformedPerimeter: Array<{ x: number; y: number }> = []
	for (const [index, edge] of boundaryEdges.entries()) {
		if (edge.type === "simple") {
			const from = vertexMap.get(edge.from);
			const to = vertexMap.get(edge.to);
			if (!from || !to) continue;

			const pFrom = project(from);
			if (index === 0) {
				outerBoundaryPath.moveTo(pFrom.x, pFrom.y);
				transformedPerimeter.push(pFrom);
			}
			const pTo = project(to);
			outerBoundaryPath.lineTo(pTo.x, pTo.y);
			transformedPerimeter.push(pTo);

		} else { // Partitioned edge
			const pathPoints = edge.path.map(id => vertexMap.get(id)).filter((p): p is Point => !!p);
			if (pathPoints.length < 2) continue;
			
			if (index === 0 && pathPoints[0]) {
				const first = project(pathPoints[0]);
				outerBoundaryPath.moveTo(first.x, first.y);
				transformedPerimeter.push(first);
			}
			for (let i = 1; i < pathPoints.length; i++) {
				if (pathPoints[i]) {
					const pt = project(pathPoints[i]!);
					outerBoundaryPath.lineTo(pt.x, pt.y);
					transformedPerimeter.push(pt);
				}
			}

			for (let i = 0; i < edge.segments.length; i++) {
				const from = pathPoints[i]!;
				const to = pathPoints[i+1]!;
				const segment = edge.segments[i]!;

				const p1 = project(from);
				const p2 = project(to);
				const dash = segment.style === "dashed" ? "4 2" : undefined;
				canvas.drawLine(p1.x, p1.y, p2.x, p2.y, { stroke: theme.colors.black, strokeWidth: theme.stroke.width.base, dash });
			}
		}
	}
	canvas.drawPath(outerBoundaryPath.closePath(), { fill: "none", stroke: theme.colors.black, strokeWidth: theme.stroke.width.thick });

	// Build perimeter segments for collision checks
	const perimeterSegments: Array<{ a: { x: number; y: number }; b: { x: number; y: number } }> = []
	for (let i = 0; i < transformedPerimeter.length; i++) {
		const a = transformedPerimeter[i]
		const b = transformedPerimeter[(i + 1) % transformedPerimeter.length]
		if (a && b) perimeterSegments.push({ a, b })
	}

	// 2b. Boundary simple-edge labels with collision avoidance
	for (const edge of boundaryEdges) {
		if (edge.type !== "simple") continue
		const from = vertexMap.get(edge.from)
		const to = vertexMap.get(edge.to)
		if (!from || !to) continue
		const labelText = formatLabel(edge.label)
		if (!labelText) continue
		const sFrom = project(from)
		const sTo = project(to)
		const midX = (sFrom.x + sTo.x) / 2
		const midY = (sFrom.y + sTo.y) / 2
		const dx = sTo.x - sFrom.x
		const dy = sTo.y - sFrom.y
		const len = Math.hypot(dx, dy)
		if (len === 0) continue
		let nx = -dy / len
		let ny = dx / len
		const polyCenterX = transformedPerimeter.reduce((sum, v) => sum + v.x, 0) / Math.max(transformedPerimeter.length, 1)
		const polyCenterY = transformedPerimeter.reduce((sum, v) => sum + v.y, 0) / Math.max(transformedPerimeter.length, 1)
		const toCenterX = polyCenterX - midX
		const toCenterY = polyCenterY - midY
		const dot = nx * toCenterX + ny * toCenterY
		if (dot > 0) { nx = -nx; ny = -ny }
		const fontPx = theme.font.size.medium
		const { maxWidth: w, height: h } = estimateWrappedTextDimensions(labelText, Number.POSITIVE_INFINITY, fontPx, 1.2)
		const halfW = w / 2
		const halfH = h / 2
		const baseOffsetPx = 12
		function placeFor(dirX: number, dirY: number) {
			let px = midX + dirX * baseOffsetPx
			let py = midY + dirY * baseOffsetPx
			let it = 0
			const maxIt = 60
			const step = 2
			while (polygonIntersectsRect(transformedPerimeter, { x: px - halfW, y: py - halfH, width: w, height: h, pad: 1 }) && it < maxIt) {
				px += dirX * step
				py += dirY * step
				it++
			}
			return { x: px, y: py, it }
		}
		const outward = placeFor(nx, ny)
		const inward = placeFor(-nx, -ny)
		const chosen = inward.it < outward.it ? inward : outward
		canvas.drawText({ x: chosen.x, y: chosen.y, text: labelText, fill: theme.colors.text, anchor: "middle", dominantBaseline: "middle", fontPx, fontWeight: theme.font.weight.bold })
	}

	// 2c. Partitioned segment labels with collision avoidance
	for (const edge of boundaryEdges) {
		if (edge.type !== "partitioned") continue
		const pathPoints = edge.path.map(id => vertexMap.get(id)).filter((p): p is Point => !!p)
		for (let i = 0; i < edge.segments.length; i++) {
			const from = pathPoints[i]!
			const to = pathPoints[i + 1]!
			const labelText = formatLabel(edge.segments[i]!.label)
			if (!labelText) continue
			const sFrom = project(from)
			const sTo = project(to)
			const midX = (sFrom.x + sTo.x) / 2
			const midY = (sFrom.y + sTo.y) / 2
			const dx = sTo.x - sFrom.x
			const dy = sTo.y - sFrom.y
			const len = Math.hypot(dx, dy)
			if (len === 0) continue
			let nx = -dy / len
			let ny = dx / len
			const polyCenterX = transformedPerimeter.reduce((sum, v) => sum + v.x, 0) / Math.max(transformedPerimeter.length, 1)
			const polyCenterY = transformedPerimeter.reduce((sum, v) => sum + v.y, 0) / Math.max(transformedPerimeter.length, 1)
			const toCenterX = polyCenterX - midX
			const toCenterY = polyCenterY - midY
			const dot = nx * toCenterX + ny * toCenterY
			if (dot > 0) { nx = -nx; ny = -ny }
			const fontPx = theme.font.size.base
			const { maxWidth: w, height: h } = estimateWrappedTextDimensions(labelText, Number.POSITIVE_INFINITY, fontPx, 1.2)
			const halfW = w / 2
			const halfH = h / 2
			const baseOffsetPx = 10
			function placeFor(dirX: number, dirY: number) {
				let px = midX + dirX * baseOffsetPx
				let py = midY + dirY * baseOffsetPx
				let it = 0
				const maxIt = 60
				const step = 2
				while (polygonIntersectsRect(transformedPerimeter, { x: px - halfW, y: py - halfH, width: w, height: h, pad: 1 }) && it < maxIt) {
					px += dirX * step
					py += dirY * step
					it++
				}
				return { x: px, y: py, it }
			}
			const outward = placeFor(nx, ny)
			const inward = placeFor(-nx, -ny)
			const chosen = inward.it < outward.it ? inward : outward
			canvas.drawText({ x: chosen.x, y: chosen.y, text: labelText, fill: theme.colors.text, anchor: "middle", dominantBaseline: "middle", fontPx, stroke: theme.colors.background, strokeWidth: 3, paintOrder: "stroke fill" })
		}
	}

	// 3. Internal segments
	const internalSegmentsScreen: Array<{ a: { x: number; y: number }; b: { x: number; y: number }, label: string | null }> = []
	for (const s of internalSegments || []) {
		const from = vertexMap.get(s.fromVertexId);
		const to = vertexMap.get(s.toVertexId);
		if (!from || !to) continue;

		const p1 = project(from);
		const p2 = project(to);
		const dash = s.style === "dashed" ? "4 2" : undefined;
		canvas.drawLine(p1.x, p1.y, p2.x, p2.y, { stroke: theme.colors.black, strokeWidth: theme.stroke.width.base, dash });
		internalSegmentsScreen.push({ a: p1, b: p2, label: formatLabel(s.label) });
	}

	// 3b. Internal segment labels with collision avoidance against all lines
	function rectIntersectsAnyLine(rect: { x: number; y: number; width: number; height: number; pad?: number }): boolean {
		for (const seg of perimeterSegments) { if (segmentIntersectsRect(seg.a, seg.b, rect)) return true }
		for (const seg of internalSegmentsScreen) { if (seg.label && segmentIntersectsRect(seg.a, seg.b, rect)) return true }
		return false
	}
	for (const seg of internalSegmentsScreen) {
		const labelText = seg.label
		if (!labelText) continue
		const sFrom = seg.a
		const sTo = seg.b
		const midX = (sFrom.x + sTo.x) / 2
		const midY = (sFrom.y + sTo.y) / 2
		const dx = sTo.x - sFrom.x
		const dy = sTo.y - sFrom.y
		const len = Math.hypot(dx, dy)
		if (len === 0) continue
		let nx = -dy / len
		let ny = dx / len
		const fontPx = theme.font.size.base
		const { maxWidth: w, height: h } = estimateWrappedTextDimensions(labelText, Number.POSITIVE_INFINITY, fontPx, 1.2)
		const halfW = w / 2
		const halfH = h / 2
		const baseOffsetPx = 8
		function placeFor(dirX: number, dirY: number) {
			let px = midX + dirX * baseOffsetPx
			let py = midY + dirY * baseOffsetPx
			let it = 0
			const maxIt = 60
			const step = 2
			while (rectIntersectsAnyLine({ x: px - halfW, y: py - halfH, width: w, height: h, pad: 1 }) && it < maxIt) {
				px += dirX * step
				py += dirY * step
				it++
			}
			return { x: px, y: py, it }
		}
		const a = placeFor(nx, ny)
		const b = placeFor(-nx, -ny)
		const chosen = a.it <= b.it ? a : b
		canvas.drawText({ x: chosen.x, y: chosen.y, text: labelText, fill: theme.colors.text, anchor: "middle", dominantBaseline: "middle", fontPx, stroke: theme.colors.background, strokeWidth: 3, paintOrder: "stroke fill" })
	}

	// 4. Region labels
	for (const l of regionLabels || []) {
		const pos0 = project({ x: l.position.x, y: l.position.y });
		const fontPx = theme.font.size.medium
		const { maxWidth: w, height: h } = estimateWrappedTextDimensions(l.text, Number.POSITIVE_INFINITY, fontPx, 1.2)
		const halfW = w / 2
		const halfH = h / 2

		function rectIntersectsAnyLine(rect: { x: number; y: number; width: number; height: number; pad?: number }): boolean {
			for (const seg of perimeterSegments) { if (segmentIntersectsRect(seg.a, seg.b, rect)) return true }
			for (const seg of internalSegmentsScreen) { if (segmentIntersectsRect(seg.a, seg.b, rect)) return true }
			return false
		}

		function nearestPointOnSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
			const abx = b.x - a.x
			const aby = b.y - a.y
			const ab2 = abx * abx + aby * aby
			if (ab2 === 0) return { x: a.x, y: a.y }
			const apx = p.x - a.x
			const apy = p.y - a.y
			let t = (apx * abx + apy * aby) / ab2
			if (t < 0) t = 0
			if (t > 1) t = 1
			return { x: a.x + t * abx, y: a.y + t * aby }
		}

		function computeAwayDirection(px: number, py: number): { dx: number; dy: number } {
			let bestDist2 = Number.POSITIVE_INFINITY
			let nearest: { a: { x: number; y: number }; b: { x: number; y: number } } | null = null
			for (const seg of perimeterSegments) {
				const q = nearestPointOnSegment({ x: px, y: py }, seg.a, seg.b)
				const dx = px - q.x
				const dy = py - q.y
				const d2 = dx * dx + dy * dy
				if (d2 < bestDist2) { bestDist2 = d2; nearest = seg }
			}
			for (const seg of internalSegmentsScreen) {
				const q = nearestPointOnSegment({ x: px, y: py }, seg.a, seg.b)
				const dx = px - q.x
				const dy = py - q.y
				const d2 = dx * dx + dy * dy
				if (d2 < bestDist2) { bestDist2 = d2; nearest = seg }
			}
			if (!nearest) return { dx: 0, dy: -1 }
			const q = nearestPointOnSegment({ x: px, y: py }, nearest.a, nearest.b)
			let dx = px - q.x
			let dy = py - q.y
			const len = Math.hypot(dx, dy)
			if (len === 0) return { dx: 0, dy: -1 }
			dx /= len
			dy /= len
			return { dx, dy }
		}

		function placeFor(dirX: number, dirY: number) {
			let px = pos0.x
			let py = pos0.y
			let it = 0
			const maxIt = 80
			const step = 2
			while (rectIntersectsAnyLine({ x: px - halfW, y: py - halfH, width: w, height: h, pad: 1 }) && it < maxIt) {
				px += dirX * step
				py += dirY * step
				it++
				// keep the center inside the polygon
				if (!pointInPolygon({ x: px, y: py }, transformedPerimeter)) {
					it = maxIt + 1
					break
				}
			}
			return { x: px, y: py, it }
		}

		const away = computeAwayDirection(pos0.x, pos0.y)
		const a = placeFor(away.dx, away.dy)
		const b = placeFor(-away.dx, -away.dy)
		let chosen = a
		if (b.it < a.it) chosen = b
		if (chosen.it > 80) {
			// fallback attempt in axes if both failed within bounds
			const c = placeFor(0, -1)
			const d = placeFor(1, 0)
			const e = placeFor(0, 1)
			const f = placeFor(-1, 0)
			chosen = [a, b, c, d, e, f].reduce((best, cur) => (cur.it < best.it ? cur : best))
		}

		canvas.drawText({ x: chosen.x, y: chosen.y, text: l.text, fill: theme.colors.text, anchor: "middle", dominantBaseline: "middle", fontPx, fontWeight: theme.font.weight.bold });
	}

	// 5. Right-angle markers
	for (const m of rightAngleMarkers || []) {
		const corner = vertexMap.get(m.cornerVertexId);
		const adj1 = vertexMap.get(m.adjacentVertex1Id);
		const adj2 = vertexMap.get(m.adjacentVertex2Id);
		if (!corner || !adj1 || !adj2) continue;

		const v1x = adj1.x - corner.x;
		const v1y = adj1.y - corner.y;
		const mag1 = Math.hypot(v1x, v1y);
		if (mag1 === 0) continue;
		const u1x = v1x / mag1;
		const u1y = v1y / mag1;

		const v2x = adj2.x - corner.x;
		const v2y = adj2.y - corner.y;
		const mag2 = Math.hypot(v2x, v2y);
		if (mag2 === 0) continue;
		const u2x = v2x / mag2;
		const u2y = v2y / mag2;

		const markerSizePx = 10;
		const markerSizeData = markerSizePx / scale;
		const p1x = corner.x + u1x * markerSizeData;
		const p1y = corner.y + u1y * markerSizeData;
		const p2x = corner.x + u2x * markerSizeData;
		const p2y = corner.y + u2y * markerSizeData;
		const p3x = corner.x + (u1x + u2x) * markerSizeData;
		const p3y = corner.y + (u1y + u2y) * markerSizeData;

		const q1 = project({ x: p1x, y: p1y });
		const q2 = project({ x: p3x, y: p3y });
		const q3 = project({ x: p2x, y: p2y });
		const markerPath = new Path2D().moveTo(q1.x, q1.y).lineTo(q2.x, q2.y).lineTo(q3.x, q3.y);
		canvas.drawPath(markerPath, { fill: "none", stroke: theme.colors.black, strokeWidth: theme.stroke.width.base });
	}

	// Finalize and return SVG
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING);
	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.small}">${svgBody}</svg>`;
};

// Geometry helpers for collision checks in screen space
function segmentIntersectsRect(
    A: { x: number; y: number },
    B: { x: number; y: number },
    rect: { x: number; y: number; width: number; height: number; pad?: number }
): boolean {
    const pad = rect.pad ?? 0
    const rx = rect.x - pad
    const ry = rect.y - pad
    const rw = rect.width + 2 * pad
    const rh = rect.height + 2 * pad

    const minX = Math.min(A.x, B.x)
    const maxX = Math.max(A.x, B.x)
    const minY = Math.min(A.y, B.y)
    const maxY = Math.max(A.y, B.y)
    if (maxX < rx || minX > rx + rw || maxY < ry || minY > ry + rh) {
        return false
    }

    if (pointInRect(A.x, A.y, rx, ry, rw, rh) || pointInRect(B.x, B.y, rx, ry, rw, rh)) return true

    const r1 = { x: rx, y: ry }
    const r2 = { x: rx + rw, y: ry }
    const r3 = { x: rx + rw, y: ry + rh }
    const r4 = { x: rx, y: ry + rh }

    if (segmentsIntersect(A, B, r1, r2)) return true
    if (segmentsIntersect(A, B, r2, r3)) return true
    if (segmentsIntersect(A, B, r3, r4)) return true
    if (segmentsIntersect(A, B, r4, r1)) return true

    return false
}

function polygonIntersectsRect(
    poly: Array<{ x: number; y: number }>,
    rect: { x: number; y: number; width: number; height: number; pad?: number }
): boolean {
    if (poly.length < 2) return false
    const pad = rect.pad ?? 0
    const rx = rect.x - pad
    const ry = rect.y - pad
    const rw = rect.width + 2 * pad
    const rh = rect.height + 2 * pad

    for (let i = 0; i < poly.length; i++) {
        const a = poly[i]
        const b = poly[(i + 1) % poly.length]
        if (!a || !b) continue
        if (segmentIntersectsRect(a, b, { x: rx, y: ry, width: rw, height: rh })) return true
    }

    for (const p of poly) {
        if (pointInRect(p.x, p.y, rx, ry, rw, rh)) return true
    }

    const cx = rx + rw / 2
    const cy = ry + rh / 2
    if (pointInPolygon({ x: cx, y: cy }, poly)) return true

    return false
}

function pointInRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh
}

function segmentsIntersect(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    p4: { x: number; y: number }
): boolean {
    function orientation(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
        const val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
        if (val > 0) return 1
        if (val < 0) return -1
        return 0
    }
    function onSegment(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): boolean {
        return Math.min(a.x, c.x) <= b.x && b.x <= Math.max(a.x, c.x) && Math.min(a.y, c.y) <= b.y && b.y <= Math.max(a.y, c.y)
    }
    const o1 = orientation(p1, p2, p3)
    const o2 = orientation(p1, p2, p4)
    const o3 = orientation(p3, p4, p1)
    const o4 = orientation(p3, p4, p2)

    if (o1 !== o2 && o3 !== o4) return true
    if (o1 === 0 && onSegment(p1, p3, p2)) return true
    if (o2 === 0 && onSegment(p1, p4, p2)) return true
    if (o3 === 0 && onSegment(p3, p1, p4)) return true
    if (o4 === 0 && onSegment(p3, p2, p4)) return true
    return false
}

function pointInPolygon(point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean {
    if (polygon.length < 3) return false
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const pi = polygon[i]
        const pj = polygon[j]
        if (!pi || !pj) continue
        const xi = pi.x
        const yi = pi.y
        const xj = pj.x
        const yj = pj.y
        const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
        if (intersect) inside = !inside
    }
    return inside
}