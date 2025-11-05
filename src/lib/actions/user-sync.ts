"use server"

import { clerkClient } from "@clerk/nextjs/server"
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
import { requireUser } from "@/lib/auth/require-user"
import { redis } from "@/lib/redis"
import { getActiveEnrollmentsForUser, getClass } from "@/lib/oneroster/redis/api"
import {
    ENROLLMENT_CACHE_TTL_SECONDS,
    SYNC_LOCK_TTL_SECONDS,
    ON_DEMAND_SYNC_RATE_LIMIT_SECONDS,
    EnrollmentCacheSchema,
    type EnrollmentCache,
    getEnrollmentCacheKey,
    getSyncLockKey,
    getOnDemandRateLimitKey
} from "@/lib/cache/enrollment-cache"

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
	const user = await requireUser()

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
			
			// Compact roles to a single representative role to avoid Clerk's 8KB limit
			// Prefer first non-student role, otherwise use first role
			const allRoles = onerosterUserResult.data.roles
			const nonStudentRole = allRoles.find((role) => role.role !== "student")
			const selectedRole = nonStudentRole || allRoles[0]
			
			logger.info("compacting roles for clerk metadata", {
				clerkId,
				originalRoleCount: allRoles.length,
				selectedRoleType: selectedRole?.roleType,
				selectedRole: selectedRole?.role,
				hasNonStudentRole: !!nonStudentRole
			})
			
			// Update metadata with single compacted role from OneRoster
			const updatedMetadata = {
				...metadataValidation.data,
				roles: selectedRole ? [{
					roleType: selectedRole.roleType,
					role: selectedRole.role,
					org: {
						sourcedId: selectedRole.org.sourcedId,
						type: selectedRole.org.type
					},
					userProfile: selectedRole.userProfile,
					beginDate: selectedRole.beginDate,
					endDate: selectedRole.endDate
				}] : []
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
				originalRoleCount: allRoles.length,
				storedRoleCount: updatedMetadata.roles.length
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
	
	// Compact roles to a single representative role to avoid Clerk's 8KB limit
	// Prefer first non-student role, otherwise use first role
	const allRoles = onerosterUserResult.data.roles
	const nonStudentRole = allRoles.find((role) => role.role !== "student")
	const selectedRole = nonStudentRole || allRoles[0]
	
	logger.info("compacting roles for fresh sync", {
		clerkId,
		originalRoleCount: allRoles.length,
		selectedRoleType: selectedRole?.roleType,
		selectedRole: selectedRole?.role,
		hasNonStudentRole: !!nonStudentRole
	})
	
	publicMetadataPayload.roles = selectedRole ? [{
		roleType: selectedRole.roleType,
		role: selectedRole.role,
		org: {
			sourcedId: selectedRole.org.sourcedId,
			type: selectedRole.org.type
		},
		userProfile: selectedRole.userProfile,
		beginDate: selectedRole.beginDate,
		endDate: selectedRole.endDate
	}] : []

	logger.info("successfully fetched sourceid and compacted roles from oneroster", {
		userId: clerkId,
		email,
		sourceId: onerosterUserResult.data.sourcedId,
		originalRoleCount: allRoles.length,
		storedRoleCount: publicMetadataPayload.roles.length
	})

	// Update Clerk metadata
	logger.debug("updating clerk with fresh user metadata", {
		clerkId,
		sourceId: publicMetadataPayload.sourceId,
		storedRoleCount: publicMetadataPayload.roles.length
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
		storedRoleCount: publicMetadataPayload.roles.length
	})

	return {
		success: true,
		sourceId: publicMetadataPayload.sourceId,
		nickname: nickname,
		alreadySynced: false
	}
}

// ---------------- Enrollment Cache Sync (PRD: Cache-on-Login) ----------------

