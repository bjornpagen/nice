"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Validation schema for profile updates
const updateProfileSchema = z.object({
	nickname: z.string().min(1, "Nickname is required").max(100, "Nickname too long"),
	username: z.string().min(1, "Username is required").max(50, "Username too long"),
	bio: z.string().max(500, "Bio too long")
})

export async function updateUserProfile(data: z.infer<typeof updateProfileSchema>) {
	// Get the authenticated user
	const { userId } = await auth()
	if (!userId) {
		throw errors.new("User not authenticated")
	}

	// Validate the input data
	const validatedData = updateProfileSchema.parse(data)

	// Update the user's public metadata in Clerk
	const metadata = {
		publicMetadata: {
			nickname: validatedData.nickname,
			username: validatedData.username,
			bio: validatedData.bio
		}
	}

	const clerk = await clerkClient()
	await clerk.users.updateUserMetadata(userId, metadata)

	// Revalidate the profile page to show updated data
	revalidatePath("/profile")

	return { success: true }
}
