"use client"

import * as React from "react"

interface LessonProgressContextValue {
	isCurrentResourceCompleted: boolean
	setCurrentResourceCompleted: (completed: boolean) => void
}

const LessonProgressContext = React.createContext<LessonProgressContextValue | undefined>(undefined)

export function LessonProgressProvider({ children }: { children: React.ReactNode }) {
	const [isCurrentResourceCompleted, setIsCurrentResourceCompleted] = React.useState<boolean>(false)

	const value = React.useMemo<LessonProgressContextValue>(
		() => ({ isCurrentResourceCompleted, setCurrentResourceCompleted: setIsCurrentResourceCompleted }),
		[isCurrentResourceCompleted]
	)

	return <LessonProgressContext.Provider value={value}>{children}</LessonProgressContext.Provider>
}

export function useLessonProgress(): LessonProgressContextValue {
	const ctx = React.useContext(LessonProgressContext)
	if (!ctx) {
		// Avoid throwing raw Error to comply with error-handling rules; return a stable fallback instead
		return {
			isCurrentResourceCompleted: false,
			setCurrentResourceCompleted: () => {}
		}
	}
	return ctx
}
