import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import { eq, sql } from "drizzle-orm"
import { Banner } from "@/components/banner"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { ProfileBanner } from "./profile-banner"
import { Sidebar } from "./sidebar"

// Prepared statement to get user's nickname
const getUserNicknameQuery = db
	.select({
		nickname: schema.niceUsers.nickname
	})
	.from(schema.niceUsers)
	.where(eq(schema.niceUsers.clerkId, sql.placeholder("clerkId")))
	.prepare("src_app_user_profile_layout_get_user_nickname")

export default async function UserLayout({ children }: { children: React.ReactNode }) {
	// Get the authenticated user
	const { userId } = await auth()

	if (!userId) {
		throw errors.new("User not authenticated")
	}

	// Get the user's nickname from the database
	const userResult = await getUserNicknameQuery.execute({ clerkId: userId })
	const user = userResult[0]

	// Use the nickname or fallback to a default if not found
	const nickname = user?.nickname || "User"

	return (
		<div className="flex flex-col h-screen bg-white font-lato">
			<div className="flex-shrink-0 z-50">
				<Header nickname={nickname} />
				<Banner />
			</div>

			{/* User Profile Banner */}
			<div className="flex-shrink-0">
				<ProfileBanner uid={nickname} />
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
