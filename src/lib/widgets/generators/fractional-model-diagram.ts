import { z } from "zod";
import type { WidgetGenerator } from "@/lib/widgets/types";
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl";
import { PADDING } from "@/lib/widgets/utils/constants";
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color";
import { Path2D } from "@/lib/widgets/utils/path-builder";
import { theme } from "@/lib/widgets/utils/theme";

// Defines the geometric shape used to model the fractions.
const ShapeTypeEnum = z.enum(["circle", "polygon", "box"])
    .describe("The geometric shape for the model. 'circle' for pie charts, 'polygon' for regular polygons, and 'box' for partitioned rectangles.");

// Defines the operator symbol displayed between the two shapes.
const OperatorEnum = z.enum([">", "<", "=", "+", "-"])
    .describe("The comparison or arithmetic operator to display between the two shapes.");

// Defines the properties for a single partitioned shape.
function createPartitionedShapeSchema() {
	return z.object({
			numerator: z.number().int().min(0).describe("The number of shaded pieces in the shape."),
			denominator: z.number().int().positive().describe("The total number of equal pieces the shape is divided into."),
			color: z.string().regex(CSS_COLOR_PATTERN, "invalid css color").describe("The fill color for the shaded pieces.")
		})
		.strict()
}

// The main Zod schema for the widget.
export const FractionModelDiagramPropsSchema = z.object({
		type: z.literal("fractionModelDiagram").describe("Identifies this as a fraction model diagram widget."),
		width: z.number().positive().describe("Total width of the SVG in pixels."),
		height: z.number().positive().describe("Total height of the SVG in pixels."),
        shapeType: ShapeTypeEnum,
		leftShape: createPartitionedShapeSchema().describe("The partitioned shape to be displayed on the left side."),
		rightShape: createPartitionedShapeSchema().describe("The partitioned shape to be displayed on the right side."),
		operator: OperatorEnum
	})
	.strict()
	.describe("Creates a visual representation of fraction comparison or arithmetic using partitioned shapes (circles, regular polygons, or boxes). Ideal for teaching basic fraction concepts, equivalency, and operations like addition and subtraction.");

export type FractionModelDiagramProps = z.infer<typeof FractionModelDiagramPropsSchema>;

/**
 * Generates an SVG diagram comparing or operating on two fractions, represented as partitioned shapes.
 */
