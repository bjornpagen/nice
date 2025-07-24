"use server"

import { randomUUID } from "node:crypto"
import { clerkClient, currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { oneroster } from "@/lib/clients"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

// Response schema for the sync action
const SyncResponseSchema = z.object({
	success: z.boolean(),
	sourceId: z.string().optional(),
	nickname: z.string(),
	alreadySynced: z.boolean().optional()
})

export type SyncUserResponse = z.infer<typeof SyncResponseSchema>

/**
 * Syncs the current authenticated user with OneRoster.
 * This action will:
 * 1. Check if the user already has a sourceId (already synced)
 * 2. Look up the user in OneRoster by email
 * 3. Create a new user in OneRoster if not found
 * 4. Update the user's Clerk metadata with the sourceId
 *
 * @returns {Promise<SyncUserResponse>} The sync result including sourceId if successful
 */
export async function syncUserWithOneRoster(): Promise<SyncUserResponse> {
	// Get the authenticated user
	const user = await currentUser()
	if (!user) {
		throw errors.new("user not authenticated")
	}

	const clerkId = user.id
	const email = user.emailAddresses[0]?.emailAddress
	const firstName = user.firstName || ""
	const lastName = user.lastName || ""

	if (!email) {
		logger.error("CRITICAL: User has no email address", { clerkId })
		throw errors.new("user email required for sync")
	}

	// Extract nickname from email (same logic as webhook)
	const emailParts = email.split("@")
	if (emailParts.length !== 2 || emailParts[0] === undefined) {
		logger.error("CRITICAL: Invalid email format for nickname extraction", {
			clerkId,
			email,
			emailPartsLength: emailParts.length
		})
		throw errors.new("invalid email format")
	}
	const nickname = emailParts[0]

	// Check if user already has sourceId (already synced)
	const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata || {})
	if (metadataValidation.success && metadataValidation.data.sourceId) {
		// User already has sourceId, no sync needed
		logger.info("user already synced with oneroster", {
			clerkId,
			sourceId: metadataValidation.data.sourceId
		})
		return {
			success: true,
			sourceId: metadataValidation.data.sourceId,
			nickname: metadataValidation.data.nickname || nickname,
			alreadySynced: true
		}
	}

	logger.info("syncing user to oneroster", { clerkId, email })

	// Initialize metadata payload (same as webhook and route)
	const publicMetadataPayload = ClerkUserPublicMetadataSchema.parse({
		nickname: nickname,
		username: "",
		bio: "",
		streak: { count: 0, lastActivityDate: null },
		sourceId: undefined
	})

	// Check if user exists in OneRoster
	const onerosterUserResult = await errors.try(oneroster.getUsersByEmail(email))
	if (onerosterUserResult.error) {
		logger.warn("failed to get user from oneroster, proceeding without sourceid", {
			userId: clerkId,
			error: onerosterUserResult.error
		})
		// Don't fail the sync, just proceed without sourceId
	} else if (onerosterUserResult.data) {
		// User exists in OneRoster
		publicMetadataPayload.sourceId = onerosterUserResult.data.sourcedId
		logger.info("successfully fetched sourceid from oneroster", {
			userId: clerkId,
			sourceId: onerosterUserResult.data.sourcedId
		})
	} else {
		// Create new user in OneRoster (same logic as webhook and route)
		logger.info("user not found in oneroster, creating a new one", { userId: clerkId, email })
		const newSourcedId = randomUUID()

		const newUserPayload = {
			sourcedId: newSourcedId,
			status: "active" as const,
			enabledUser: true,
			givenName: firstName,
			familyName: lastName,
			email: email,
			roles: [
				{
					roleType: "primary" as const,
					role: "student" as const,
					org: {
						sourcedId: "nice-academy"
					}
				}
			]
		}

		const createUserResult = await errors.try(oneroster.createUser(newUserPayload))
		if (createUserResult.error) {
			logger.warn("failed to create new user in oneroster, proceeding without sourceid", {
				userId: clerkId,
				error: createUserResult.error
			})
		} else {
			publicMetadataPayload.sourceId = newSourcedId
			logger.info("successfully created new user in oneroster and assigned sourceid", {
				userId: clerkId,
				sourceId: newSourcedId
			})
		}
	}

	// Update Clerk metadata
	const clerk = await clerkClient()
	const updateResult = await errors.try(
		clerk.users.updateUserMetadata(clerkId, { publicMetadata: publicMetadataPayload })
	)
	if (updateResult.error) {
		logger.error("failed to set initial user metadata in clerk", {
			error: updateResult.error,
			clerkId
		})
		throw errors.wrap(updateResult.error, "failed to update user metadata")
	}

	logger.info("user metadata initialized successfully", { clerkId, nickname })

	return {
		success: true,
		sourceId: publicMetadataPayload.sourceId,
		nickname: nickname,
		alreadySynced: false
	}
}
