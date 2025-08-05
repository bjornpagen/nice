import { typedSchemas } from "@/lib/widgets/generators"

/**
 * Calculates the greatest common divisor (GCD) of two numbers using the Euclidean algorithm.
 * @param a The first number.
 * @param b The second number.
 * @returns The GCD of a and b.
 */
export function gcd(a: number, b: number): number {
	return b === 0 ? a : gcd(b, a % b)
}

/**
 * Determines if a fraction results in a terminating decimal.
 * A fraction terminates if and only if the prime factors of its simplified denominator are only 2s and 5s.
 * @param numerator The numerator of the fraction.
 * @param denominator The denominator of the fraction.
 * @returns True if the fraction terminates, false otherwise.
 */
export function isTerminatingFraction(numerator: number, denominator: number): boolean {
	if (denominator === 0) {
		return false
	}
	// Simplify the fraction by dividing by the GCD.
	const commonDivisor = gcd(Math.abs(numerator), Math.abs(denominator))
	let simplifiedDen = Math.abs(denominator) / commonDivisor

	// The fraction terminates if the simplified denominator's prime factors are only 2 and 5.
	while (simplifiedDen % 2 === 0) {
		simplifiedDen /= 2
	}
	while (simplifiedDen % 5 === 0) {
		simplifiedDen /= 5
	}

	return simplifiedDen === 1
}

export function encodeDataUri(content: string): string {
	const base64 = btoa(unescape(encodeURIComponent(content)))
	const isSvg = content.trim().startsWith("<svg")
	return `${isSvg ? "data:image/svg+xml" : "data:text/html"};base64,${base64}`
}

// Helper function to check if a string is a valid widget type
export function isValidWidgetType(type: string): type is keyof typeof typedSchemas {
	return type in typedSchemas
}