export const generateFractionModelDiagram: WidgetGenerator<typeof FractionModelDiagramPropsSchema> = async (props) => {
	const { width, height, shapeType, leftShape, rightShape, operator } = props;

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 16,
		lineHeightDefault: 1.2
	});

	// --- Layout Calculations ---
	const availableHeight = height - PADDING * 4;
	const shapeDiameter = Math.min(width * 0.4, availableHeight);
	const radius = shapeDiameter / 2;
	const verticalCenter = PADDING + radius;

	const leftShapeCx = PADDING + radius;
	const rightShapeCx = width - PADDING - radius;
	const middleX = width / 2;

	const toRad = (deg: number) => (deg * Math.PI) / 180;

    // --- Drawing Functions ---

    const drawPolygonFraction = (cx: number, cy: number, r: number, fraction: z.infer<ReturnType<typeof createPartitionedShapeSchema>>) => {
        const { numerator, denominator, color } = fraction;
        const numSides = denominator;
        const vertices = [];
        const angleOffset = -Math.PI / 2;
        for (let i = 0; i < numSides; i++) {
            const angle = (i / numSides) * 2 * Math.PI + angleOffset;
            vertices.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
        }

        for (let i = 0; i < numSides; i++) {
            const p1 = vertices[i]!;
            const p2 = vertices[(i + 1) % numSides]!;
            const path = new Path2D().moveTo(cx, cy).lineTo(p1.x, p1.y).lineTo(p2.x, p2.y).closePath();
            const isShaded = i < numerator;
			canvas.drawPath(path, { fill: isShaded ? color : "none", fillOpacity: 0.3, stroke: theme.colors.black, strokeWidth: theme.stroke.width.base });
        }
        canvas.drawPolygon(vertices, { fill: "none", stroke: theme.colors.black, strokeWidth: theme.stroke.width.thick });
    };

	const drawCircleFraction = (cx: number, cy: number, r: number, fraction: z.infer<ReturnType<typeof createPartitionedShapeSchema>>) => {
		const { numerator, denominator, color } = fraction;
		const angleStep = 360 / denominator;
		let currentAngle = -90;

		for (let i = 0; i < denominator; i++) {
			const startAngle = currentAngle;
			const endAngle = currentAngle + angleStep;
			const startPoint = { x: cx + r * Math.cos(toRad(startAngle)), y: cy + r * Math.sin(toRad(startAngle)) };
			const endPoint = { x: cx + r * Math.cos(toRad(endAngle)), y: cy + r * Math.sin(toRad(endAngle)) };
			const largeArcFlag: 0 | 1 = angleStep > 180 ? 1 : 0;
			
			const path = new Path2D().moveTo(cx, cy).lineTo(startPoint.x, startPoint.y).arcTo(r, r, 0, largeArcFlag, 1, endPoint.x, endPoint.y).closePath();
			
			const isShaded = i < numerator;
			canvas.drawPath(path, { fill: isShaded ? color : "none", fillOpacity: 0.3, stroke: theme.colors.black, strokeWidth: theme.stroke.width.base });
			currentAngle += angleStep;
		}
	};

    const drawBoxFraction = (cx: number, cy: number, r: number, fraction: z.infer<ReturnType<typeof createPartitionedShapeSchema>>) => {
        const { numerator, denominator, color } = fraction;
        const boxSize = r * 2;
        const boxX = cx - r;
        const boxY = cy - r;
        const barHeight = boxSize / denominator;

        for (let i = 0; i < denominator; i++) {
            const isShaded = i < numerator;
            canvas.drawRect(boxX, boxY + i * barHeight, boxSize, barHeight, {
                fill: isShaded ? color : "none",
                fillOpacity: 0.3,
                stroke: theme.colors.black,
                strokeWidth: theme.stroke.width.base
            });
        }
        canvas.drawRect(boxX, boxY, boxSize, boxSize, { fill: "none", stroke: theme.colors.black, strokeWidth: theme.stroke.width.thick });
    };

    const drawPartitionedShape = (cx: number, cy: number, r: number, fractionData: z.infer<ReturnType<typeof createPartitionedShapeSchema>>) => {
        switch (shapeType) {
            case 'circle':
                drawCircleFraction(cx, cy, r, fractionData);
                break;
            case 'polygon':
                drawPolygonFraction(cx, cy, r, fractionData);
                break;
            case 'box':
                drawBoxFraction(cx, cy, r, fractionData);
                break;
        }

		const labelY = cy + r + PADDING * 1.5;
		const numeratorStr = String(fractionData.numerator);
		const denominatorStr = String(fractionData.denominator);
		const maxLen = Math.max(numeratorStr.length, denominatorStr.length);
		const lineWidth = maxLen * 10;
		
		canvas.drawText({ x: cx, y: labelY - 8, text: numeratorStr, anchor: "middle", fontPx: 18, fontWeight: theme.font.weight.bold });
		canvas.drawLine(cx - lineWidth / 2, labelY, cx + lineWidth / 2, labelY, { stroke: theme.colors.black, strokeWidth: theme.stroke.width.thick });
		canvas.drawText({ x: cx, y: labelY + 12, text: denominatorStr, anchor: "middle", dominantBaseline: "hanging", fontPx: 18, fontWeight: theme.font.weight.bold });
    };
	
	// --- Main Execution ---
	drawPartitionedShape(leftShapeCx, verticalCenter, radius, leftShape);
	drawPartitionedShape(rightShapeCx, verticalCenter, radius, rightShape);

	canvas.drawText({
		x: middleX,
		y: verticalCenter,
		text: operator,
		anchor: "middle",
		dominantBaseline: "middle",
		fontPx: 48,
		fontWeight: theme.font.weight.bold,
		fill: theme.colors.textSecondary,
	});

	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING);
	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">${svgBody}</svg>`;
};