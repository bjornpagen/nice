import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { XP_PROFICIENCY_THRESHOLD } from "@/lib/constants/progress"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { Course, LessonChild, Unit, UnitChild } from "@/lib/types/domain"

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
		logger.error("encoded colon detected", { value, context })
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

/**
 * Returns the id of the first actionable resource within a unit, based on ordering rules
 * used by getOrderedCourseResources. Throws if the unit contains no actionable resources.
 */
export function getFirstResourceIdForUnit(unit: Unit): string {
	// Sort unit children by ordering to match the global resource ordering strategy
	const sortedUnitChildren: UnitChild[] = [...unit.children].sort((a, b) => a.ordering - b.ordering)

	for (const unitChild of sortedUnitChildren) {
		if (unitChild.type === "Lesson") {
			// Within a lesson, also sort by ordering and take the first resource
			const sortedLessonChildren: LessonChild[] = [...unitChild.children].sort((a, b) => a.ordering - b.ordering)
			const first = sortedLessonChildren[0]
			if (first) {
				return first.componentResourceSourcedId
			}
			// Empty lesson, continue scanning next unit child
			continue
		}
		// For non-lesson unit children (Quiz/UnitTest), the child itself is actionable
		return unitChild.componentResourceSourcedId
	}

	// If we reach here, the unit has no actionable resources
	logger.error("unit has no actionable resources", { unitId: unit.id, unitTitle: unit.title })
	throw errors.new(`unit has no actionable resources: ${unit.id}`)
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
			lock[r.componentResourceSourcedId] = false
		}
		return lock
	}
	let previousComplete = true
	for (const r of ordered) {
		let currentComplete: boolean
		const progress = progressMap.get(r.id)
		// Assessments (Exercise, Quiz, UnitTest, CourseChallenge) require >= 80% score to unlock next
		if (r.type === "Exercise" || r.type === "Quiz" || r.type === "UnitTest" || r.type === "CourseChallenge") {
			currentComplete = typeof progress?.score === "number" && progress.score >= XP_PROFICIENCY_THRESHOLD
		} else {
			// Non-assessment items (Video, Article) rely on completed flag
			currentComplete = progress?.completed === true
		}
		// Locked only when the previous resource is incomplete AND the current one itself is not completed
		lock[r.componentResourceSourcedId] = !previousComplete && !currentComplete
		previousComplete = currentComplete
	}
	return lock
}
