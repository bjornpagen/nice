// Simple MathML pattern for inner MathML (WITHOUT outer <math> wrapper).
// Requirements:
// - Must NOT contain an outer <math> tag
// - Must start with a recognized MathML tag
// - Must end with a recognized MathML closing tag (not necessarily the same as the starting tag)
// This is intentionally permissive about the interior structure.
// Note: <mfenced> is intentionally excluded because it is deprecated and non-standard.
const MATH_TAGS =
	"(?:mi|mn|mo|ms|mglyph|mrow|mfrac|msqrt|mroot|mstyle|merror|mpadded|mphantom|menclose|mtable|mtr|mlabeledtr|mtd|maction|msub|msup|msubsup|munder|mover|munderover|mmultiscripts|mspace|mtext|semantics|annotation|annotation-xml)"

export const MATHML_INNER_PATTERN = new RegExp(
	`^(?![\\s\\S]*<\\/?math\\b)\\s*<${MATH_TAGS}\\b[\\s\\S]*</${MATH_TAGS}>\\s*$`,
	"i"
)
