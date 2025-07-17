import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { Banner } from "@/components/banner"
import { Header } from "@/components/header"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

function UserHeaderSkeleton() {
	return (
		<>
			<Header dark />
			<div className="w-full bg-gray-100 animate-pulse border-b border-gray-200 py-2 h-[57px]" />
		</>
	)
}

async function UserHeader() {
	const user = await currentUser()

	if (!user) {
		logger.error("CRITICAL: User not authenticated in course layout")
		throw errors.new("user authentication required for course access")
	}

	if (!user.publicMetadata) {
		logger.error("CRITICAL: User public metadata missing", { userId: user.id })
		throw errors.new("user public metadata missing")
	}

	const validationResult = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!validationResult.success) {
		logger.error("CRITICAL: Invalid user metadata structure", {
			userId: user.id,
			error: validationResult.error
		})
		throw errors.wrap(validationResult.error, "user metadata validation failed")
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
					<UserHeader />
				</React.Suspense>
			</div>
			<div className="flex-1 overflow-hidden">{children}</div>
		</div>
	)
}
