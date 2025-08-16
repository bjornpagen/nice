// Shared text rendering helpers for widgets

/**
 * Renders a text element with optional wrapping.
 * 1) If the text ends with a parenthetical ("... (...)"), and is long (> 36), split conservatively into two lines.
 * 2) Otherwise, if maxWidthPx is provided and the estimated width exceeds it, split into two balanced lines by words.
 * 3) Else render as a single line.
 */
export function renderWrappedText(
	text: string,
	x: number,
	y: number,
	className: string,
	lineHeight = "1.1em",
	maxWidthPx?: number,
	approxCharWidthPx = 8
): string {
	let lines: string[] = []
	const titlePattern = /^(.*)\s+(\(.+\))$/
	const m = text.match(titlePattern)
	if (m?.[1] && m[2]) {
		const shouldSplit = text.length > 36
		lines = shouldSplit ? [m[1].trim(), m[2].trim()] : [text]
	} else {
		const estimated = text.length * approxCharWidthPx
		if (maxWidthPx && estimated > maxWidthPx) {
			const words = text.split(/\s+/).filter(Boolean)
			if (words.length > 1) {
				const wordWidths = words.map((w) => w.length * approxCharWidthPx)
				const total = wordWidths.reduce((a, b) => a + b, 0) + (words.length - 1) * approxCharWidthPx
				const target = total / 2
				let acc = 0
				let splitIdx = 1
				for (let i = 0; i < words.length - 1; i++) {
					const w = wordWidths[i] ?? 0
					acc += w + approxCharWidthPx
					if (acc >= target) {
						splitIdx = i + 1
						break
					}
				}
				const left = words.slice(0, splitIdx).join(" ")
				const right = words.slice(splitIdx).join(" ")
				lines = [left, right]
			} else {
				lines = [text]
			}
		} else {
			lines = [text]
		}
	}

	let tspans = ""
	lines.forEach((line, i) => {
		const dy = i === 0 ? "0" : lineHeight
		tspans += `<tspan x="${x}" dy="${dy}">${line}</tspan>`
	})
	return `<text x="${x}" y="${y}" class="${className}">${tspans}</text>`
}
