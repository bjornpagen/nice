"use client"

import { useUser } from "@clerk/nextjs"
import * as React from "react"
import { Banner } from "@/components/banner"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import { ProfileBanner } from "./components/profile-banner"
import { Sidebar } from "./components/sidebar"

function ProfileLayoutContent({ children }: { children: React.ReactNode }) {
	const { user, isLoaded } = useUser()

	// Effect to periodically check for metadata updates
	React.useEffect(() => {
		if (
			isLoaded &&
			user &&
			(!user.publicMetadata || !ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata).success)
		) {
			// Refresh every 2 seconds while metadata is being set up
			const interval = setInterval(() => {
				window.location.reload()
			}, 2000)

			// Clean up interval on unmount
			return () => clearInterval(interval)
		}
	}, [isLoaded, user])

	// During prerendering or initial load, show nothing or a skeleton
	if (!isLoaded || !user) {
		return null // This will be replaced by the actual content when the page loads on the client
	}

	// Handle missing or invalid metadata gracefully
	if (!user.publicMetadata) {
		// Metadata not set yet - likely webhook still processing
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">Setting up your account...</h2>
					<p className="text-gray-600">Please wait a moment while we prepare your profile.</p>
				</div>
			</div>
		)
	}

	const validationResult = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!validationResult.success) {
		// Metadata exists but doesn't match schema - webhook might still be processing
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">Finalizing your account...</h2>
					<p className="text-gray-600">Your profile will be ready in just a moment.</p>
				</div>
			</div>
		)
	}

	const { nickname, username, bio, streak } = validationResult.data

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
