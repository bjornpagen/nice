"use client"

import * as React from "react"
import type { AssessmentProgress } from "@/lib/data/progress"

interface LessonProgressContextValue {
	isCurrentResourceCompleted: boolean
	setCurrentResourceCompleted: (completed: boolean) => void
	progressOverrides: Map<string, AssessmentProgress>
	setProgressForResource: (resourceId: string, progress: AssessmentProgress) => void
	updatingResourceIds: Set<string>
	beginProgressUpdate: (resourceId: string) => void
	endProgressUpdate: (resourceId: string) => void
}

const LessonProgressContext = React.createContext<LessonProgressContextValue | undefined>(undefined)

export function LessonProgressProvider({ children }: { children: React.ReactNode }) {
	const [isCurrentResourceCompleted, setIsCurrentResourceCompleted] = React.useState<boolean>(false)
	const [progressOverrides, setProgressOverrides] = React.useState<Map<string, AssessmentProgress>>(new Map())
	const [updatingResourceIds, setUpdatingResourceIds] = React.useState<Set<string>>(new Set())

	const setProgressForResource = (resourceId: string, progress: AssessmentProgress) => {
		setProgressOverrides((prev) => {
			const next = new Map(prev)
			next.set(resourceId, progress)
			return next
		})
	}

	const value: LessonProgressContextValue = {
		isCurrentResourceCompleted,
		setCurrentResourceCompleted: setIsCurrentResourceCompleted,
		progressOverrides,
		setProgressForResource,
		updatingResourceIds,
		beginProgressUpdate: (resourceId: string) => {
			setUpdatingResourceIds((prev) => {
				const next = new Set(prev)
				next.add(resourceId)
				return next
			})
		},
		endProgressUpdate: (resourceId: string) => {
			setUpdatingResourceIds((prev) => {
				const next = new Set(prev)
				next.delete(resourceId)
				return next
			})
		}
	}

	return <LessonProgressContext.Provider value={value}>{children}</LessonProgressContext.Provider>
}

export function useLessonProgress(): LessonProgressContextValue {
	const ctx = React.useContext(LessonProgressContext)
	if (!ctx) {
		// Avoid throwing raw Error to comply with error-handling rules; return a stable fallback instead
		return {
			isCurrentResourceCompleted: false,
			setCurrentResourceCompleted: () => {},
			progressOverrides: new Map<string, AssessmentProgress>(),
			setProgressForResource: () => {},
			updatingResourceIds: new Set<string>(),
			beginProgressUpdate: () => {},
			endProgressUpdate: () => {}
		}
	}
	return ctx
}
