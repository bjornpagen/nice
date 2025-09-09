import { z } from "zod";
import type { WidgetGenerator } from "@/lib/widgets/types";
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl";
import { PADDING } from "@/lib/widgets/utils/constants";
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color";
import { theme } from "@/lib/widgets/utils/theme";

// Function that returns a fresh discriminated union schema to avoid $ref deduplication
const createValueOrUnknownSchema = () => z.discriminatedUnion("type", [
    z.object({
        type: z.literal("value").describe("A known numeric value."),
        value: z.number().int().positive().describe("The numeric value.")
    }),
    z.object({
        type: z.literal("unknown").describe("An unknown value that should be represented by an empty box.")
    })
]).describe("Represents either a known numeric value or an unknown value to be solved.");

// Defines the content for a single cell in the area model.
const CellContentSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("value").describe("The cell displays a specific positive integer value."),
        value: z.number().int().positive().describe("The positive integer value to display in the cell.")
    }),
    z.object({
        type: z.literal("unknown").describe("The cell's value is unknown and should be represented by an empty box.")
    })
]).describe("Determines what is displayed inside a cell: a specific positive integer value or an empty box for a missing number.");

// The main Zod schema for the area model multiplication widget.
export const AreaModelMultiplicationPropsSchema = z.object({
    type: z.literal("areaModelMultiplication").describe("Identifies this as an area model for multiplication."),
    width: z.number().positive().describe("Total width of the diagram in pixels."),
    height: z.number().positive().describe("Total height of the diagram in pixels."),
    rowFactor: createValueOrUnknownSchema().describe("The factor displayed vertically on the left, representing the height of the model."),
    columnFactors: z.array(createValueOrUnknownSchema()).min(1).describe("An array of factors displayed horizontally on top, representing the width of each column."),
    cellContents: z.array(CellContentSchema).describe("An array defining the content for each cell, ordered from left to right. Its length must match the number of column factors."),
    cellColors: z.array(z.string().regex(CSS_COLOR_PATTERN, "invalid css color")).describe("An array of background colors for each cell, ordered from left to right. Its length must match the number of column factors.")
}).strict()
.describe("Creates an area model diagram to visualize the distributive property of multiplication. The model consists of a rectangle partitioned into smaller cells, with factors along the sides and products (or placeholders) inside.");

export type AreaModelMultiplicationProps = z.infer<typeof AreaModelMultiplicationPropsSchema>;

/**
 * Generates an SVG diagram of an area model for multiplication.
 */
