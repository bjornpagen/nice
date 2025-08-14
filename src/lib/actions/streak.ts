"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import * as logger from "@superbuilders/slog"
import { revalidatePath } from "next/cache"
import * as streak from "@/lib/services/streak"

export async function updateStreak() {
	const { userId } = await auth()
	if (!userId) {
		logger.warn("streak update skipped: user not authenticated")
		return
	}

	// The action is now responsible for fetching framework-specific data
	const clerk = await clerkClient()
	const user = await clerk.users.getUser(userId)

	// The service handles all business logic
	await streak.update(userId, user.publicMetadata)

	// Framework-specific side effects remain in the action
	revalidatePath("/(user)/[subject]/[course]")
	revalidatePath("/(user)/profile")
}
