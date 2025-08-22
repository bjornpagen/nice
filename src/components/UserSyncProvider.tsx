"use client"

import { useClerk, useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"
import { syncUserWithOneRoster } from "@/lib/actions/user-sync"
import { ErrUserNotProvisionedInOneRoster } from "@/lib/actions/user-sync-errors"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

export function UserSyncProvider({ children }: { children: React.ReactNode }) {
	const { user, isLoaded } = useUser()
	const { signOut } = useClerk()
	const router = useRouter()

	// ensure the sync logic only runs once per session
	const hasAttemptedSyncRef = React.useRef(false)

	React.useEffect(() => {
		if (!isLoaded) return
		if (!user) return
		if (hasAttemptedSyncRef.current) return

		const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata || {})
		const needsSync = !metadataValidation.success || !metadataValidation.data.sourceId
		if (!needsSync) return

		hasAttemptedSyncRef.current = true

		const performSync = async () => {
			const result = await errors.try(syncUserWithOneRoster())
			if (result.error) {
				// Debug logging to see what's happening
				// console.log("UserSyncProvider error details:", {
				// 	errorMessage: result.error.message,
				// 	errorName: result.error.name,
				// 	errorConstructor: result.error.constructor.name,
				// 	expectedMessage: ErrUserNotProvisionedInOneRoster.message,
				// 	isMatch: errors.is(result.error, ErrUserNotProvisionedInOneRoster),
				// 	stackCheck: result.error.stack?.includes("user-sync-errors.ts")
				// })
				
				// Check for specific "user not provisioned" error using errors.is()
				if (result.error.message === ErrUserNotProvisionedInOneRoster.message) {
					// console.log("UserSyncProvider: Showing TimeBack Education toast")
					toast.error("Please create an account with TimeBack Education first.", {
						action: {
							label: "Get Started",
							onClick: () => {
								window.location.href = "https://timebackeducation.com"
							}
						}
					})
					await signOut()
					router.push("/login")
					return
				}
				// Handle all other sync errors
				// console.log("UserSyncProvider: Showing generic error toast")
				toast.error("An error occurred during account setup. Please try again later.")
				await signOut()
				router.push("/login")
				return
			}

			router.refresh()
		}

		void performSync()
	}, [isLoaded, user, signOut, router])

	return <>{children}</>
}
