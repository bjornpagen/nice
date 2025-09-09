import { z } from "zod";
import type { WidgetGenerator } from "@/lib/widgets/types";
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl";
import { PADDING } from "@/lib/widgets/utils/constants";
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color";
import { theme } from "@/lib/widgets/utils/theme";
import { buildTicks } from "@/lib/widgets/utils/ticks";
import { selectAxisLabels } from "@/lib/widgets/utils/layout";

// Factory function to create a TickIntervalSchema to avoid $ref issues
const createTickIntervalSchema = () => z.discriminatedUnion("type", [
    z.object({
        type: z.literal("whole"),
        interval: z.number().positive().describe("Whole number interval between ticks (e.g., 1, 2, 5, 10).")
    }).strict(),
    z.object({
        type: z.literal("fraction"),
        denominator: z.number().int().positive().describe("Denominator for unit fractions (e.g., 5 for fifths, 8 for eighths).")
    }).strict()
]).describe("Specification for tick mark intervals.");

// Factory function to create a HighlightedPointSchema to avoid $ref issues
const createHighlightedPointSchema = () => z.object({
    value: z.number().describe("The numerical position of the point on the number line."),
    color: z.string().regex(CSS_COLOR_PATTERN, "invalid css color").describe("CSS hex color for the point and its arrow/label."),
    style: z.enum(["dot", "arrowAndDot"]).describe("Visual style of the marker. 'dot' is a simple circle, 'arrowAndDot' includes an arrow pointing to the dot."),
    label: z.string().nullable().transform(val => val === "" ? null : val).describe("Optional text label for the point. If null, no label is shown.")
}).strict();


export const NumberLinePropsSchema = z.object({
    type: z.literal("numberLine").describe("Identifies this as a general-purpose number line widget."),
    width: z.number().positive().describe("Total width in pixels for horizontal orientation, or the narrower dimension for vertical."),
    height: z.number().positive().describe("Total height in pixels for horizontal orientation, or the longer dimension for vertical."),
    orientation: z.enum(["horizontal", "vertical"]).describe("Direction of the number line."),
    min: z.number().describe("Minimum value shown on the number line."),
    max: z.number().describe("Maximum value shown on the number line."),
    tickInterval: createTickIntervalSchema().describe("Major tick interval specification with full-length ticks and labels."),
    secondaryTickInterval: createTickIntervalSchema().nullable().describe("Optional minor tick interval with half-length ticks and no labels."),
    showTickLabels: z.boolean().describe("If true, automatically places non-overlapping labels at major tick marks."),
    highlightedPoints: z.array(createHighlightedPointSchema()).nullable().describe("An array of special points to mark on the line.")
}).strict();

export type NumberLineProps = z.infer<typeof NumberLinePropsSchema>;

// Helper to convert the schema object to a numeric value
const getNumericInterval = (interval: z.infer<ReturnType<typeof createTickIntervalSchema>>): number => {
    return interval.type === "whole" ? interval.interval : 1 / interval.denominator;
};

