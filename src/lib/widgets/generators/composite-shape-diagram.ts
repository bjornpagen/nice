import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { Path2D } from "@/lib/widgets/utils/path-builder"
import { theme } from "@/lib/widgets/utils/theme"

// A simple, safe regex for identifiers.
const identifierRegex = /^[A-Za-z0-9_]+$/;

/**
 * Defines a structured label for dimensions, separating the numeric or variable
 * value from its unit for clear, consistent rendering.
 */
const LabelSchema = z.object({
    value: z.union([z.number(), z.string()])
        .describe("The numerical value or variable for the label (e.g., 10, 7.5, 'x')."),
    unit: z.string().nullable()
        .describe("The unit for the value (e.g., 'cm', 'in', 'm'). If the unit is unknown or not applicable, this MUST be null.")
}).strict().nullable();

/**
 * Defines a single vertex with a unique ID and coordinates.
 * This is the single source of truth for all points in the diagram.
 */
const VertexSchema = z.object({
    id: z.string().regex(identifierRegex)
        .describe("A unique identifier for this vertex (e.g., 'A', 'B', 'midpoint1'). This ID is used to reference this point in all other parts of the schema."),
    x: z.number()
        .describe("The horizontal coordinate in the diagram's logical space. The shape is auto-centered, so coordinates can be relative to a logical origin (0,0)."),
    y: z.number()
        .describe("The vertical coordinate in the diagram's logical space. Positive y is downward.")
}).strict();

/**
 * Describes a single, labeled segment that is part of a larger partitioned edge.
 * This is the building block for creating boundaries with multiple labels.
 */
const PartitionedSegmentSchema = z.object({
    label: LabelSchema
        .describe("Structured label for this specific segment of an edge. Use null for no label."),
    style: z.enum(["solid", "dashed"])
        .describe("The visual style of this segment's line. 'solid' is standard, 'dashed' can indicate an unmeasured or auxiliary part.")
}).strict();

/**
 * A discriminated union to explicitly define a boundary edge.
 * An edge can either be a simple line between two vertices or a
 * complex path composed of multiple, individually labeled segments.
 */
const BoundaryEdgeSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("simple").describe("A single, continuous edge between two vertices."),
        from: z.string().regex(identifierRegex)
            .describe("The ID of the vertex where this edge starts. Must match an ID in the `vertices` array."),
        to: z.string().regex(identifierRegex)
            .describe("The ID of the vertex where this edge ends. Must match an ID in the `vertices` array."),
        label: LabelSchema
            .describe("A single structured label for the entire length of this edge. Use null for no label."),
        offset: z.number()
            .describe("The distance in pixels to offset the label from the edge. Positive values are outside the shape, negative are inside.")
    }).strict(),
    z.object({
        type: z.literal("partitioned").describe("An edge composed of multiple segments connected in a path."),
        path: z.array(z.string().regex(identifierRegex)).min(3)
            .describe("An ordered list of vertex IDs defining the path of the edge (e.g., ['A', 'M', 'B']). Must contain at least 3 IDs to define at least two segments."),
        segments: z.array(PartitionedSegmentSchema)
            .describe("The definitions for each segment along the path. CRITICAL: The number of segments in this array must be exactly one less than the number of vertex IDs in the `path` array.")
    }).strict()
]);

/**
 * Defines a line segment that is *internal* to the shape, used for decomposition.
 */
const InternalSegmentSchema = z.object({
	fromVertexId: z.string().regex(identifierRegex)
		.describe("ID of the starting vertex. Must be a valid ID from the `vertices` array."),
	toVertexId: z.string().regex(identifierRegex)
		.describe("ID of the ending vertex. Must be a valid ID from the `vertices` array."),
	style: z.enum(["solid", "dashed"])
		.describe("Visual style of the line. 'dashed' is common for heights or decomposition lines."),
	label: LabelSchema
		.describe("Structured label for the segment's length or name. Use null for no label.")
}).strict();

/**
 * Defines a shaded polygonal region within the composite shape.
 */