export const generateAreaModelMultiplication: WidgetGenerator<typeof AreaModelMultiplicationPropsSchema> = async (props) => {
    const { width, height, rowFactor, columnFactors, cellContents, cellColors } = props;

    // Runtime validation to ensure arrays have matching lengths.
    if (cellContents.length !== columnFactors.length || cellColors.length !== columnFactors.length) {
        throw new Error("The 'columnFactors', 'cellContents', and 'cellColors' arrays must have the same length.");
    }

    // Helper function to get numeric value from ValueOrUnknownSchema
    // For unknown factors, use place value sizing: 10^n where n is distance from end of array
    // (rightmost = ones = 10^0, next left = tens = 10^1, next = hundreds = 10^2, etc.)
    const getFactorValueForLayout = (factor: typeof rowFactor | typeof columnFactors[0], index?: number): number => {
        if (factor.type === "value") {
            return factor.value;
        }
        // For unknown factors, calculate place value based on position from right
        if (index !== undefined) {
            const distanceFromEnd = columnFactors.length - 1 - index;
            return Math.pow(10, distanceFromEnd);
        }
        // Fallback for row factor (not indexed)
        return 100;
    };

    const labelSpace = 40;
    const canvas = new CanvasImpl({
        chartArea: { left: 0, top: 0, width, height },
        fontPxDefault: 16,
        lineHeightDefault: 1.2
    });

    // --- Scaling and Layout ---
    const availableWidth = width - PADDING * 2 - labelSpace;
    const availableHeight = height - PADDING * 2 - labelSpace;

    // Use a log-scale-like approach to prevent tiny cells from small factors
    // This ensures all cells are reasonably sized while still showing proportional relationships
    const minCellWidth = 60; // Minimum width for readability
    const columnFactorValues = columnFactors.map((factor, index) => getFactorValueForLayout(factor, index));
    const logFactors = columnFactorValues.map(factor => Math.log10(factor + 1)); // +1 to handle factor=1
    const totalLogWidth = logFactors.reduce((sum, logFactor) => sum + logFactor, 0);
    
    // Calculate base widths using log scale, then ensure minimum sizes
    const baseWidths = logFactors.map(logFactor => (logFactor / totalLogWidth) * availableWidth);
    const scaledColWidths = baseWidths.map(baseWidth => Math.max(baseWidth, minCellWidth));
    
    // If minimum widths caused overflow, scale down proportionally
    const totalActualWidth = scaledColWidths.reduce((sum, w) => sum + w, 0);
    if (totalActualWidth > availableWidth) {
        const overflowScale = availableWidth / totalActualWidth;
        scaledColWidths.forEach((width, i) => {
            scaledColWidths[i] = width * overflowScale;
        });
    }
    
    // Row height uses available height directly, not scaled by row factor value
    const scaledRowHeight = availableHeight;
    
    const totalGridWidth = scaledColWidths.reduce((sum, w) => sum + w, 0);

    const gridStartX = (width - totalGridWidth) / 2; // Center the grid horizontally
    const gridStartY = PADDING + labelSpace;

    // --- Rendering ---
    let currentX = gridStartX;

    // Draw row factor label (or unknown box)
    if (rowFactor.type === "value") {
        canvas.drawText({
            x: gridStartX - PADDING,
            y: gridStartY + scaledRowHeight / 2,
            text: String(rowFactor.value),
            anchor: "middle",
            dominantBaseline: "middle",
            fontPx: 18,
            fontWeight: theme.font.weight.bold
        });
    } else {
        // Draw unknown box for row factor
        const boxWidth = 30;
        const boxHeight = 20;
        canvas.drawRect(gridStartX - PADDING - boxWidth / 2, gridStartY + scaledRowHeight / 2 - boxHeight / 2, boxWidth, boxHeight, {
            fill: theme.colors.white,
            stroke: theme.colors.black,
            strokeWidth: theme.stroke.width.base
        });
    }

    for (let j = 0; j < columnFactors.length; j++) {
        const colFactor = columnFactors[j]!;
        const colWidth = scaledColWidths[j]!;
        const content = cellContents[j]!;
        const color = cellColors[j]!;

        // Draw cell background
        canvas.drawRect(currentX, gridStartY, colWidth, scaledRowHeight, {
            fill: color,
            stroke: theme.colors.black,
            strokeWidth: theme.stroke.width.thick
        });

        const cellCenterX = currentX + colWidth / 2;
        const cellCenterY = gridStartY + scaledRowHeight / 2;
        
        // Draw column factor label above this cell (or unknown box)
        if (colFactor.type === "value") {
            canvas.drawText({
                x: cellCenterX,
                y: gridStartY - PADDING,
                text: String(colFactor.value),
                anchor: "middle",
                dominantBaseline: "middle",
                fontPx: 18,
                fontWeight: theme.font.weight.bold
            });
        } else {
            // Draw unknown box for column factor
            const boxWidth = 30;
            const boxHeight = 20;
            canvas.drawRect(cellCenterX - boxWidth / 2, gridStartY - PADDING - boxHeight / 2, boxWidth, boxHeight, {
                fill: theme.colors.white,
                stroke: theme.colors.black,
                strokeWidth: theme.stroke.width.base
            });
        }

        switch(content.type) {
            case "value": {
                // Display the specific integer value
                canvas.drawText({
                    x: cellCenterX,
                    y: cellCenterY,
                    text: String(content.value),
                    anchor: "middle",
                    dominantBaseline: "middle",
                    fontPx: 20,
                    fontWeight: theme.font.weight.bold
                });
                break;
            }
            case "unknown": {
                const boxWidth = Math.min(colWidth * 0.6, 80);
                const boxHeight = 30;
                canvas.drawRect(cellCenterX - boxWidth / 2, cellCenterY - boxHeight / 2, boxWidth, boxHeight, {
                    fill: theme.colors.white,
                    stroke: theme.colors.black,
                    strokeWidth: theme.stroke.width.base
                });
                break;
            }
        }
        currentX += colWidth;
    }
    
    const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING);
    return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">${svgBody}</svg>`;
}