export async function syncAndCacheUserEnrollments(): Promise<void> {
    const user = await requireUser()

    const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
    if (!metadataValidation.success) {
        logger.warn("cannot sync enrollments, invalid user metadata", { userId: user.id, error: metadataValidation.error })
        return
    }
    const metadata = metadataValidation.data

    if (!metadata?.sourceId) {
        logger.warn("cannot sync enrollments, user has no sourceId", { userId: user.id })
        return
    }

    const lockKey = getSyncLockKey(user.id)
    const lockAcquired = await errors.try(redis.set(lockKey, "1", { NX: true, EX: SYNC_LOCK_TTL_SECONDS }))
    if (lockAcquired.error) {
        logger.error("enrollment sync: failed to acquire lock", { userId: user.id, error: lockAcquired.error })
        return
    }
    if (lockAcquired.data === null) {
        logger.debug("enrollment sync already in progress, skipping", { userId: user.id })
        return
    }

    const cacheKey = getEnrollmentCacheKey(user.id)
    try {
        // Load existing cache (for failure path preservation)
        const existingCacheResult = await errors.try(redis.get(cacheKey))
        if (existingCacheResult.error) {
            logger.error("enrollment sync: failed to read existing cache", { userId: user.id, error: existingCacheResult.error })
        }

        let existingCache: EnrollmentCache | null = null
        if (existingCacheResult.data) {
            const parsedJsonResult = errors.trySync(() => JSON.parse(existingCacheResult.data as string))
            if (parsedJsonResult.error) {
                logger.error("enrollment sync: failed to parse existing cache json", { userId: user.id, error: parsedJsonResult.error })
            } else {
                const parsed = EnrollmentCacheSchema.safeParse(parsedJsonResult.data)
                if (!parsed.success) {
                    logger.error("enrollment sync: existing cache schema invalid", { userId: user.id, error: parsed.error })
                } else {
                    existingCache = parsed.data
                }
            }
        }

        // Fetch fresh enrollments from OneRoster-backed API
        const enrollmentsResult = await errors.try(getActiveEnrollmentsForUser(metadata.sourceId))
        if (enrollmentsResult.error) {
            logger.error("enrollment sync: failed to fetch active enrollments", { userId: user.id, error: enrollmentsResult.error })

            const updatedCache: EnrollmentCache = {
                enrolledCourseIds: existingCache ? existingCache.enrolledCourseIds : [],
                lastSyncAt: new Date().toISOString(),
                lastSuccessAt: existingCache ? existingCache.lastSuccessAt : null,
                failureCount: existingCache ? existingCache.failureCount + 1 : 1
            }
            const setResult = await errors.try(redis.set(cacheKey, JSON.stringify(updatedCache), { EX: ENROLLMENT_CACHE_TTL_SECONDS }))
            if (setResult.error) {
                logger.error("enrollment sync: failed to write failure cache", { userId: user.id, error: setResult.error })
            }
            return
        }

        const enrollments = enrollmentsResult.data
        const uniqueClassIds = [...new Set(enrollments.map((e) => e.class.sourcedId))]
        const classResults = await Promise.all(
            uniqueClassIds.map(async (classId) => {
                const clsResult = await errors.try(getClass(classId))
                if (clsResult.error) {
                    logger.error("enrollment sync: failed to resolve class", { userId: user.id, classId, error: clsResult.error })
                    return null
                }
                return clsResult.data
            })
        )
        const enrolledCourseIds: string[] = []
        for (const cls of classResults) {
            if (cls && cls.course && typeof cls.course.sourcedId === "string") {
                enrolledCourseIds.push(cls.course.sourcedId)
            }
        }

        const newCache: EnrollmentCache = {
            enrolledCourseIds,
            lastSyncAt: new Date().toISOString(),
            lastSuccessAt: new Date().toISOString(),
            failureCount: 0
        }

        const setOk = await errors.try(redis.set(cacheKey, JSON.stringify(newCache), { EX: ENROLLMENT_CACHE_TTL_SECONDS }))
        if (setOk.error) {
            logger.error("enrollment sync: failed to write success cache", { userId: user.id, error: setOk.error })
            return
        }
        logger.info("enrollment sync: cache updated", { userId: user.id, count: enrolledCourseIds.length })
    } finally {
        const delResult = await errors.try(redis.del(lockKey))
        if (delResult.error) {
            logger.error("enrollment sync: failed to release lock", { userId: user.id, error: delResult.error })
        }
    }
}

export async function triggerUserEnrollmentSync(): Promise<void> {
    const user = await requireUser()
    const rateLimitKey = getOnDemandRateLimitKey(user.id)

    const rateResult = await errors.try(redis.set(rateLimitKey, "1", { NX: true, EX: ON_DEMAND_SYNC_RATE_LIMIT_SECONDS }))
    if (rateResult.error) {
        logger.error("enrollment sync: rate limit check failed", { userId: user.id, error: rateResult.error })
        return
    }
    if (rateResult.data === null) {
        logger.debug("enrollment sync: on-demand rate limited", { userId: user.id })
        return
    }

    // Fire-and-forget
    void syncAndCacheUserEnrollments().catch((err) => {
        logger.error("on-demand enrollment sync failed", { userId: user.id, error: err })
    })
}
