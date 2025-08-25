"use server"

import { clerkClient, currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import {
	ErrClerkMetadataUpdateFailed,
	ErrInputValidationFailed,
	ErrInvalidEmailFormat,
	ErrOneRosterQueryFailed,
	ErrUserEmailRequired,
	ErrUserNotAuthenticated,
	ErrUserNotProvisionedInOneRoster
} from "@/lib/actions/user-sync-errors"
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
 * 3. If the user is not found in OneRoster, deny access (throw)
 * 4. If found, update the user's Clerk metadata with the sourceId and roles
 *
 * @returns {Promise<SyncUserResponse>} The sync result including sourceId if successful
 */
export async function syncUserWithOneRoster(): Promise<SyncUserResponse> {
	logger.debug("starting user sync with oneroster")

	// Get the authenticated user
	const user = await currentUser()
	if (!user) {
		logger.error("user not authenticated - no current user found")
		throw ErrUserNotAuthenticated
	}

	logger.debug("authenticated user found", { clerkId: user.id })

	const clerkId = user.id
	const email = user.emailAddresses[0]?.emailAddress
	// names are not required for OneRoster lookup; avoid capturing unused values

	if (!email) {
		logger.error("CRITICAL: User has no email address", {
			clerkId,
			emailAddressesCount: user.emailAddresses.length
		})
		throw ErrUserEmailRequired
	}

	logger.debug("user email found", { clerkId, email })

	// Extract nickname from email (same logic as webhook)
	const emailParts = email.split("@")
	if (emailParts.length !== 2 || emailParts[0] === undefined) {
		logger.error("CRITICAL: Invalid email format for nickname extraction", {
			clerkId,
			email,
			emailPartsLength: emailParts.length,
			emailParts
		})
		throw ErrInvalidEmailFormat
	}
	const nickname = emailParts[0]

	// Check if user already has sourceId (already synced)
	logger.debug("checking existing user metadata", {
		clerkId,
		hasPublicMetadata: !!user.publicMetadata,
		metadataKeys: user.publicMetadata ? Object.keys(user.publicMetadata) : []
	})

	const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata || {})
	if (!metadataValidation.success) {
		logger.debug("user metadata validation failed, proceeding with fresh sync", {
			clerkId,
			validationError: metadataValidation.error
		})
	}

	if (metadataValidation.success && metadataValidation.data.sourceId) {
		// User already has sourceId, but we still need to update roles
		logger.info("user already synced with oneroster, updating roles", {
			clerkId,
			sourceId: metadataValidation.data.sourceId,
			existingRoleCount: metadataValidation.data.roles?.length || 0
		})

		// Fetch latest user data from OneRoster to get current roles
		logger.debug("fetching user data from oneroster for role update", { clerkId, email })
		const onerosterUserResult = await errors.try(oneroster.getUsersByEmail(email))
		if (onerosterUserResult.error) {
			logger.warn("failed to get user from oneroster for role update", {
				userId: clerkId,
				email,
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
			logger.debug("oneroster user data found for role update", {
				clerkId,
				onerosterSourceId: onerosterUserResult.data.sourcedId,
				newRoleCount: onerosterUserResult.data.roles.length
			})
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
			logger.debug("updating clerk metadata with latest roles", {
				clerkId,
				updatedRoleCount: updatedMetadata.roles.length
			})
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
		logger.debug("no oneroster user data found but user already has sourceId, returning existing", {
			clerkId,
			existingSourceId: metadataValidation.data.sourceId
		})
		return {
			success: true,
			sourceId: metadataValidation.data.sourceId,
			nickname: metadataValidation.data.nickname || nickname,
			alreadySynced: true
		}
	}

	logger.info("syncing user to oneroster - fresh sync required", {
		clerkId,
		email,
		nickname,
		hasExistingMetadata: metadataValidation.success
	})

	// Initialize metadata payload (same as webhook and route)
	logger.debug("initializing metadata payload", { clerkId, nickname })
	const payloadValidation = ClerkUserPublicMetadataSchema.safeParse({
		nickname: nickname,
		username: "",
		bio: "",
		streak: { count: 0, lastActivityDate: null },
		sourceId: undefined,
		roles: []
	})
	if (!payloadValidation.success) {
		logger.error("metadata payload validation failed", {
			error: payloadValidation.error,
			clerkId,
			nickname
		})
		throw ErrInputValidationFailed
	}
	const publicMetadataPayload = payloadValidation.data

	// Check if user exists in OneRoster
	logger.debug("querying oneroster for user by email", { clerkId, email })
	const onerosterUserResult = await errors.try(oneroster.getUsersByEmail(email))
	if (onerosterUserResult.error) {
		logger.error("failed to get user from oneroster during fresh sync", {
			userId: clerkId,
			email,
			error: onerosterUserResult.error
		})
		throw ErrOneRosterQueryFailed
	}

	if (!onerosterUserResult.data) {
		logger.warn("CRITICAL: User not found in OneRoster during fresh sync - denying access", {
			userId: clerkId,
			email,
			nickname,
			queryResponse: "no user data returned"
		})
		// Throw the constant directly to preserve error identity across client-server boundary
		throw ErrUserNotProvisionedInOneRoster
	}

	// User exists in OneRoster - proceed to set sourceId and roles
	logger.debug("oneroster user found, processing user data", {
		clerkId,
		onerosterSourceId: onerosterUserResult.data.sourcedId,
		onerosterRoleCount: onerosterUserResult.data.roles.length
	})

	publicMetadataPayload.sourceId = onerosterUserResult.data.sourcedId
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
		email,
		sourceId: onerosterUserResult.data.sourcedId,
		roleCount: publicMetadataPayload.roles.length
	})

	// Update Clerk metadata
	logger.debug("updating clerk with fresh user metadata", {
		clerkId,
		sourceId: publicMetadataPayload.sourceId,
		finalRoleCount: publicMetadataPayload.roles.length
	})
	const clerk = await clerkClient()
	const updateResult = await errors.try(
		clerk.users.updateUserMetadata(clerkId, { publicMetadata: publicMetadataPayload })
	)
	if (updateResult.error) {
		logger.error("failed to set initial user metadata in clerk", {
			error: updateResult.error,
			clerkId,
			sourceId: publicMetadataPayload.sourceId
		})
		throw ErrClerkMetadataUpdateFailed
	}

	logger.info("user metadata initialized successfully - fresh sync completed", {
		clerkId,
		nickname,
		sourceId: publicMetadataPayload.sourceId,
		finalRoleCount: publicMetadataPayload.roles.length
	})

	return {
		success: true,
		sourceId: publicMetadataPayload.sourceId,
		nickname: nickname,
		alreadySynced: false
	}
}
