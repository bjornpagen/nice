import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { escapeXmlAttribute } from "@/lib/xml-utils"
import { isTerminatingFraction } from "./helpers"
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

			for (const val of correctValues) {
				if (typeof val !== "string") continue

				if (val.startsWith(".")) allCorrectValues.add(`0${val}`)
				else if (val.startsWith("0.")) allCorrectValues.add(val.substring(1))

				if (val.includes("/") && !val.startsWith(".")) {
					const parts = val.split("/")
					if (parts.length === 2 && parts[0] && parts[1]) {
						const num = Number.parseInt(parts[0], 10)
						const den = Number.parseInt(parts[1], 10)
						if (!Number.isNaN(num) && !Number.isNaN(den) && isTerminatingFraction(num, den)) {
							const decimalValue = (num / den).toString()
							allCorrectValues.add(decimalValue)
							if (decimalValue.startsWith("0.")) allCorrectValues.add(decimalValue.substring(1))
						}
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
				.map((v) => `<qti-value>${String(v)}</qti-value>`)
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
		.map(
			(decl) =>
				`<qti-match><qti-variable identifier="${escapeXmlAttribute(decl.identifier)}"/><qti-correct identifier="${escapeXmlAttribute(decl.identifier)}"/></qti-match>`
		)
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
