import { z } from "zod";
import type { WidgetGenerator } from "@/lib/widgets/types";
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl";
import { PADDING } from "@/lib/widgets/utils/constants";
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color";
import { Path2D } from "@/lib/widgets/utils/path-builder";
import { theme } from "@/lib/widgets/utils/theme";

// Factory function to create polygon shape schema to avoid $ref deduplication
const createPolygonShapeSchema = () => z.object({
    type: z.literal("polygon"),
    sides: z.number().int().gte(3).describe("Number of sides for the regular polygon (e.g., 3 for triangle, 4 for square, 8 for octagon)."),
    rotation: z.number().describe("Rotation angle in degrees to orient the polygon (e.g., 45 for a diamond)."),
});

// The main Zod schema for the new widget.
export const SingleFractionalModelDiagramPropsSchema = z.object({
    type: z.literal("singleFractionalModelDiagram").describe("Identifies this as a widget for rendering a single partitioned shape to represent a fraction."),
    width: z.number().positive().describe("Total width of the SVG in pixels."),
    height: z.number().positive().describe("Total height of the SVG in pixels."),
    shape: z.discriminatedUnion("type", [
        z.object({
            type: z.literal("rectangle"),
            rows: z.number().int().positive().describe("Number of rows in the grid partition."),
            columns: z.number().int().positive().describe("Number of columns in the grid partition."),
        }),
        z.object({
            type: z.literal("circle").describe("A circular shape partitioned into equal sectors (pie slices)."),
        }),
        createPolygonShapeSchema(),
    ]).describe("The geometric shape and its partitioning style."),
    totalParts: z.number().int().positive().describe("The denominator of the fraction; the total number of equal parts the shape is divided into."),
    shadedParts: z.number().int().min(0).describe("The numerator of the fraction; the number of parts to shade, starting from the first part."),
    shadeColor: z.string().regex(CSS_COLOR_PATTERN, "invalid css color").describe("The CSS hex color for the shaded parts (e.g., '#4472C4', '#FF6B6B')."),
}).strict();

export type SingleFractionalModelDiagramProps = z.infer<typeof SingleFractionalModelDiagramPropsSchema>;

// Helper function to find the intersection of a ray from a center point with a polygon's edge
// Returns both the intersection point and the edge index that was intersected
function findRayPolygonIntersection(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    polygonVertices: { x: number; y: number }[]
): { point: { x: number; y: number }; edgeIndex: number } | null {
    for (let i = 0; i < polygonVertices.length; i++) {
        const p3 = polygonVertices[i]!;
        const p4 = polygonVertices[(i + 1) % polygonVertices.length]!;

        const den = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        if (den === 0) continue;

        const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / den;
        const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / den;

        if (t >= 0 && u >= 0 && u <= 1) {
            return { point: { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) }, edgeIndex: i };
        }
    }
    return null;
}

