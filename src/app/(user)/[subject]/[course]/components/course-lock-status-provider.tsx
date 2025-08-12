"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"

interface CourseLockStatusContextType {
	resourceLockStatus: Record<string, boolean>
	setResourceLockStatus: (status: Record<string, boolean>) => void
	initialResourceLockStatus: Record<string, boolean>
	storageKey: string
}

const CourseLockStatusContext = React.createContext<CourseLockStatusContextType | null>(null)

export function CourseLockStatusProvider({
	children,
	initialLockStatus,
	storageKey,
	canUnlockAll
}: {
	children: React.ReactNode
	initialLockStatus: Record<string, boolean>
	storageKey: string
	canUnlockAll: boolean
}) {
	const [resourceLockStatus, setResourceLockStatus] = React.useState(initialLockStatus)

	// Helper: derived all-unlocked status map is computed inline where needed

	// Update state when initial status changes (e.g., navigation to different course)
	React.useEffect(() => {
		setResourceLockStatus(initialLockStatus)
	}, [initialLockStatus])

	// Hydrate from localStorage to persist a forced unlock across navigations/reloads
	React.useEffect(() => {
		// Client-side only
		if (typeof window === "undefined") return
		// Only honor forced unlock for users permitted to unlock
		if (!canUnlockAll) {
			// Clean up any stale unlock flag set by other users on this device
			const forced = window.localStorage.getItem(storageKey)
			if (forced === "1") {
				window.localStorage.removeItem(storageKey)
			}
			return
		}
		const forced = window.localStorage.getItem(storageKey)
		if (forced === "1") {
			setResourceLockStatus(Object.fromEntries(Object.keys(initialLockStatus).map((key) => [key, false])))
		}
	}, [storageKey, canUnlockAll, initialLockStatus])

	const value = {
		resourceLockStatus,
		setResourceLockStatus,
		initialResourceLockStatus: initialLockStatus,
		storageKey
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
