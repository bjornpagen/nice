import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs"
import { currentUser } from "@clerk/nextjs/server"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { Banner } from "@/components/banner"
import { Header } from "@/components/header"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

function UserHeaderSkeleton() {
	return (
		<ClerkLoading>
			<Header dark />
			<div className="w-full bg-gray-100 animate-pulse border-b border-gray-200 py-2 h-[56px]" />
		</ClerkLoading>
	)
}

async function UserHeader() {
	const user = await currentUser()

	if (!user) {
		logger.info("user not authenticated, showing default header")
		// Show header without user-specific data
		return <Header dark />
	}

	if (!user.publicMetadata) {
		logger.info("user metadata not yet available", { userId: user.id })
		// User exists but metadata not ready, show default header
		return <Header dark />
	}

	const validationResult = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!validationResult.success) {
		logger.warn("invalid user metadata structure, showing default header", {
			userId: user.id,
			error: validationResult.error
		})
		// Invalid metadata, show default header
		return <Header dark />
	}

	const { nickname, streak } = validationResult.data

	return (
		<>
			<Header dark nickname={nickname} />
			<Banner streakCount={streak.count} />
		</>
	)
}

export default function CourseLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex flex-col h-screen bg-white">
			<div className="flex-shrink-0 z-50">
				<React.Suspense fallback={<UserHeaderSkeleton />}>
					<ClerkLoaded>
						<UserHeader />
					</ClerkLoaded>
					<ClerkLoading>
						<Header dark />
					</ClerkLoading>
				</React.Suspense>
			</div>
			<div className="flex-1 overflow-hidden max-w-full">{children}</div>
		</div>
	)
}
