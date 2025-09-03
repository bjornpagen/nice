import { CHART_TITLE_FONT_PX, CHART_TITLE_TOP_PADDING_PX } from "@/lib/widgets/utils/constants"
import type { Canvas } from "@/lib/widgets/utils/layout"
import { estimateWrappedTextDimensions } from "@/lib/widgets/utils/text"
import { theme } from "@/lib/widgets/utils/theme"

export type ChartFrame = { left: number; top: number; width: number; height: number }

export function drawChartTitle(
	canvas: Canvas,
	frame: ChartFrame,
	title: string,
	options: {
		fontPx?: number
		topPaddingPx?: number
		maxWidthPolicy?: "frame" | "full"
		fill?: string
	}
): { usedTopHeightPx: number } {
	const fontPx = options.fontPx ?? CHART_TITLE_FONT_PX
	const topPaddingPx = options.topPaddingPx ?? CHART_TITLE_TOP_PADDING_PX
	const maxWidthPolicy = options.maxWidthPolicy ?? "frame"
	const fill = options.fill ?? theme.colors.title

	const titleX = frame.left + frame.width / 2
	const titleY = topPaddingPx
	const maxWidthPx = maxWidthPolicy === "frame" ? frame.width : frame.width // Note: 'full' policy is deprecated; always use frame width.

	canvas.drawWrappedText({
		x: titleX,
		y: titleY,
		text: title,
		maxWidthPx,
		fontPx,
		anchor: "middle",
		fill
	})

	const { height } = estimateWrappedTextDimensions(title, maxWidthPx, fontPx)
	return { usedTopHeightPx: topPaddingPx + height }
}
