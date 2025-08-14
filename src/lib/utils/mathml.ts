// Simple MathML pattern for inner MathML (WITHOUT outer <math> wrapper).
// Requirements (kept intentionally simple for broad engine compatibility):
// - Must start with a recognized MathML tag (so an outer <math> wrapper will not match)
// - Must end with a recognized MathML closing tag (not necessarily the same as the starting tag)
// - Interior content is permissive
// Note: <mfenced> is intentionally excluded because it is deprecated and non-standard.
const MATH_TAGS =
	"(?:mi|mn|mo|ms|mglyph|mrow|mfrac|msqrt|mroot|mstyle|merror|mpadded|mphantom|menclose|mtable|mtr|mlabeledtr|mtd|maction|msub|msup|msubsup|munder|mover|munderover|mmultiscripts|mspace|mtext|semantics|annotation|annotation-xml)"

export const MATHML_INNER_PATTERN = new RegExp(
	`^\\s*<${MATH_TAGS}\\b[\\s\\S]*</${MATH_TAGS}>\\s*$`
)
