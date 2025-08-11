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
	initialLockStatus
}: {
	children: React.ReactNode
	initialLockStatus: Record<string, boolean>
}) {
	const [resourceLockStatus, setResourceLockStatus] = React.useState(initialLockStatus)

	// Update state when initial status changes (e.g., navigation to different course)
	React.useEffect(() => {
		setResourceLockStatus(initialLockStatus)
	}, [initialLockStatus])

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
