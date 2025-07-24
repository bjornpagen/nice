"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import * as React from "react"
import { Banner } from "@/components/banner"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { dialogKeys, useDialogManager } from "@/hooks/use-dialog-manager"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import { ProfileBanner } from "./components/profile-banner"
import { Sidebar } from "./components/sidebar"

function ProfileLayoutContent({ children }: { children: React.ReactNode }) {
	const { user, isLoaded } = useUser()
	const { openDialog, shouldShow } = useDialogManager()

	// Effect to show onboarding modal for new users
	React.useEffect(() => {
		// A "new user" is defined as one whose metadata has not yet been populated by the Clerk webhook
		const isNewUser = isLoaded && user && errors.trySync(() => parseUserPublicMetadata(user.publicMetadata)).error

		if (isNewUser && shouldShow(dialogKeys.USER_ONBOARDING)) {
			openDialog(dialogKeys.USER_ONBOARDING)
		}
	}, [isLoaded, user, openDialog, shouldShow])

	// During prerendering or initial load, show nothing or a skeleton
	if (!isLoaded || !user) {
		return null // Return null, as per `rules/rsc-data-fetching-patterns.mdc`
	}

	// CRITICAL: Attempt to parse metadata. If it fails, throw an error.
	// This ensures that the system does not proceed with invalid user context.
	const publicMetadataResult = errors.trySync(() => parseUserPublicMetadata(user.publicMetadata))
	if (publicMetadataResult.error) {
		// CRITICAL: Invalid user public metadata. Since this is a client component,
		// we cannot use logger, so we throw the error to be caught by error boundary.
		// Re-throw the error to indicate a critical failure.
		// A higher-level error boundary should catch this for the user.
		throw errors.wrap(publicMetadataResult.error, "clerk user metadata validation")
	}

	const { nickname, username, bio, streak } = publicMetadataResult.data

	return (
		<div className="flex flex-col h-screen bg-white font-lato">
			<div className="flex-shrink-0 z-50">
				<Header nickname={nickname} />
				<Banner streakCount={streak.count} />
			</div>

			{/* User Profile Banner */}
			<div className="flex-shrink-0">
				<ProfileBanner uid={nickname} username={username} bio={bio} />
			</div>

			{/* Main Content Area now scrolls internally */}
			<div className="flex-1 overflow-y-auto">
				<div className="mx-auto max-w-7xl px-4 py-6">
					<div className="grid grid-cols-12 gap-6">
						<div className="col-span-3">
							<Sidebar />
						</div>

						{/* Main Content Area */}
						<div className="col-span-9">{children}</div>
					</div>
				</div>
				<Footer />
			</div>
		</div>
	)
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
	return <ProfileLayoutContent>{children}</ProfileLayoutContent>
}
