"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

// Validation schema for profile updates
const updateProfileSchema = z.object({
	nickname: z.string().min(1, "Nickname is required").max(100, "Nickname too long"),
	username: z.string().max(50, "Username too long"), // Allow empty string for username
	bio: z.string().max(500, "Bio too long")
})

export async function updateUserProfile(data: z.infer<typeof updateProfileSchema>) {
	// Get the authenticated user
	const { userId } = await auth()
	if (!userId) {
		logger.error("User not authenticated")
		throw errors.new("User not authenticated")
	}

	// Validate the input data
	const validationResult = updateProfileSchema.safeParse(data)
	if (!validationResult.success) {
		logger.error("Input validation failed for profile update", { error: validationResult.error })
		throw errors.wrap(validationResult.error, "Input validation failed for profile update")
	}

	const validatedData = validationResult.data
	const clerk = await clerkClient()

	// Fetch existing user to preserve other metadata like streak
	const user = await clerk.users.getUser(userId)

	if (!user.publicMetadata) {
		logger.error("CRITICAL: User public metadata missing during profile update", { userId })
		throw errors.new("user public metadata missing")
	}

	// Validate existing metadata structure
	const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!metadataValidation.success) {
		logger.error("CRITICAL: Invalid user metadata during profile update", {
			userId,
			error: metadataValidation.error
		})
		throw errors.wrap(metadataValidation.error, "existing user metadata invalid")
	}

	const existingMetadata = metadataValidation.data

	// Update the user's public metadata in Clerk
	const metadata = {
		publicMetadata: {
			...existingMetadata,
			nickname: validatedData.nickname,
			username: validatedData.username,
			bio: validatedData.bio
			// Preserve existing sourceId and roles - do not modify them during profile updates
		}
	}

	await clerk.users.updateUserMetadata(userId, metadata)

	// Revalidate the profile page to show updated data
	revalidatePath("/profile")

	return { success: true }
}
