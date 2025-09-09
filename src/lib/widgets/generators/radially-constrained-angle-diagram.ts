import { z } from "zod";
import type { WidgetGenerator } from "@/lib/widgets/types";
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl";
import { PADDING } from "@/lib/widgets/utils/constants";
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color";
import { Path2D } from "@/lib/widgets/utils/path-builder";
import { theme } from "@/lib/widgets/utils/theme";

// Schema for a single angle segment in the diagram.
const AngleSegmentSchema = z.object({
    value: z.number().min(1, "Angle value must be at least 1").max(360, "Angle value cannot exceed 360").describe("The measure of the angle in degrees."),
    color: z.string().regex(CSS_COLOR_PATTERN, "Invalid CSS color format").describe("The fill color for the angle's sector."),
}).strict();

// Main Zod schema for the radially-constrained-angle-diagram widget.
export const RadiallyConstrainedAngleDiagramPropsSchema = z.object({
    type: z.literal("radiallyConstrainedAngleDiagram").describe("Identifies this as a radially constrained angle diagram."),
    width: z.number().positive().describe("The total width of the SVG diagram in pixels."),
    height: z.number().positive().describe("The total height of the SVG diagram in pixels."),
    centerLabel: z.string().nullable().transform(val => val === "" ? null : val).describe("An optional label for the center point (e.g., 'O')."),
    angles: z.array(AngleSegmentSchema).min(1, "At least one angle is required.").describe("An array of angle segments to be drawn sequentially around the center."),
    rayLabels: z.array(z.string()).describe("Labels for the rays. There must be exactly one more label than the number of angles."),
}).strict().describe(
    "Creates a diagram with rays originating from a central point, showing the angles between them. This widget is ideal for visualizing geometric problems involving angles around a point, ensuring that the total angle does not exceed 360 degrees."
);

export type RadiallyConstrainedAngleDiagramProps = z.infer<typeof RadiallyConstrainedAngleDiagramPropsSchema>;

/**
 * Generates an SVG diagram of angles constrained around a central point.
 */
