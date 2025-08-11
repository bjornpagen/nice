"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import * as React from "react"
import { syncUserWithOneRoster } from "@/lib/actions/user-sync"

export function UserSyncProvider({ children }: { children: React.ReactNode }) {
	const { isLoaded, isSignedIn, user } = useUser()
	const hasSynced = React.useRef(false)

	React.useEffect(() => {
		if (!isLoaded || !isSignedIn || !user || hasSynced.current) return

		const syncUser = async () => {
			// Always call the server action to handle OneRoster sync
			// This ensures roles are always up-to-date, even for existing users
			const result = await errors.try(syncUserWithOneRoster())
			if (result.error) {
				// Log error but don't throw - sync can be retried later
				// Error is already logged in the server action
				return
			}

			if (result.data.success) {
				// Refresh user data to get updated metadata
				await user.reload()
				hasSynced.current = true
			}
		}

		void syncUser()
	}, [isLoaded, isSignedIn, user])

	// Always render children to maintain consistent hook calls
	return <>{children}</>
}
