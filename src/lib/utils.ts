import * as errors from "@superbuilders/errors"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Capitalizes the first letter of a string.
 * @param str The string to capitalize.
 * @returns The capitalized string.
 */
export function capitalize(str: string): string {
	if (!str) return ""
	return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Converts a string to start case.
 * Example: "hello-world" -> "Hello World"
 * @param str The string to convert.
 * @returns The start-cased string.
 */
export function startCase(str: string): string {
	if (!str) return ""
	return str
		.replace(/[-_]/g, " ") // Replace hyphens and underscores with spaces
		.replace(/\s+/g, " ") // Collapse multiple spaces
		.trim()
		.split(" ")
		.map((word) => capitalize(word))
		.join(" ")
}

/**
 * Converts a string to upper case.
 * @param str The string to convert.
 * @returns The upper-cased string.
 */
export function upperCase(str: string): string {
	if (!str) return ""
	return str.toUpperCase()
}

/**
 * Defensive check to ensure URLs don't contain encoded colons.
 * This should never happen if middleware is working correctly.
 *
 * @param value The value to check
 * @param context Where this check is happening (for error messages)
 * @throws Error if encoded colons are detected
 */
export function assertNoEncodedColons(value: string, context: string): void {
	if (value.includes("%3A") || value.includes("%3a")) {
		throw errors.new(`encoded colon detected in ${context}: ${value}. Middleware should have normalized this.`)
	}
}
