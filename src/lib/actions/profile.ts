"use server"

import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/db"
import * as schema from "@/db/schemas"

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

	// Update the user profile in the database
	await db
		.update(schema.niceUsers)
		.set({
			nickname: validatedData.nickname,
			username: validatedData.username,
			bio: validatedData.bio
		})
		.where(eq(schema.niceUsers.clerkId, userId))

	// Revalidate the profile page to show updated data
	revalidatePath("/profile")

	return { success: true }
}
