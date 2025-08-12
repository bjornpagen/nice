// src/hooks/useResourceLockStatus.ts
"use client"

import * as React from "react"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { Course } from "@/lib/types/domain"
import { getOrderedCourseResources } from "@/lib/utils"

export function useResourceLockStatus(
	coursePromise: Promise<{ course: Course }>,
	progressPromise: Promise<{ progressMap: Map<string, AssessmentProgress> } | Map<string, AssessmentProgress>>,
	lockingEnabledPromise: Promise<boolean>
): Map<string, boolean> {
	const { course } = React.use(coursePromise)
	const progressData = React.use(progressPromise)
	const lockingEnabled = React.use(lockingEnabledPromise)
	const progressMap = progressData instanceof Map ? progressData : progressData.progressMap

	const orderedResources = getOrderedCourseResources(course)
	const lockStatus = new Map<string, boolean>()

	if (!lockingEnabled) {
		// Locking disabled: explicitly mark all resources as unlocked
		for (const resource of orderedResources) {
			lockStatus.set(resource.id, false)
		}
		return lockStatus
	}

	let previousResourceCompleted = true // The first resource is always unlocked
	for (const resource of orderedResources) {
		const currentCompleted = progressMap.get(resource.id)?.completed === true
		// Locked only when the previous resource is incomplete AND the current one itself is not completed
		lockStatus.set(resource.id, !previousResourceCompleted && !currentCompleted)
		previousResourceCompleted = currentCompleted
	}
	return lockStatus
}