export const generateSingleFractionalModelDiagram: WidgetGenerator<typeof SingleFractionalModelDiagramPropsSchema> = async (props) => {
    const { width, height, shape, totalParts, shadedParts, shadeColor } = props;

    // --- Runtime Validation ---
    if (shadedParts > totalParts) {
        throw new Error(`shadedParts (${shadedParts}) cannot be greater than totalParts (${totalParts})`);
    }
    if (shape.type === "rectangle" && shape.rows * shape.columns !== totalParts) {
        throw new Error(`For rectangles, rows (${shape.rows}) * columns (${shape.columns}) must equal totalParts (${totalParts})`);
    }
    // --- End Validation ---

    const canvas = new CanvasImpl({
        chartArea: { left: 0, top: 0, width, height },
        fontPxDefault: 16,
        lineHeightDefault: 1.2
    });

    const size = Math.min(width, height) - PADDING * 2;
    const cx = width / 2;
    const cy = height / 2;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    switch (shape.type) {
        case "rectangle": {
            const { rows, columns } = shape;
            const rectX = cx - size / 2;
            const rectY = cy - size / 2;
            const cellWidth = size / columns;
            const cellHeight = size / rows;

            for (let i = 0; i < shadedParts; i++) {
                const row = Math.floor(i / columns);
                const col = i % columns;
                canvas.drawRect(rectX + col * cellWidth, rectY + row * cellHeight, cellWidth, cellHeight, {
                    fill: shadeColor,
                });
            }

            for (let r = 0; r <= rows; r++) {
                canvas.drawLine(rectX, rectY + r * cellHeight, rectX + size, rectY + r * cellHeight, { stroke: theme.colors.black, strokeWidth: r === 0 || r === rows ? theme.stroke.width.thick : theme.stroke.width.thin });
            }
            for (let c = 0; c <= columns; c++) {
                canvas.drawLine(rectX + c * cellWidth, rectY, rectX + c * cellWidth, rectY + size, { stroke: theme.colors.black, strokeWidth: c === 0 || c === columns ? theme.stroke.width.thick : theme.stroke.width.thin });
            }
            break;
        }

        case "circle": {
            const radius = size / 2;
            const angleStep = 360 / totalParts;

            for (let i = 0; i < totalParts; i++) {
                const startAngle = -90 + i * angleStep;
                const endAngle = startAngle + angleStep;
                
                const startPoint = { x: cx + radius * Math.cos(toRad(startAngle)), y: cy + radius * Math.sin(toRad(startAngle)) };
                const endPoint = { x: cx + radius * Math.cos(toRad(endAngle)), y: cy + radius * Math.sin(toRad(endAngle)) };

                const path = new Path2D().moveTo(cx, cy).lineTo(startPoint.x, startPoint.y).arcTo(radius, radius, 0, 0, 1, endPoint.x, endPoint.y).closePath();
                
                const isShaded = i < shadedParts;
                canvas.drawPath(path, {
                    fill: isShaded ? shadeColor : "none",
                    stroke: theme.colors.black,
                    strokeWidth: theme.stroke.width.base,
                });
            }
            break;
        }
        
        case "polygon": {
            const { sides, rotation } = shape;
            const actualRotation = rotation ?? 0;
            const radius = size / 2;
            const angleOffset = toRad(-90 + actualRotation);
            const vertices = Array.from({ length: sides }, (_, i) => {
                const angle = (i / sides) * 2 * Math.PI + angleOffset;
                return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
            });

            const angleStep = 360 / totalParts;

            for (let i = 0; i < totalParts; i++) {
                // Align sector rays with the same base orientation used for vertices
                const baseAngle = -90 + actualRotation;
                const startAngle = baseAngle + i * angleStep;
                const endAngle = baseAngle + (i + 1) * angleStep;

                const rayStart = { x: cx + Math.cos(toRad(startAngle)), y: cy + Math.sin(toRad(startAngle)) };
                const rayEnd = { x: cx + Math.cos(toRad(endAngle)), y: cy + Math.sin(toRad(endAngle)) };

                const startHit = findRayPolygonIntersection({ x: cx, y: cy }, rayStart, vertices);
                const endHit = findRayPolygonIntersection({ x: cx, y: cy }, rayEnd, vertices);

                if (!startHit || !endHit) continue;

                const { point: startIntersect, edgeIndex: startEdge } = startHit;
                const { point: endIntersect, edgeIndex: endEdge } = endHit;

                const path = new Path2D().moveTo(cx, cy).lineTo(startIntersect.x, startIntersect.y);

                // Walk along the polygon perimeter from the edge after startEdge up to endEdge
                let edge = (startEdge + 1) % sides;
                while (edge !== ((endEdge + 1) % sides)) {
                    const v = vertices[edge]!;
                    path.lineTo(v.x, v.y);
                    edge = (edge + 1) % sides;
                }

                path.lineTo(endIntersect.x, endIntersect.y).closePath();

                const isShaded = i < shadedParts;
                canvas.drawPath(path, {
                    fill: isShaded ? shadeColor : "none",
                    stroke: "none",
                });
            }
            
            canvas.drawPolygon(vertices, { fill: "none", stroke: theme.colors.black, strokeWidth: theme.stroke.width.thick });
            for (let i = 0; i < totalParts; i++) {
                const baseAngle = -90 + actualRotation;
                const angle = toRad(baseAngle + i * angleStep);
                const p2 = { x: cx + radius * 2 * Math.cos(angle), y: cy + radius * 2 * Math.sin(angle) };
                const intersect = findRayPolygonIntersection({ x: cx, y: cy }, p2, vertices);
                if (intersect) {
                    canvas.drawLine(cx, cy, intersect.point.x, intersect.point.y, { stroke: theme.colors.black, strokeWidth: theme.stroke.width.thin });
                }
            }
            break;
        }
    }
    
    const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING);
    return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg">${svgBody}</svg>`;
};