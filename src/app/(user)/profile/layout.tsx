"use client"

import { useUser } from "@clerk/nextjs"
import type * as React from "react"
import { z } from "zod"
import { Banner } from "@/components/banner"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { ProfileBanner } from "./components/profile-banner"
import { Sidebar } from "./components/sidebar"

// Schema to safely parse Clerk's public metadata
const UserPublicMetadataSchema = z.object({
	nickname: z.string().optional().default("User"),
	username: z.string().optional().default(""),
	bio: z.string().optional().default("")
})

function ProfileLayoutContent({ children }: { children: React.ReactNode }) {
	const { user } = useUser()

	if (!user) {
		return null // Or a loading/error state
	}

	const validationResult = UserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!validationResult.success) {
		// Handle validation error, e.g., log it and use defaults
		return null
	}

	const { nickname, username, bio } = validationResult.data

	return (
		<div className="flex flex-col h-screen bg-white font-lato">
			<div className="flex-shrink-0 z-50">
				<Header nickname={nickname} />
				<Banner />
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
