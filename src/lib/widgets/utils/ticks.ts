import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

/**
 * Computes a decimal scale factor (power of 10) sufficient to represent all input numbers as integers.
 * Handles scientific notation and fractional parts.
 */
export function computeDecimalScale(...nums: number[]): number {
	let maxFractionalDigits = 0
	for (const n of nums) {
		if (!Number.isFinite(n)) continue
		const s = String(n)
		let fractionalDigits = 0
		if (s.includes("e-")) {
			const parts = s.split("e-")
			const basePart = parts[0] || ""
			const expPart = parts[1] || "0"
			const baseFrac = basePart.includes(".") ? (basePart.split(".")[1] || "").length : 0
			fractionalDigits = baseFrac + parseInt(expPart, 10)
		} else if (s.includes(".")) {
			fractionalDigits = (s.split(".")[1] || "").length
		}
		if (fractionalDigits > maxFractionalDigits) {
			maxFractionalDigits = fractionalDigits
		}
	}
	return 10 ** maxFractionalDigits
}

/**
 * Performs integer ceiling division, correctly handling negative numbers.
 */
export function ceilDiv(a: number, b: number): number {
	return Math.ceil(a / b)
}

export type TickInfo = {
	values: number[] // Floating-point values for plotting
	ints: number[] // Integer-space values for logic
	scale: number // The common scale factor used
}

/**
 * Generates ticks by performing calculations in a scaled integer space to avoid floating-point drift.
 */
export function buildTicks(min: number, max: number, interval: number): TickInfo {
	if (min > max) {
		logger.error("invalid tick parameters: min > max", { min, max, interval })
		throw errors.new("invalid tick parameters: min cannot be greater than max")
	}
	if (interval <= 0) {
		logger.error("invalid tick parameters: interval <= 0", { min, max, interval })
		throw errors.new("invalid tick parameters: interval must be positive")
	}

	const scale = computeDecimalScale(min, max, interval)
	const minI = Math.round(min * scale)
	const maxI = Math.round(max * scale)
	const stepI = Math.round(interval * scale)

	if (stepI <= 0) {
		logger.error("invalid tick parameters: scaled interval is non-positive", { min, max, interval, stepI })
		throw errors.new("invalid tick parameters: interval is too small relative to precision")
	}
	if (
		minI > Number.MAX_SAFE_INTEGER ||
		maxI > Number.MAX_SAFE_INTEGER ||
		stepI > Number.MAX_SAFE_INTEGER
	) {
		logger.error("scaled tick values exceed MAX_SAFE_INTEGER", { min, max, interval })
		throw errors.new("tick generation failed due to precision overflow")
	}

	const startI = ceilDiv(minI, stepI) * stepI
	const ints: number[] = []
	const values: number[] = []

	for (let vI = startI; vI <= maxI; vI += stepI) {
		ints.push(vI)
		values.push(vI / scale)
	}

	return { ints, values, scale }
}

/**
 * Formats a scaled integer tick value into a clean string representation.
 * Avoids floating point tails and ensures no "-0".
 */
export function formatTickInt(vI: number, scale: number): string {
	if (vI === 0) return "0"

	const sign = vI < 0 ? "-" : ""
	const absVI = Math.abs(vI)
	const d = Math.round(Math.log10(scale))

	const q = Math.floor(absVI / scale)
	const r = absVI % scale

	if (r === 0) {
		return sign + String(q)
	}

	let frac = r.toString().padStart(d, "0")
	frac = frac.replace(/0+$/, "") // Strip trailing zeros

	return `${sign}${q}.${frac}`
}
