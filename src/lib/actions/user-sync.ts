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
		logger.error("user not authenticated")
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
		// User already has sourceId, but we still need to update roles
		logger.info("user already synced with oneroster, updating roles", {
			clerkId,
			sourceId: metadataValidation.data.sourceId
		})

		// Fetch latest user data from OneRoster to get current roles
		const onerosterUserResult = await errors.try(oneroster.getUsersByEmail(email))
		if (onerosterUserResult.error) {
			logger.warn("failed to get user from oneroster for role update", {
				userId: clerkId,
				error: onerosterUserResult.error
			})
			// Return existing data if we can't fetch roles
			return {
				success: true,
				sourceId: metadataValidation.data.sourceId,
				nickname: metadataValidation.data.nickname || nickname,
				alreadySynced: true
			}
		}

		if (onerosterUserResult.data) {
			// Update metadata with latest roles from OneRoster
			const updatedMetadata = {
				...metadataValidation.data,
				roles: onerosterUserResult.data.roles.map((role) => ({
					roleType: role.roleType,
					role: role.role,
					org: {
						sourcedId: role.org.sourcedId,
						type: role.org.type
					},
					userProfile: role.userProfile,
					beginDate: role.beginDate,
					endDate: role.endDate
				}))
			}

			// Update Clerk metadata with latest roles
			const clerk = await clerkClient()
			const updateResult = await errors.try(
				clerk.users.updateUserMetadata(clerkId, { publicMetadata: updatedMetadata })
			)

			if (updateResult.error) {
				logger.error("failed to update roles metadata in clerk for existing user", {
					error: updateResult.error,
					clerkId
				})
				// Still return success with existing data if metadata update fails
				return {
					success: true,
					sourceId: metadataValidation.data.sourceId,
					nickname: metadataValidation.data.nickname || nickname,
					alreadySynced: true
				}
			}

			logger.info("successfully updated roles for existing user", {
				clerkId,
				sourceId: metadataValidation.data.sourceId,
				roleCount: updatedMetadata.roles.length
			})

			return {
				success: true,
				sourceId: metadataValidation.data.sourceId,
				nickname: metadataValidation.data.nickname || nickname,
				alreadySynced: true
			}
		}

		// No user data found in OneRoster, return existing
		return {
			success: true,
			sourceId: metadataValidation.data.sourceId,
			nickname: metadataValidation.data.nickname || nickname,
			alreadySynced: true
		}
	}

	logger.info("syncing user to oneroster", { clerkId, email })

	// Initialize metadata payload (same as webhook and route)
	const payloadValidation = ClerkUserPublicMetadataSchema.safeParse({
		nickname: nickname,
		username: "",
		bio: "",
		streak: { count: 0, lastActivityDate: null },
		sourceId: undefined,
		roles: []
	})
	if (!payloadValidation.success) {
		logger.error("input validation", { error: payloadValidation.error, clerkId })
		throw errors.wrap(payloadValidation.error, "input validation")
	}
	const publicMetadataPayload = payloadValidation.data

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
		// Store roles from OneRoster in Clerk metadata
		publicMetadataPayload.roles = onerosterUserResult.data.roles.map((role) => ({
			roleType: role.roleType,
			role: role.role,
			org: {
				sourcedId: role.org.sourcedId,
				type: role.org.type
			},
			userProfile: role.userProfile,
			beginDate: role.beginDate,
			endDate: role.endDate
		}))
		logger.info("successfully fetched sourceid and roles from oneroster", {
			userId: clerkId,
			sourceId: onerosterUserResult.data.sourcedId,
			roleCount: publicMetadataPayload.roles.length
		})
	} else {
		// Create new user in OneRoster (same logic as webhook and route)
		logger.info("user not found in oneroster, creating a new one", { userId: clerkId, email })
		const newSourcedId = randomUUID()

		const defaultRole = {
			roleType: "primary" as const,
			role: "student" as const,
			org: {
				sourcedId: "f251f08b-61de-4ffa-8ff3-3e56e1d75a60"
			}
		}

		const newUserPayload = {
			sourcedId: newSourcedId,
			status: "active" as const,
			enabledUser: true,
			givenName: firstName,
			familyName: lastName,
			email: email,
			roles: [defaultRole]
		}

		const createUserResult = await errors.try(oneroster.createUser(newUserPayload))
		if (createUserResult.error) {
			logger.warn("failed to create new user in oneroster, proceeding without sourceid", {
				userId: clerkId,
				error: createUserResult.error
			})
		} else {
			publicMetadataPayload.sourceId = newSourcedId
			// Store the default role in Clerk metadata for new users
			publicMetadataPayload.roles = [
				{
					roleType: defaultRole.roleType,
					role: defaultRole.role,
					org: {
						sourcedId: defaultRole.org.sourcedId,
						type: undefined
					},
					userProfile: undefined,
					beginDate: null,
					endDate: null
				}
			]
			logger.info("successfully created new user in oneroster and assigned sourceid with default role", {
				userId: clerkId,
				sourceId: newSourcedId,
				roleCount: publicMetadataPayload.roles.length
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
