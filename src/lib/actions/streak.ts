"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { isSameWeek, subWeeks } from "date-fns"
import { revalidatePath } from "next/cache"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

export async function updateStreak() {
	const { userId } = await auth()
	if (!userId) {
		// Not a critical failure, just return.
		logger.warn("streak update skipped: user not authenticated")
		return
	}

	const clerk = await clerkClient()
	const user = await clerk.users.getUser(userId)

	if (!user.publicMetadata) {
		logger.error("CRITICAL: User public metadata missing during streak update", { userId })
		return
	}

	const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!metadataValidation.success) {
		logger.error("failed to parse user metadata during streak update", {
			userId,
			error: metadataValidation.error
		})
		return
	}

	const metadata = metadataValidation.data
	const streak = { ...metadata.streak } // Make a copy to modify
	const now = new Date()
	const lastActivity = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null

	// No previous activity, start the streak
	if (!lastActivity) {
		streak.count = 1
		streak.lastActivityDate = now.toISOString()
		logger.info("streak started", { userId, newCount: streak.count })
	} else {
		const isThisWeek = isSameWeek(now, lastActivity, { weekStartsOn: 1 })
		const isLastWeek = isSameWeek(subWeeks(now, 1), lastActivity, { weekStartsOn: 1 })

		if (isThisWeek) {
			// Already active this week, no change needed.
			logger.debug("streak already updated this week", { userId })
			return
		}

		if (isLastWeek) {
			// Consecutive week, increment streak
			streak.count++
			streak.lastActivityDate = now.toISOString()
			logger.info("streak continued", { userId, newCount: streak.count })
		} else {
			// Streak broken, reset to 1
			streak.count = 1
			streak.lastActivityDate = now.toISOString()
			logger.info("streak broken and reset", { userId, newCount: streak.count })
		}
	}

	// Update metadata in Clerk
	const updateResult = await errors.try(
		clerk.users.updateUserMetadata(userId, {
			publicMetadata: {
				...metadata,
				streak
			}
		})
	)

	if (updateResult.error) {
		logger.error("failed to update streak metadata in clerk", { userId, error: updateResult.error })
		return
	}

	// Revalidate layouts to show updated streak
	revalidatePath("/(user)/[subject]/[course]")
	revalidatePath("/(user)/profile")

	logger.info("streak updated successfully", { userId, streak })
}