export const generateRadiallyConstrainedAngleDiagram: WidgetGenerator<typeof RadiallyConstrainedAngleDiagramPropsSchema> = async (props) => {
    const { width, height, centerLabel, angles, rayLabels } = props;

    // Validate ray labels count
    if (rayLabels.length !== angles.length + 1) {
        throw new Error("There must be exactly one more ray label than the number of angles.");
    }

    // Validate total angle constraint
    const totalAngle = angles.reduce((sum, angle) => sum + angle.value, 0);
    if (totalAngle < 1 || totalAngle > 360) {
        throw new Error("The sum of angles must be between 1 and 360 degrees.");
    }

    const canvas = new CanvasImpl({
        chartArea: { left: 0, top: 0, width, height },
        fontPxDefault: 16,
        lineHeightDefault: 1.2,
    });

    const cx = width / 2;
    const cy = height / 2;

    const totalAngleSum = angles.reduce((sum, angle) => sum + angle.value, 0);
    // Start drawing from an angle that centers the diagram visually.
    const startAngleDeg = -90 - (totalAngleSum / 2);

    const diagramRadius = Math.min(width, height) / 2 - PADDING * 2.5;
    const rayLength = diagramRadius * 1.3;
    const pointOnRayDist = diagramRadius * 1.2;
    const arcRadius = diagramRadius * 0.4;
    const labelRadius = arcRadius + 28;

    const toRad = (deg: number) => (deg * Math.PI) / 180;

    let currentAngleDeg = startAngleDeg;

    // Draw the angle sectors first
    for (const angle of angles) {
        const endAngleDeg = currentAngleDeg + angle.value;

        const startRad = toRad(currentAngleDeg);
        const endRad = toRad(endAngleDeg);
        
        const startPoint = { x: cx + arcRadius * Math.cos(startRad), y: cy + arcRadius * Math.sin(startRad) };
        const endPoint = { x: cx + arcRadius * Math.cos(endRad), y: cy + arcRadius * Math.sin(endRad) };
        
        const largeArcFlag = angle.value > 180 ? 1 : 0;
        const path = new Path2D()
            .moveTo(cx, cy)
            .lineTo(startPoint.x, startPoint.y)
            .arcTo(arcRadius, arcRadius, 0, largeArcFlag, 1, endPoint.x, endPoint.y)
            .closePath();
        
        canvas.drawPath(path, { fill: angle.color, stroke: "none" });

        // Draw the angle value label
        const midAngleRad = toRad(currentAngleDeg + angle.value / 2);
        const labelX = cx + labelRadius * Math.cos(midAngleRad);
        const labelY = cy + labelRadius * Math.sin(midAngleRad);
        canvas.drawText({
            x: labelX,
            y: labelY,
            text: `${angle.value}°`,
            fill: theme.colors.black,
            anchor: "middle",
            dominantBaseline: "middle",
            fontPx: 18,
            fontWeight: theme.font.weight.bold,
        });

        currentAngleDeg = endAngleDeg;
    }

    // Draw the rays and points on top of the sectors
    currentAngleDeg = startAngleDeg;
    for (let i = 0; i < rayLabels.length; i++) {
        const rayAngleRad = toRad(currentAngleDeg);
        
        // Draw the point on the ray
        const pointX = cx + pointOnRayDist * Math.cos(rayAngleRad);
        const pointY = cy + pointOnRayDist * Math.sin(rayAngleRad);
        canvas.drawCircle(pointX, pointY, 4, { fill: theme.colors.black });

        // Draw the ray from center to the point (not beyond)
        canvas.drawLine(cx, cy, pointX, pointY, {
            stroke: theme.colors.black,
            strokeWidth: theme.stroke.width.thick,
        });

        // Draw the label for the ray's point
        const rayLabel = rayLabels[i]!;
        const labelDistFromPoint = 22;
        const rayLabelX = cx + (pointOnRayDist + labelDistFromPoint) * Math.cos(rayAngleRad);
        const rayLabelY = cy + (pointOnRayDist + labelDistFromPoint) * Math.sin(rayAngleRad);
        canvas.drawText({
            x: rayLabelX,
            y: rayLabelY,
            text: rayLabel,
            fill: theme.colors.black,
            anchor: "middle",
            dominantBaseline: "middle",
            fontPx: 20,
            fontWeight: theme.font.weight.bold,
        });

        if (i < angles.length) {
            currentAngleDeg += angles[i]!.value;
        }
    }

    // Draw the center point and its label last to be on top
    canvas.drawCircle(cx, cy, 6, { fill: theme.colors.black });
    if (centerLabel) {
        let labelX: number;
        let labelY: number;
        
        // Calculate the optimal position for the center label
        const unusedAngle = 360 - totalAngleSum;
        
        if (unusedAngle > 0) {
            // Find the bisector of the unused angle (gap between last ray and first ray)
            // The bisector of the unused angle is the optimal direction for the label
            // Last ray ends at: startAngleDeg + totalAngleSum
            // First ray starts at: startAngleDeg
            // The gap is from (startAngleDeg + totalAngleSum) to (startAngleDeg + 360)
            // Bisector is at the middle of this gap
            const lastRayAngle = startAngleDeg + totalAngleSum;
            const bisectorAngle = lastRayAngle + (unusedAngle / 2);
            
            // Convert to radians and calculate label position
            const bisectorRad = toRad(bisectorAngle);
            const labelDistance = 25; // distance from center
            labelX = cx + labelDistance * Math.cos(bisectorRad);
            labelY = cy + labelDistance * Math.sin(bisectorRad);
        } else {
            // If angles total 360°, place label at a safe default position (bottom-right)
            labelX = cx + 15;
            labelY = cy + 15;
        }
        
        canvas.drawText({
            x: labelX,
            y: labelY,
            text: centerLabel,
            fill: theme.colors.black,
            fontPx: 20,
            fontWeight: theme.font.weight.bold,
        });
    }

    const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING);

    return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">${svgBody}</svg>`;
};