const ShadedRegionSchema = z.object({
	vertexIds: z.array(z.string().regex(identifierRegex)).min(3)
		.describe("An ordered array of vertex IDs defining the boundary of the region to shade."),
	fillColor: z.string().regex(CSS_COLOR_PATTERN)
		.describe("CSS fill color for this region (e.g., '#FFE5CC', 'rgba(0,128,255,0.3)'). Use alpha for transparency.")
}).strict();

/**
 * Defines a text label placed at an arbitrary position inside a region.
 */
const RegionLabelSchema = z.object({
	text: z.string()
		.describe("The label text to display (e.g., 'Region A', '45 cm²')."),
	position: z.object({
		x: z.number().describe("Horizontal position for the label in the same coordinate system as vertices."),
		y: z.number().describe("Vertical position for the label in the same coordinate system as vertices.")
	}).strict()
}).strict();

/**
 * Defines a right-angle marker at a vertex.
 */
const RightAngleMarkerSchema = z.object({
	cornerVertexId: z.string().regex(identifierRegex)
        .describe("The ID of the vertex where the right angle's corner is located."),
	adjacentVertex1Id: z.string().regex(identifierRegex)
        .describe("The ID of the first adjacent vertex, forming one leg of the angle."),
	adjacentVertex2Id: z.string().regex(identifierRegex)
        .describe("The ID of the second adjacent vertex, forming the other leg of the angle.")
}).strict();

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
	vertices: z.array(VertexSchema)
		.describe("An array of all vertex points that define the shape. Each vertex must have a unique ID, which is used to construct edges and regions."),
	
	boundaryEdges: z.array(BoundaryEdgeSchema)
        .describe("An ordered array of edge definitions that trace the outer perimeter of the shape. This is the primary mechanism for defining the shape's boundary and its labels."),

	internalSegments: z.array(InternalSegmentSchema).nullable()
		.describe("Line segments *inside* the shape, used for area decomposition (e.g., showing the height). This should NOT be used to define the outer boundary."),

	shadedRegions: z.array(ShadedRegionSchema).nullable()
		.describe("Polygonal regions to fill with color, defined by a list of vertex IDs."),

	regionLabels: z.array(RegionLabelSchema).nullable()
		.describe("Text labels positioned freely inside the shape's regions."),

	rightAngleMarkers: z.array(RightAngleMarkerSchema).nullable()
		.describe("Square markers indicating 90° angles at specified vertices.")

}).strict();

