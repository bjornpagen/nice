import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { escapeXmlAttribute } from "@/lib/xml-utils"
import { isTerminatingFraction, tryApproximatePiProduct } from "./helpers"
import type { AssessmentItem } from "./schemas"

export function compileResponseDeclarations(decls: AssessmentItem["responseDeclarations"]): string {
	// Guardrail: ensure identifier-base declarations use choice identifiers, not labels
	for (const decl of decls) {
		if (decl.baseType === "identifier") {
			const correctValues = Array.isArray(decl.correct) ? decl.correct : [decl.correct]
			const offending = correctValues.filter((v): v is string => typeof v === "string" && /\s/.test(v))
			if (offending.length > 0) {
				logger.error("identifier response contains non-identifier values", {
					responseIdentifier: decl.identifier,
					offending
				})
				throw errors.new(
					`response '${decl.identifier}' expects choice identifier(s); found label-like value(s): [${offending.join(", ")}]`
				)
			}
		}
	}

	// Pre-process declarations to add equivalent numeric mappings.
	return decls
		.map((decl) => {
			const correctValues = Array.isArray(decl.correct) ? decl.correct : [decl.correct]
			const allCorrectValues = new Set<string | number>(correctValues)

			// Heuristics to normalize algebraic strings for whitespace-insensitive matching
			const isAlgebraLike = (s: string): boolean => /[()=+\-*/^]/.test(s)
			const compactAlgebra = (s: string): string =>
				s
					.replace(/\s+/g, " ")
					.trim()
					.replace(/\s*([()])\s*/g, "$1")
					.replace(/\s*([+\-*/^=])\s*/g, "$1")
			const spacedAlgebra = (s: string): string =>
				compactAlgebra(s)
					.replace(/([+\-*/^=])/g, " $1 ")
					.replace(/\s+/g, " ")
					.trim()

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

				// Rule: Accept algebraically equivalent strings that only differ by interior whitespace
				if (isAlgebraLike(val)) {
					const compact = compactAlgebra(val)
					const spaced = spacedAlgebra(val)
					allCorrectValues.add(compact)
					allCorrectValues.add(spaced)
				}

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

			xml += "\n    </qti-response-declaration>"
			return xml
		})
		.join("")
}

export function compileResponseProcessing(decls: AssessmentItem["responseDeclarations"]): string {
	const conditions = decls
		.map((decl) => {
			const variable = `<qti-variable identifier="${escapeXmlAttribute(decl.identifier)}"/>`
			const correct = `<qti-correct identifier="${escapeXmlAttribute(decl.identifier)}"/>`
			// Use order-aware equality for ordered cardinality
			if (decl.cardinality === "ordered") {
				return `<qti-equal>${variable}${correct}</qti-equal>`
			}
			// For non-ordered responses, allow membership in the set of acceptable correct values.
			// This ensures that multiple <qti-value> entries in <qti-correct-response> are all accepted.
			return `<qti-member>${variable}${correct}</qti-member>`
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
