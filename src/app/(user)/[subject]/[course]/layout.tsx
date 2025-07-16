import { currentUser } from "@clerk/nextjs/server"
import { z } from "zod"
import { Banner } from "@/components/banner"
import { Header } from "@/components/header"

// Schema to safely parse Clerk's public metadata
const UserPublicMetadataSchema = z.object({
	nickname: z.string().optional().default("User"),
	username: z.string().optional().default(""),
	bio: z.string().optional().default("")
})

export default async function CourseLayout({ children }: { children: React.ReactNode }) {
	// Fetch the current user
	const user = await currentUser()

	// Extract nickname from public metadata
	let nickname = "User" // Default fallback
	if (user?.publicMetadata) {
		const validationResult = UserPublicMetadataSchema.safeParse(user.publicMetadata)
		if (validationResult.success) {
			nickname = validationResult.data.nickname
		}
	}

	return (
		<div className="flex flex-col h-screen bg-white">
			<div className="flex-shrink-0 z-50">
				<Header dark nickname={nickname} />
				<Banner />
			</div>
			<div className="flex-1 overflow-hidden">{children}</div>
		</div>
	)
}
