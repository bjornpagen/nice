"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { ProfileBanner } from "@/app/(user)/profile/components/profile-banner"
import { Sidebar } from "@/app/(user)/profile/components/sidebar"
import { Banner } from "@/components/banner"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"

function ProfileLayoutContent({ children }: { children: React.ReactNode }) {
	const { user, isLoaded } = useUser()

	// Effect to ensure metadata is valid
	React.useEffect(() => {
		// Only validate if user is loaded and exists
		if (isLoaded && user) {
			const metadataResult = errors.trySync(() => parseUserPublicMetadata(user.publicMetadata))
			if (metadataResult.error) {
				// Metadata is invalid, but UserSyncProvider should handle the sync
				// No need for auto-refresh as user.reload() is called after sync
				logger.warn("user metadata invalid, waiting for sync", { userId: user.id })
			}
		}
	}, [isLoaded, user])

	// During prerendering or initial load, show nothing or a skeleton
	if (!isLoaded || !user) {
		return null // Return null, as per `rules/rsc-data-fetching-patterns.mdc`
	}

	// CRITICAL: Attempt to parse metadata. If it fails, throw an error.
	// This ensures that the system does not proceed with invalid user context.
	const publicMetadataResult = errors.trySync(() => parseUserPublicMetadata(user.publicMetadata))
	if (publicMetadataResult.error) {
		// CRITICAL: Invalid user public metadata. Log error before throwing
		// to provide observability before re-throwing for error boundary.
		logger.error("clerk user metadata validation failed", { error: publicMetadataResult.error })
		throw errors.wrap(publicMetadataResult.error, "clerk user metadata validation")
	}

	const { nickname, username, bio, streak } = publicMetadataResult.data

	// Compute primary email in a narrow, explicit way (no fallbacks)
	let primaryEmail: string | null = null
	const emailEntry = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
	if (emailEntry && typeof emailEntry.emailAddress === "string") {
		primaryEmail = emailEntry.emailAddress
	}

	return (
		<div className="flex flex-col h-screen bg-white font-lato">
			<div className="flex-shrink-0 z-50">
				<Header nickname={nickname} />
				<Banner streakCount={streak.count} />
			</div>

			{/* User Profile Banner */}
			<div className="flex-shrink-0">
				<ProfileBanner uid={nickname} username={username} bio={bio} email={primaryEmail} />
			</div>

			{/* Main Content Area now scrolls internally */}
			<div className="flex-1 overflow-y-auto">
				<div className="mx-auto max-w-7xl px-4 py-6">
					<div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
						<div className="sm:col-span-3">
							<Sidebar />
						</div>

						{/* Main Content Area */}
						<div className="sm:col-span-9">{children}</div>
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
