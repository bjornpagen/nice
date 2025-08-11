"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"

interface CourseLockStatusContextType {
	resourceLockStatus: Record<string, boolean>
	setResourceLockStatus: (status: Record<string, boolean>) => void
	initialResourceLockStatus: Record<string, boolean>
}

const CourseLockStatusContext = React.createContext<CourseLockStatusContextType | null>(null)

export function CourseLockStatusProvider({
	children,
	initialLockStatus,
	storageKey
}: {
	children: React.ReactNode
	initialLockStatus: Record<string, boolean>
	storageKey: string
}) {
	const [resourceLockStatus, setResourceLockStatus] = React.useState(initialLockStatus)

	// Precompute an all-unlocked status map derived from the current initialLockStatus keys
	const allUnlockedStatus = React.useMemo<Record<string, boolean>>(() => {
		return Object.fromEntries(Object.keys(initialLockStatus).map((key) => [key, false]))
	}, [initialLockStatus])

	// Update state when initial status changes (e.g., navigation to different course)
	React.useEffect(() => {
		setResourceLockStatus(initialLockStatus)
	}, [initialLockStatus])

	// Hydrate from localStorage to persist a forced unlock across navigations/reloads
	React.useEffect(() => {
		// Client-side only
		if (typeof window === "undefined") return
		const forced = window.localStorage.getItem(storageKey)
		if (forced === "1") {
			setResourceLockStatus(allUnlockedStatus)
		}
	}, [storageKey, allUnlockedStatus])

	const value = {
		resourceLockStatus,
		setResourceLockStatus,
		initialResourceLockStatus: initialLockStatus
	}

	return <CourseLockStatusContext.Provider value={value}>{children}</CourseLockStatusContext.Provider>
}

export function useCourseLockStatus() {
	const context = React.useContext(CourseLockStatusContext)
	if (!context) {
		throw errors.new("useCourseLockStatus must be used within a CourseLockStatusProvider")
	}
	return context
}
