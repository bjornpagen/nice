export type Extents = { minX: number; maxX: number }

export function initExtents(initialWidth: number): Extents {
	return { minX: 0, maxX: initialWidth }
}

export function approxTextWidth(text: string, avgCharWidthPx = 7): number {
	return Math.max(0, text.length * avgCharWidthPx)
}

export function includeText(
	ext: Extents,
	absoluteX: number,
	text: string,
	anchor: "start" | "middle" | "end",
	avgCharWidthPx = 7
): void {
	const w = approxTextWidth(text, avgCharWidthPx)
	if (anchor === "start") {
		ext.maxX = Math.max(ext.maxX, absoluteX + w)
		ext.minX = Math.min(ext.minX, absoluteX)
	} else if (anchor === "end") {
		ext.maxX = Math.max(ext.maxX, absoluteX)
		ext.minX = Math.min(ext.minX, absoluteX - w)
	} else {
		// middle
		ext.maxX = Math.max(ext.maxX, absoluteX + w / 2)
		ext.minX = Math.min(ext.minX, absoluteX - w / 2)
	}
}

export function includePointX(ext: Extents, absoluteX: number): void {
	ext.maxX = Math.max(ext.maxX, absoluteX)
	ext.minX = Math.min(ext.minX, absoluteX)
}

export function computeDynamicWidth(
	ext: Extents,
	_height: number,
	pad = 10
): { vbMinX: number; vbMaxX: number; dynamicWidth: number } {
	const vbMinX = Math.min(0, Math.floor(ext.minX - pad))
	const vbMaxX = Math.max(0, Math.ceil(ext.maxX + pad))
	const dynamicWidth = Math.max(1, vbMaxX - vbMinX)
	return { vbMinX, vbMaxX, dynamicWidth }
}
