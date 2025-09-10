import { escapeXmlAttribute } from "../utils/xml-utils"
import { isTerminatingFraction, tryApproximatePiProduct } from "./helpers"
import type { AssessmentItem } from "./schemas"

export function compileResponseDeclarations(decls: AssessmentItem["responseDeclarations"]): string {
	// Identifier linkage is validated earlier; proceed to emit declarations

	// Pre-process declarations to add equivalent numeric mappings.
	return decls
		.map((decl) => {
			const correctValues = Array.isArray(decl.correct) ? decl.correct : [decl.correct]
			const allCorrectValues = new Set<string | number>(correctValues)

			// Removed: whitespace/hyphen normalization and algebraic spacing logic

			for (const val of correctValues) {
				if (typeof val !== "string") continue

				if (val.startsWith(".")) allCorrectValues.add(`0${val}`)
				else if (val.startsWith("0.")) allCorrectValues.add(val.substring(1))

				// Rule: Allow implicit multiplication between a leading numeric coefficient and parentheses
				// e.g., 25*(p+2q) -> also accept 25(p+2q)
				{
					const implicitAlt = val.replace(/(\d+)\s*\*\s*\(/g, "$1(")
					if (implicitAlt !== val) {
						allCorrectValues.add(implicitAlt)
					}
				}

				// Removed: no algebraic spacing variants; require exact matches

				if (val.includes("/") && !val.startsWith(".")) {
					const parts = val.split("/")
					// Only convert pure numeric fractions like "5/8" to decimals.
					if (parts.length === 2) {
						const numStr = parts[0] ?? ""
						const denStr = parts[1] ?? ""
						if (!/^\d+$/.test(numStr) || !/^\d+$/.test(denStr)) {
							// not a simple numeric fraction; skip
						} else {
							const num = Number.parseInt(numStr, 10)
							const den = Number.parseInt(denStr, 10)
							if (!Number.isNaN(num) && !Number.isNaN(den) && isTerminatingFraction(num, den)) {
								const decimalValue = (num / den).toString()
								allCorrectValues.add(decimalValue)
								if (decimalValue.startsWith("0.")) allCorrectValues.add(decimalValue.substring(1))
							}
						}
					}
				}

				// Handle fractional coefficients multiplied by a variable/expression in different textual forms.
				// Examples to normalize across: (5/8)q, 5/8q, 5q/8, and the decimal equivalent 0.625q (when terminating).
				{
					// 1) Parenthesized fraction followed by a variable/expression: (a/b)X
					const mParen = val.match(/^\(\s*(\d+)\s*\/\s*(\d+)\s*\)\s*([A-Za-z].*)$/)
					if (mParen?.[1] && mParen?.[2] && mParen?.[3]) {
						const num = Number.parseInt(mParen[1], 10)
						const den = Number.parseInt(mParen[2], 10)
						const varPart = mParen[3].trim()
						// Non-parenthesized fractional coefficient
						allCorrectValues.add(`${num}/${den}${varPart}`)
						// Decimal coefficient if terminating
						if (Number.isFinite(num) && Number.isFinite(den) && den !== 0 && isTerminatingFraction(num, den)) {
							const dec = (num / den).toString()
							allCorrectValues.add(`${dec}${varPart}`)
							if (dec.startsWith("0.")) allCorrectValues.add(`${dec.substring(1)}${varPart}`)
						}
					}

					// 2) Non-parenthesized fraction followed by variable/expression: a/b X (no explicit operator)
					const mNonParen = val.match(/^\s*(\d+)\s*\/\s*(\d+)\s*([A-Za-z].*)$/)
					if (mNonParen?.[1] && mNonParen?.[2] && mNonParen?.[3]) {
						const num = Number.parseInt(mNonParen[1], 10)
						const den = Number.parseInt(mNonParen[2], 10)
						const varPart = mNonParen[3].trim()
						// Parenthesized version
						allCorrectValues.add(`(${num}/${den})${varPart}`)
						// Decimal coefficient if terminating
						if (Number.isFinite(num) && Number.isFinite(den) && den !== 0 && isTerminatingFraction(num, den)) {
							const dec = (num / den).toString()
							allCorrectValues.add(`${dec}${varPart}`)
							if (dec.startsWith("0.")) allCorrectValues.add(`${dec.substring(1)}${varPart}`)
						}
					}

					// 3) Numerator coefficient attached to variable over denominator: aX/b
					const mAttached = val.match(/^\s*(\d+)\s*([A-Za-z][A-Za-z0-9]*)\s*\/\s*(\d+)\s*$/)
					if (mAttached?.[1] && mAttached?.[2] && mAttached?.[3]) {
						const num = Number.parseInt(mAttached[1], 10)
						const varPart = mAttached[2]
						const den = Number.parseInt(mAttached[3], 10)
						// Move denominator to coefficient position
						allCorrectValues.add(`(${num}/${den})${varPart}`)
						allCorrectValues.add(`${num}/${den}${varPart}`)
						// Decimal coefficient if terminating
						if (Number.isFinite(num) && Number.isFinite(den) && den !== 0 && isTerminatingFraction(num, den)) {
							const dec = (num / den).toString()
							allCorrectValues.add(`${dec}${varPart}`)
							if (dec.startsWith("0.")) allCorrectValues.add(`${dec.substring(1)}${varPart}`)
						}
					}
				}

				// Add decimal alternative for expressions containing π/pi (π≈3.14) for multiplicative/divisive forms
				{
					const approx = tryApproximatePiProduct(val, 3.14)
					if (approx) {
						allCorrectValues.add(approx)
						if (approx.startsWith("0.")) allCorrectValues.add(approx.substring(1))
					}
				}

				// Rule 3: Handle inequality operators - both ASCII and Unicode versions
				const inequalityOperators = [">=", "≥", "<=", "≤", ">", "<"]
				const hasInequality = inequalityOperators.some((op) => val.includes(op))

				if (hasInequality) {
					// Add both ASCII and Unicode versions of the same inequality
					const withAscii = val.replace(/≥/g, ">=").replace(/≤/g, "<=")
					const withUnicode = val.replace(/>=/g, "≥").replace(/<=/g, "≤")

					allCorrectValues.add(withAscii)
					allCorrectValues.add(withUnicode)

					// Rule 4: Handle flipped inequalities (e.g., x>3 vs 3<x)
					// Match pattern: (left operand)(operator)(right operand)
					const inequalityPattern = /^([^><=≥≤]+?)\s*(>=|≥|<=|≤|>|<)\s*([^><=≥≤]+)$/
					const match = val.trim().match(inequalityPattern)

					if (match?.[1] && match?.[2] && match?.[3]) {
						const leftOperand = match[1].trim()
						const operator = match[2]
						const rightOperand = match[3].trim()

						// Define operator reversal mapping
						const reverseOperatorMap: Record<string, string> = {
							">": "<",
							"<": ">",
							">=": "<=",
							"≥": "≤",
							"<=": ">=",
							"≤": "≥"
						}

						const reversedOp = reverseOperatorMap[operator]
						if (reversedOp) {
							// Create flipped version with operands swapped
							const flipped = `${rightOperand}${reversedOp}${leftOperand}`

							// Add both ASCII and Unicode versions of the flipped inequality
							const flippedAscii = flipped.replace(/≥/g, ">=").replace(/≤/g, "<=")
							const flippedUnicode = flipped.replace(/>=/g, "≥").replace(/<=/g, "≤")

							allCorrectValues.add(flippedAscii)
							allCorrectValues.add(flippedUnicode)

							// Also add versions with spaces around operators for better flexibility
							const spacedFlippedAscii = `${rightOperand} ${reversedOp.replace(/≥/g, ">=").replace(/≤/g, "<=")} ${leftOperand}`
							const spacedFlippedUnicode = `${rightOperand} ${reversedOp.replace(/>=/g, "≥").replace(/<=/g, "≤")} ${leftOperand}`

							allCorrectValues.add(spacedFlippedAscii)
							allCorrectValues.add(spacedFlippedUnicode)
						}
					}
				}

				// Rule 5: Handle equations with equal signs - make them reversible
				if (
					val.includes("=") &&
					!val.includes(">=") &&
					!val.includes("<=") &&
					!val.includes("≥") &&
					!val.includes("≤")
				) {
					// Match pattern: (left side)=(right side)
					const equationPattern = /^([^=]+)=([^=]+)$/
					const eqMatch = val.trim().match(equationPattern)

					if (eqMatch?.[1] && eqMatch?.[2]) {
						const leftSide = eqMatch[1].trim()
						const rightSide = eqMatch[2].trim()

						// Create flipped version
						const flipped = `${rightSide}=${leftSide}`
						allCorrectValues.add(flipped)

						// Also add versions with spaces around equals sign for flexibility
						const spacedOriginal = `${leftSide} = ${rightSide}`
						const spacedFlipped = `${rightSide} = ${leftSide}`

						allCorrectValues.add(spacedOriginal)
						allCorrectValues.add(spacedFlipped)
					}
				}
			}

			const correctXml = Array.from(allCorrectValues)
				.map(
					(v) =>
						`<qti-value>${String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</qti-value>`
				)
				.join("\n            ")

			let xml = `\n    <qti-response-declaration identifier="${escapeXmlAttribute(decl.identifier)}" cardinality="${escapeXmlAttribute(decl.cardinality)}" base-type="${escapeXmlAttribute(decl.baseType)}">
        <qti-correct-response>
            ${correctXml}
        </qti-correct-response>`

			// For single-string responses, also emit a mapping that awards 1 point for any
			// of the acceptable values. This enables robust scoring using mapping semantics
			// while preserving existing behavior elsewhere.
			const isSingleString = decl.cardinality === "single" && decl.baseType === "string"
			if (isSingleString) {
				const mappingXml = Array.from(allCorrectValues)
					.map((v) => `\n            <qti-map-entry map-key="${escapeXmlAttribute(String(v))}" mapped-value="1"/>`)
					.join("")

				xml += `\n        <qti-mapping default-value="0">${mappingXml}\n        </qti-mapping>`
			}

			xml += "\n    </qti-response-declaration>"
			return xml
		})
		.join("")
}

export function compileResponseProcessing(decls: AssessmentItem["responseDeclarations"]): string {
	// Prefer mapping-based response processing only for the specific, safe case of a
	// single string/single response. This avoids regressions for other interaction types.
	const onlyDecl = decls.length === 1 ? decls[0] : undefined
	if (onlyDecl && onlyDecl.cardinality === "single" && onlyDecl.baseType === "string") {
		const responseId = escapeXmlAttribute(onlyDecl.identifier)
		return `\n    <qti-response-processing>\n        <!-- Map the candidate response to SCORE using the declaration's qti-mapping -->\n        <qti-set-outcome-value identifier="SCORE"><qti-map-response identifier="${responseId}"/></qti-set-outcome-value>\n\n        <!-- Derive FEEDBACK from SCORE without altering other semantics -->\n        <qti-response-condition>\n            <qti-response-if>\n                <qti-gt>\n                    <qti-variable identifier="SCORE"/>\n                    <qti-base-value base-type="float">0</qti-base-value>\n                </qti-gt>\n                <qti-set-outcome-value identifier="FEEDBACK"><qti-base-value base-type="identifier">CORRECT</qti-base-value></qti-set-outcome-value>\n            </qti-response-if>\n            <qti-response-else>\n                <qti-set-outcome-value identifier="FEEDBACK"><qti-base-value base-type="identifier">INCORRECT</qti-base-value></qti-set-outcome-value>\n            </qti-response-else>\n        </qti-response-condition>\n    </qti-response-processing>`
	}

	const conditions = decls
		.map((decl) => {
			// For single/string responses, prefer mapping-based validation even in multi-declaration items.
			if (decl.cardinality === "single" && decl.baseType === "string") {
				const id = escapeXmlAttribute(decl.identifier)
				// Check that mapped score > 0 using the declaration's qti-mapping
				return `<qti-gt><qti-map-response identifier="${id}"/><qti-base-value base-type="float">0</qti-base-value></qti-gt>`
			}

			// Otherwise, fall back to strict match against the declared correct value(s)
			const variable = `<qti-variable identifier="${escapeXmlAttribute(decl.identifier)}"/>`
			const correct = `<qti-correct identifier="${escapeXmlAttribute(decl.identifier)}"/>`
			return `<qti-match>${variable}${correct}</qti-match>`
		})
		.join("\n                    ")

	return `
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-and>
                    ${conditions}
                </qti-and>
                <qti-set-outcome-value identifier="SCORE"><qti-base-value base-type="float">1</qti-base-value></qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK"><qti-base-value base-type="identifier">CORRECT</qti-base-value></qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE"><qti-base-value base-type="float">0</qti-base-value></qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK"><qti-base-value base-type="identifier">INCORRECT</qti-base-value></qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>`
}