export type CompositeShapeDiagramProps = z.infer<typeof CompositeShapeDiagramPropsSchema>;
type Point = { x: number; y: number };
type Label = z.infer<typeof LabelSchema>;

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
export const generateCompositeShapeDiagram: WidgetGenerator<typeof CompositeShapeDiagramPropsSchema> = (data) => {
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
	for (const [index, edge] of boundaryEdges.entries()) {
		if (edge.type === "simple") {
			const from = vertexMap.get(edge.from);
			const to = vertexMap.get(edge.to);
			if (!from || !to) continue;

			const pFrom = project(from);
			if (index === 0) outerBoundaryPath.moveTo(pFrom.x, pFrom.y);
			outerBoundaryPath.lineTo(project(to).x, project(to).y);

            const labelText = formatLabel(edge.label);
            if(labelText) {
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const edgeLength = Math.hypot(dx, dy);
                if (edgeLength === 0) continue;
                let perpX = -dy / edgeLength;
                let perpY = dx / edgeLength;

                const centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
                const centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
                const testX = midX + perpX * 10;
                const testY = midY + perpY * 10;
                const distToCenterFromTest = Math.hypot(testX - centerX, testY - centerY);
                const distToCenterFromMid = Math.hypot(midX - centerX, midY - centerY);
                if (distToCenterFromTest < distToCenterFromMid) {
                    perpX *= -1;
                    perpY *= -1;
                }

                const offsetData = edge.offset / scale;
                const labelPx = project({ x: midX + perpX * offsetData, y: midY + perpY * offsetData });

                canvas.drawText({
                    x: labelPx.x,
                    y: labelPx.y,
                    text: labelText,
                    fill: theme.colors.text,
                    anchor: "middle",
                    dominantBaseline: "middle",
                    fontPx: theme.font.size.medium,
                    fontWeight: theme.font.weight.bold
                });
            }

		} else { // Partitioned edge
			const pathPoints = edge.path.map(id => vertexMap.get(id)).filter((p): p is Point => !!p);
			if (pathPoints.length < 2) continue;
            
            if (index === 0 && pathPoints[0]) outerBoundaryPath.moveTo(project(pathPoints[0]).x, project(pathPoints[0]).y);
			for (let i = 1; i < pathPoints.length; i++) {
                if (pathPoints[i]) outerBoundaryPath.lineTo(project(pathPoints[i]!).x, project(pathPoints[i]!).y);
			}

            for (let i = 0; i < edge.segments.length; i++) {
                const from = pathPoints[i]!;
                const to = pathPoints[i+1]!;
                const segment = edge.segments[i]!;

                const p1 = project(from);
                const p2 = project(to);
                const dash = segment.style === "dashed" ? "4 2" : undefined;
                canvas.drawLine(p1.x, p1.y, p2.x, p2.y, { stroke: theme.colors.black, strokeWidth: theme.stroke.width.base, dash });

                const labelText = formatLabel(segment.label);
                if (labelText) {
                    const midX = (from.x + to.x) / 2;
                    const midY = (from.y + to.y) / 2;
                    const angle = Math.atan2(to.y - from.y, to.x - from.x);
                    const offsetMagData = 5 / scale;
                    const offsetX = -Math.sin(angle) * offsetMagData;
                    const offsetY = Math.cos(angle) * offsetMagData;
                    const labelPx = project({ x: midX + offsetX, y: midY + offsetY });
                    canvas.drawText({
                        x: labelPx.x, y: labelPx.y, text: labelText, fill: theme.colors.text, anchor: "middle",
                        dominantBaseline: "middle", fontPx: theme.font.size.base, stroke: theme.colors.background, strokeWidth: 3, paintOrder: "stroke fill"
                    });
                }
            }
		}
	}
	canvas.drawPath(outerBoundaryPath.closePath(), { fill: "none", stroke: theme.colors.black, strokeWidth: theme.stroke.width.thick });

	// 3. Internal segments
	for (const s of internalSegments || []) {
		const from = vertexMap.get(s.fromVertexId);
		const to = vertexMap.get(s.toVertexId);
		if (!from || !to) continue;

		const p1 = project(from);
		const p2 = project(to);
		const dash = s.style === "dashed" ? "4 2" : undefined;
		canvas.drawLine(p1.x, p1.y, p2.x, p2.y, { stroke: theme.colors.black, strokeWidth: theme.stroke.width.base, dash });

		const labelText = formatLabel(s.label);
		if (labelText) {
			const midX = (from.x + to.x) / 2;
			const midY = (from.y + to.y) / 2;
			const angle = Math.atan2(to.y - from.y, to.x - from.x);
			const offsetMagData = 5 / scale;
			const offsetX = -Math.sin(angle) * offsetMagData;
			const offsetY = Math.cos(angle) * offsetMagData;
			const labelPx = project({ x: midX + offsetX, y: midY + offsetY });
			canvas.drawText({
				x: labelPx.x, y: labelPx.y, text: labelText, fill: theme.colors.text, anchor: "middle",
				dominantBaseline: "middle", fontPx: theme.font.size.base, stroke: theme.colors.background, strokeWidth: 3, paintOrder: "stroke fill"
			});
		}
	}

	// 4. Region labels
	for (const l of regionLabels || []) {
		const pos = project({ x: l.position.x, y: l.position.y });
		canvas.drawText({ x: pos.x, y: pos.y, text: l.text, fill: theme.colors.text, anchor: "middle", dominantBaseline: "middle", fontPx: theme.font.size.medium, fontWeight: theme.font.weight.bold });
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