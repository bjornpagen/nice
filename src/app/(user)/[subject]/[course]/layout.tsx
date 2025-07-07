import { auth, currentUser } from "@clerk/nextjs/server"
import { z } from "zod"
import { Banner } from "@/components/banner"
import { Header } from "@/components/header"

// Schema to safely parse Clerk's public metadata
const UserPublicMetadataSchema = z.object({
	nickname: z.string().optional().default("User")
})

export default async function CourseLayout({ children }: { children: React.ReactNode }) {
	// Get the authenticated user
	auth()

	let nickname: string | undefined

	const user = await currentUser()
	if (user) {
		// Get the user's nickname from Clerk's public metadata with safe parsing
		const { nickname: userNickname } = UserPublicMetadataSchema.parse(user.publicMetadata)
		nickname = userNickname
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
