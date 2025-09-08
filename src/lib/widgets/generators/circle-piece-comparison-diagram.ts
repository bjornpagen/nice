import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { Path2D } from "@/lib/widgets/utils/path-builder"
import { theme } from "@/lib/widgets/utils/theme"

// Factory function to avoid JSON schema $ref generation for nested schemas
function createFractionSchema() {
	return z
		.object({
			numerator: z
				.number()
				.int()
				.min(0)
				.describe("The number of shaded pieces in the circle."),
			denominator: z
				.number()
				.int()
				.positive()
				.describe("The total number of equal pieces the circle is divided into."),
			color: z
				.string()
				.regex(CSS_COLOR_PATTERN, "invalid css color")
				.describe("The fill color for the shaded pieces.")
		})
		.strict()
}

// The main Zod schema for the widget
export const CirclePieceComparisonDiagramPropsSchema = z
	.object({
		type: z
			.literal("circlePieceComparisonDiagram")
			.describe("Identifies this as a circle piece comparison diagram widget."),
		width: z.number().positive().describe("Total width of the SVG in pixels."),
		height: z.number().positive().describe("Total height of the SVG in pixels."),
		leftFraction: createFractionSchema().describe("The fraction to be displayed on the left side."),
		rightFraction: createFractionSchema().describe("The fraction to be displayed on the right side."),
		comparison: z.enum([">", "<", "="]).describe(
			"The comparison operator to display between the two fractions."
		)
	})
	.strict()
	.describe(
		"Creates a visual comparison of two fractions using pie charts. Each chart is divided into a number of equal sectors, with a specified number of sectors shaded to represent the fraction's value. This is ideal for teaching basic fraction concepts and comparisons."
	)

export type CirclePieceComparisonDiagramProps = z.infer<typeof CirclePieceComparisonDiagramPropsSchema>;

/**
 * Generates an SVG diagram comparing two fractions represented as pie charts.
 */
export const generateCirclePieceComparisonDiagram: WidgetGenerator<typeof CirclePieceComparisonDiagramPropsSchema> = async (props) => {
	const { width, height, leftFraction, rightFraction, comparison } = props;

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 16,
		lineHeightDefault: 1.2
	});

	// Layout calculations
	const availableHeight = height - PADDING * 4; // Extra padding for fraction labels
	const circleDiameter = Math.min(width * 0.4, availableHeight);
	const radius = circleDiameter / 2;
	const verticalCenter = PADDING + radius;

	const leftCircleCx = PADDING + radius;
	const rightCircleCx = width - PADDING - radius;
	const middleX = width / 2;

	const toRad = (deg: number) => (deg * Math.PI) / 180;

	// Helper function to draw a fraction as a pie chart
	const drawCircleFraction = (
		cx: number,
		cy: number,
		r: number,
		fraction: z.infer<ReturnType<typeof createFractionSchema>>
	) => {
		const { numerator, denominator, color } = fraction;
		const angleStep = 360 / denominator;
		let currentAngle = -90; // Start at the top

		// Draw sectors
		for (let i = 0; i < denominator; i++) {
			const startAngle = currentAngle;
			const endAngle = currentAngle + angleStep;

			const startPoint = {
				x: cx + r * Math.cos(toRad(startAngle)),
				y: cy + r * Math.sin(toRad(startAngle))
			};
			const endPoint = {
				x: cx + r * Math.cos(toRad(endAngle)),
				y: cy + r * Math.sin(toRad(endAngle))
			};

			const largeArcFlag: 0 | 1 = angleStep > 180 ? 1 : 0;
			
			const path = new Path2D()
				.moveTo(cx, cy)
				.lineTo(startPoint.x, startPoint.y)
				.arcTo(r, r, 0, largeArcFlag, 1, endPoint.x, endPoint.y)
				.closePath();
			
			const isShaded = i < numerator;
			canvas.drawPath(path, {
				fill: isShaded ? color : "none",
				fillOpacity: isShaded ? 0.3 : 1,
				stroke: theme.colors.black,
				strokeWidth: theme.stroke.width.base,
			});

			currentAngle += angleStep;
		}
		
		// Draw fraction label below the circle
		const labelY = cy + r + PADDING * 1.5;
		const numeratorStr = String(numerator);
		const denominatorStr = String(denominator);
		const maxLen = Math.max(numeratorStr.length, denominatorStr.length);
		const lineWidth = maxLen * 10; // estimate line width
		
		canvas.drawText({
			x: cx,
			y: labelY - 8,
			text: numeratorStr,
			anchor: "middle",
			fontPx: 18,
			fontWeight: theme.font.weight.bold,
		});

		canvas.drawLine(cx - lineWidth / 2, labelY, cx + lineWidth / 2, labelY, {
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thick,
		});
		
		canvas.drawText({
			x: cx,
			y: labelY + 12,
			text: denominatorStr,
			anchor: "middle",
			dominantBaseline: "hanging",
			fontPx: 18,
			fontWeight: theme.font.weight.bold,
		});
	};
	
	// Draw the left fraction circle
	drawCircleFraction(leftCircleCx, verticalCenter, radius, leftFraction);
	
	// Draw the right fraction circle
	drawCircleFraction(rightCircleCx, verticalCenter, radius, rightFraction);

	// Draw the comparison symbol in the middle
	canvas.drawText({
		x: middleX,
		y: verticalCenter,
		text: comparison,
		anchor: "middle",
		dominantBaseline: "middle",
		fontPx: 48,
		fontWeight: theme.font.weight.bold,
		fill: theme.colors.textSecondary,
	});

	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING);

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">${svgBody}</svg>`;
};