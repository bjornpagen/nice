"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { CookieConsentDialog } from "@/components/dialogs/cookie-consent-dialog"
import { OnboardingModal } from "@/components/onboarding-modal"
import { type DialogKey, DialogManagerContext, dialogKeys } from "@/hooks/use-dialog-manager"

const SEEN_DIALOGS_STORAGE_KEY = "nice_seen_dialogs"

export function DialogManagerProvider({ children }: { children: React.ReactNode }) {
	const [activeDialog, setActiveDialog] = React.useState<DialogKey | null>(null)
	const [isMounted, setIsMounted] = React.useState(false)

	// Ensure localStorage is only accessed on the client.
	React.useEffect(() => {
		setIsMounted(true)
	}, [])

	const getSeenDialogs = React.useCallback((): DialogKey[] => {
		if (!isMounted) return []
		const seen = window.localStorage.getItem(SEEN_DIALOGS_STORAGE_KEY)
		if (!seen) return []

		const parseResult = errors.trySync(() => JSON.parse(seen))
		if (parseResult.error) {
			return [] // If parsing fails, return empty array
		}
		const parsed = parseResult.data

		if (Array.isArray(parsed)) {
			const validKeys = Object.keys(dialogKeys)
			return parsed.filter((key): key is DialogKey => validKeys.includes(key))
		}

		return []
	}, [isMounted])

	const openDialog = (key: DialogKey) => {
		setActiveDialog(key)
	}

	const closeDialog = () => {
		setActiveDialog(null)
	}

	const markAsSeen = (key: DialogKey) => {
		if (!isMounted) return
		const seenDialogs = getSeenDialogs()
		if (!seenDialogs.includes(key)) {
			const updatedSeenDialogs = [...seenDialogs, key]
			window.localStorage.setItem(SEEN_DIALOGS_STORAGE_KEY, JSON.stringify(updatedSeenDialogs))
		}
	}

	const shouldShow = (key: DialogKey): boolean => {
		if (!isMounted) return false
		const seenDialogs = getSeenDialogs()
		return !seenDialogs.includes(key)
	}

	const value = { activeDialog, openDialog, closeDialog, markAsSeen, shouldShow }

	return (
		<DialogManagerContext.Provider value={value}>
			{children}

			{/* Render the active dialog based on state */}
			<OnboardingModal
				show={activeDialog === dialogKeys.USER_ONBOARDING}
				onComplete={() => {
					closeDialog()
					markAsSeen(dialogKeys.USER_ONBOARDING)
					// Reload the page to fetch the user's metadata from Clerk after onboarding.
					// This resolves the race condition for new users.
					window.location.reload()
				}}
			/>

			{/* The CourseSelector is rendered inside the Courses/Content component, so we don't render it here. */}
			{/* The provider still manages its state. */}

			<CookieConsentDialog
				show={activeDialog === dialogKeys.COOKIE_CONSENT}
				onComplete={() => {
					closeDialog()
					markAsSeen(dialogKeys.COOKIE_CONSENT)
				}}
			/>
		</DialogManagerContext.Provider>
	)
}
