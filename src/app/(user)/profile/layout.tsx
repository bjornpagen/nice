"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import type * as React from "react"
import { Banner } from "@/components/banner"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import { ProfileBanner } from "./components/profile-banner"
import { Sidebar } from "./components/sidebar"

function ProfileLayoutContent({ children }: { children: React.ReactNode }) {
	const { user } = useUser()

	if (!user) {
		throw errors.new("user authentication required")
	}

	if (!user.publicMetadata) {
		throw errors.new("user public metadata missing")
	}

	const validationResult = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!validationResult.success) {
		throw errors.wrap(validationResult.error, "user metadata validation failed")
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
