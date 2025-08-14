import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

/**
 * Validates that a value is a percentage integer in the inclusive range 0..100.
 * Returns the validated value for ergonomic in-line use.
 *
 * Throws a domain error if invalid. Callers should handle according to context.
 */
export function assertPercentageInteger(value: unknown, context?: string): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		logger.error("percentage must be a finite number", { value, context, valueType: typeof value })
		throw errors.new(`${context || "percentage"}: must be a finite number`)
	}

	if (!Number.isInteger(value)) {
		logger.error("percentage must be an integer", { value, context })
		throw errors.new(`${context || "percentage"}: must be an integer`)
	}

	if (value < 0 || value > 100) {
		logger.error("percentage out of range", { value, context })
		throw errors.new(`${context || "percentage"}: must be between 0 and 100 inclusive`)
	}

	return value
}

/**
 * Coerces an arbitrary number to an integer percentage (0..100) by rounding,
 * then validates with assertPercentageInteger. Throws if NaN/Infinity or out of range.
 */
export function coercePercentageInteger(value: unknown, context?: string): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		logger.error("coerce percentage must be a finite number", { value, context, valueType: typeof value })
		throw errors.new(`${context || "percentage"}: must be a finite number`)
	}
	const rounded = Math.round(value)
	return assertPercentageInteger(rounded, context)
}