export const generateNumberLine: WidgetGenerator<typeof NumberLinePropsSchema> = async (data) => {
    const { width, height, orientation, min, max, tickInterval, secondaryTickInterval, showTickLabels, highlightedPoints } = data;

    if (min >= max) {
        return `<svg width="${width}" height="${height}"></svg>`;
    }

    const isHorizontal = orientation === "horizontal";
    const lineLength = (isHorizontal ? width : height) - 2 * PADDING;
    const canvas = new CanvasImpl({ chartArea: { left: 0, top: 0, width, height }, fontPxDefault: 12, lineHeightDefault: 1.2 });
    const scale = lineLength / (max - min);

    const majorInterval = getNumericInterval(tickInterval);
    const { values: majorValues, labels: majorLabels } = buildTicks(min, max, majorInterval);
    
    const minorValues = secondaryTickInterval ? buildTicks(min, max, getNumericInterval(secondaryTickInterval)).values : [];
    
    if (isHorizontal) {
        const yPos = height / 2;
        const toSvgX = (val: number) => PADDING + (val - min) * scale;

        canvas.drawLine(PADDING, yPos, width - PADDING, yPos, { stroke: theme.colors.axis, strokeWidth: theme.stroke.width.thick });

        const selectedLabels = selectAxisLabels({ labels: majorLabels, positions: majorValues.map(toSvgX), axisLengthPx: lineLength, orientation: "horizontal", fontPx: theme.font.size.small, minGapPx: 8 });

        // Draw minor ticks first
        minorValues.forEach(t => {
            if (!majorValues.some(mt => Math.abs(mt - t) < 1e-9)) { // Avoid drawing over major ticks
                canvas.drawLine(toSvgX(t), yPos - 3, toSvgX(t), yPos + 3, { stroke: theme.colors.axis, strokeWidth: theme.stroke.width.base });
            }
        });

        // Draw major ticks and labels
        majorValues.forEach((t, i) => {
            const x = toSvgX(t);
            canvas.drawLine(x, yPos - 5, x, yPos + 5, { stroke: theme.colors.axis, strokeWidth: theme.stroke.width.base });
            if (showTickLabels && selectedLabels.has(i)) {
                canvas.drawText({ x, y: yPos + 20, text: majorLabels[i]!, fill: theme.colors.axis, anchor: "middle", fontPx: theme.font.size.small });
            }
        });

        // Draw highlighted points
        (highlightedPoints || []).forEach(p => {
            const px = toSvgX(p.value);
            canvas.drawCircle(px, yPos, 5, { fill: p.color, stroke: p.color, strokeWidth: theme.stroke.width.thin });
            
            if (p.style === 'arrowAndDot') {
                const arrowStartY = yPos - 25;
                const arrowEndY = yPos - 8;
                canvas.drawLine(px, arrowStartY, px, arrowEndY, { stroke: p.color, strokeWidth: theme.stroke.width.thick, markerEnd: 'url(#action-arrow)' });
                if(p.label) canvas.drawText({ x: px, y: arrowStartY - 5, text: p.label, fill: p.color, anchor: 'middle', dominantBaseline: 'baseline', fontWeight: '700' });
            } else if (p.label) {
                canvas.drawText({ x: px, y: yPos - 15, text: p.label, fill: p.color, anchor: 'middle', dominantBaseline: 'baseline', fontWeight: '700' });
            }
        });
        
    } else { // Vertical
        const xPos = width / 2;
        const toSvgY = (val: number) => height - PADDING - (val - min) * scale;
        
        canvas.drawLine(xPos, PADDING, xPos, height - PADDING, { stroke: theme.colors.axis, strokeWidth: theme.stroke.width.thick });

        const selectedLabels = selectAxisLabels({ labels: majorLabels, positions: majorValues.map(toSvgY), axisLengthPx: lineLength, orientation: "vertical", fontPx: theme.font.size.small, minGapPx: 12 });
        
        minorValues.forEach(t => {
            if (!majorValues.some(mt => Math.abs(mt - t) < 1e-9)) {
                canvas.drawLine(xPos - 3, toSvgY(t), xPos + 3, toSvgY(t), { stroke: theme.colors.axis, strokeWidth: theme.stroke.width.base });
            }
        });

        majorValues.forEach((t, i) => {
            const y = toSvgY(t);
            canvas.drawLine(xPos - 5, y, xPos + 5, y, { stroke: theme.colors.axis, strokeWidth: theme.stroke.width.base });
            if (showTickLabels && selectedLabels.has(i)) {
                canvas.drawText({ x: xPos - 10, y: y + 4, text: majorLabels[i]!, fill: theme.colors.axis, anchor: "end", fontPx: theme.font.size.small });
            }
        });
        
        (highlightedPoints || []).forEach(p => {
            const py = toSvgY(p.value);
            canvas.drawCircle(xPos, py, 5, { fill: p.color, stroke: p.color, strokeWidth: theme.stroke.width.thin });
            
            if (p.style === 'arrowAndDot') {
                const arrowStartX = xPos - 25;
                const arrowEndX = xPos - 8;
                canvas.drawLine(arrowStartX, py, arrowEndX, py, { stroke: p.color, strokeWidth: theme.stroke.width.thick, markerEnd: 'url(#action-arrow)' });
                if(p.label) canvas.drawText({ x: arrowStartX - 5, y: py, text: p.label, fill: p.color, anchor: 'end', dominantBaseline: 'middle', fontWeight: '700' });
            } else if (p.label) {
                canvas.drawText({ x: xPos + 15, y: py, text: p.label, fill: p.color, anchor: 'start', dominantBaseline: 'middle', fontWeight: '700' });
            }
        });
    }
    
    canvas.addDef(`<marker id="action-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.colors.axis}"/></marker>`);

    const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING);
    return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="12">${svgBody}</svg>`;
};