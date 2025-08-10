import * as errors from "@superbuilders/errors"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { Course, LessonChild, UnitChild } from "@/lib/types/domain"

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

export type RemoveReadonly<T> = {
	[K in keyof T as T[K] extends readonly unknown[] ? never : K]: T[K]
}

// Normalize a single string by replacing URL-encoded colons
export function normalizeString(value: string): string {
	return value.replace(/%3[Aa]/g, ":")
}

// Normalize URL-encoded colons in params (synchronous version)
export function normalizeParamsSync<T extends Record<string, unknown>>(params: T): T {
	const entries = Object.entries(params).map(([key, value]) => {
		// Only normalize string values
		if (typeof value === "string") {
			return [key, normalizeString(value)]
		}
		// Keep non-string values as-is
		return [key, value]
	})

	return Object.fromEntries(entries)
}

// Normalize URL-encoded colons in params (promise version)
// This prevents cache duplication for Khan Academy IDs and similar encoded values
export function normalizeParams<T extends Record<string, unknown>>(paramsPromise: Promise<T>): Promise<T> {
	return paramsPromise.then(normalizeParamsSync)
}

// Helper type for any resource that can be in the sequential path
type CourseResource = UnitChild | LessonChild | Course["challenges"][number]

export function getOrderedCourseResources(course: Course): CourseResource[] {
	// Assume ordering has already been propagated in the data layer.
	// Only perform stable sorts here to avoid divergence.
	const resources: CourseResource[] = []

	const sortedUnits = [...course.units].sort((a, b) => a.ordering - b.ordering)
	for (const unit of sortedUnits) {
		const sortedUnitChildren: UnitChild[] = [...unit.children].sort((a, b) => a.ordering - b.ordering)
		for (const unitChild of sortedUnitChildren) {
			if (unitChild.type === "Lesson") {
				const sortedLessonChildren = [...unitChild.children].sort((a, b) => a.ordering - b.ordering)
				resources.push(...sortedLessonChildren)
			} else {
				resources.push(unitChild)
			}
		}
	}
	// Challenges remain at the end per product decision
	resources.push(...course.challenges)
	return resources
}

export function buildResourceLockStatus(
	course: Course,
	progressMap: Map<string, AssessmentProgress>,
	lockingEnabled: boolean
): Record<string, boolean> {
	const ordered = getOrderedCourseResources(course)
	const lock: Record<string, boolean> = {}
	if (!lockingEnabled) {
		for (const r of ordered) {
			lock[r.id] = false
		}
		return lock
	}
	let previousComplete = true
	for (const r of ordered) {
		lock[r.id] = !previousComplete
		previousComplete = progressMap.get(r.id)?.completed === true
	}
	return lock
}
