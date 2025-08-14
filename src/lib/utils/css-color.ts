// A reasonably strict CSS color regex for structured outputs.
// Supports:
// - Hex colors: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
// - rgb()/rgba(): integer channels 0-255, alpha 0-1 with optional decimals
// - hsl()/hsla(): hue 0-360, saturation/lightness 0-100%, alpha 0-1
// - A curated set of common named colors (kept small to remain strict)

// Hex: #RGB | #RGBA | #RRGGBB | #RRGGBBAA
const HEX = "#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})"

// 0-255 channel
const CH = "(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)"

// Alpha 0-1 (e.g., 0, 0.5, 1)
const ALPHA = "(?:0|1|0?\\.\\d+)"

// rgb() / rgba()
const RGB = `rgba?\\(\\s*${CH}\\s*,\\s*${CH}\\s*,\\s*${CH}(?:\\s*,\\s*${ALPHA})?\\s*\\)`

// Hue 0-360
const HUE = "(?:360|3[0-5]\\d|[12]\\d{2}|[1-9]?\\d)"
// Percent 0-100%
const PCT = "(?:100|[1-9]?\\d)%"

// hsl() / hsla()
const HSL = `hsla?\\(\\s*${HUE}\\s*,\\s*${PCT}\\s*,\\s*${PCT}(?:\\s*,\\s*${ALPHA})?\\s*\\)`

// Curated named colors (common set used across widgets/examples)
const NAMED =
	"(?:black|white|red|green|blue|orange|yellow|purple|gray|grey|lightblue|lightgray|darkblue|darkgreen|transparent|currentColor)"

const PATTERN = `^(?:${HEX}|${RGB}|${HSL}|${NAMED})$`

export const CSS_COLOR_PATTERN = new RegExp(PATTERN, "i")
