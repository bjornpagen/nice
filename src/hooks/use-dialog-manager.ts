"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"

export const dialogKeys = {
	COOKIE_CONSENT: "COOKIE_CONSENT",
	USER_ONBOARDING: "USER_ONBOARDING",
	COURSE_SELECTOR: "COURSE_SELECTOR"
} as const

export type DialogKey = keyof typeof dialogKeys

interface DialogManagerContextType {
	activeDialog: DialogKey | null
	openDialog: (key: DialogKey) => void
	closeDialog: () => void
	markAsSeen: (key: DialogKey) => void
	shouldShow: (key: DialogKey) => boolean
}

export const DialogManagerContext = React.createContext<DialogManagerContextType | undefined>(undefined)

export function useDialogManager(): DialogManagerContextType {
	const context = React.useContext(DialogManagerContext)
	if (context === undefined) {
		throw errors.new("useDialogManager must be used within a DialogManagerProvider")
	}
	return context
}
