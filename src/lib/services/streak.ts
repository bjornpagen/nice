import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { isSameWeek, subWeeks } from "date-fns"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import * as clerk from "@/lib/ports/clerk"

export async function update(userId: string, currentMetadata: unknown) {
	const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(currentMetadata)
	if (!metadataValidation.success) {
		logger.error("failed to parse user metadata during streak update", { userId, error: metadataValidation.error })
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

	// Update metadata via the clerk port
	const updateResult = await errors.try(
		clerk.updateUserMetadata(userId, {
			...metadata, // Preserve all existing metadata including sourceId and roles
			streak
		})
	)

	if (updateResult.error) {
		logger.error("failed to update streak metadata via clerk port", { userId, error: updateResult.error })
	}

	logger.info("streak updated successfully", { userId, streak })
}
