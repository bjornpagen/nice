"use client"

import { useClerk, useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"
import { syncUserWithOneRoster } from "@/lib/actions/user-sync"
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
		const needsSync =
			!metadataValidation.success ||
			!metadataValidation.data.sourceId ||
			(metadataValidation.data.roles?.length ?? 0) === 0
		if (!needsSync) return

		hasAttemptedSyncRef.current = true

		const performSync = async () => {
			const result = await errors.try(syncUserWithOneRoster())
			if (result.error) {
				toast.error("Please create an account with TimeBack Education first, or try again later.", {
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

			router.refresh()
		}

		void performSync()
	}, [isLoaded, user, signOut, router])

	return <>{children}</>
}
