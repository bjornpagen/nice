import { auth } from "@clerk/nextjs/server"
import { eq, sql } from "drizzle-orm"
import { Banner } from "@/components/banner"
import { Header } from "@/components/header"
import { db } from "@/db"
import * as schema from "@/db/schemas"

// Prepared statement to get user's nickname
const getUserNicknameQuery = db
	.select({
		nickname: schema.niceUsers.nickname
	})
	.from(schema.niceUsers)
	.where(eq(schema.niceUsers.clerkId, sql.placeholder("clerkId")))
	.prepare("src_app_user_subject_course_layout_get_user_nickname")

export default async function CourseLayout({ children }: { children: React.ReactNode }) {
	// Get the authenticated user
	const { userId } = await auth()

	let nickname: string | undefined

	if (userId) {
		// Get the user's nickname from the database
		const userResult = await getUserNicknameQuery.execute({ clerkId: userId })
		const user = userResult[0]
		nickname = user?.nickname
	}

	return (
		<div className="min-h-screen bg-white">
			<div className="sticky top-0 z-50">
				<Header dark nickname={nickname} />
				<Banner />
			</div>
			{children}
		</div>
	)
}
