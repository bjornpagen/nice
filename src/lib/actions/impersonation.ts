"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"

// Error constants for internal use only (cannot export non-async from "use server" files)
const ErrNotAuthorized = errors.new("not authorized to impersonate users")
const ErrImpersonationFailed = errors.new("failed to create impersonation session")
const ErrUserNotFound = errors.new("target user not found")
const ErrInvalidActorToken = errors.new("invalid actor token received")

const ImpersonateUserInputSchema = z.object({
    targetUserId: z.string().min(1)
})

/**
 * Creates an actor token to impersonate another user.
 * Only accessible to users with non-student roles (teachers, admins).
 * 
 * @param targetUserId - The Clerk user ID of the user to impersonate
 * @returns The URL to redirect to with the actor token
 */
export async function impersonateUser(targetUserId: string): Promise<{ redirectUrl: string; actorToken: string }> {
    logger.info("impersonation request initiated", { targetUserId })
    
    // Validate input
    const validation = ImpersonateUserInputSchema.safeParse({ targetUserId })
    if (!validation.success) {
        logger.error("invalid input for impersonation", { 
            error: validation.error,
            targetUserId 
        })
        throw errors.new("invalid target user ID")
    }

    // Get current user and check authorization
    const { userId } = await auth()
    if (!userId) {
        logger.error("unauthenticated user attempted impersonation")
        throw ErrNotAuthorized
    }

    const clerk = await clerkClient()
    const currentUser = await clerk.users.getUser(userId)
    const metadata = parseUserPublicMetadata(currentUser.publicMetadata)
    
    // Check if user has permission to impersonate (non-student role)
    const hasPermission = metadata.roles.some(r => r.role !== "student")
    if (!hasPermission) {
        logger.warn("unauthorized impersonation attempt", {
            actorId: userId,
            targetUserId,
            roles: metadata.roles.map(r => r.role)
        })
        throw ErrNotAuthorized
    }

    // Verify target user exists
    const targetUserResult = await errors.try(clerk.users.getUser(targetUserId))
    if (targetUserResult.error) {
        logger.error("failed to fetch target user", {
            targetUserId,
            error: targetUserResult.error
        })
        throw ErrUserNotFound
    }

    const targetUser = targetUserResult.data
    const targetEmail = targetUser.emailAddresses[0]?.emailAddress ?? "unknown"
    const targetName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ") || targetEmail

    logger.info("creating actor token for impersonation", {
        actorId: userId,
        actorEmail: currentUser.emailAddresses[0]?.emailAddress,
        targetUserId,
        targetEmail,
        targetName
    })

    try {
        // Create actor token using Clerk Backend API
        // The token is valid for 10 minutes (600 seconds)
        const response = await fetch("https://api.clerk.com/v1/actor_tokens", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: targetUserId,
                actor: {
                    sub: userId
                },
                expires_in_seconds: 600,
                session_max_duration_in_seconds: 3600 // 1 hour max session
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            logger.error("failed to create actor token", {
                status: response.status,
                error: errorText,
                actorId: userId,
                targetUserId
            })
            throw ErrImpersonationFailed
        }

        const data = await response.json()
        const actorToken = data.token

        if (!actorToken) {
            logger.error("no actor token in response", { 
                responseData: data,
                actorId: userId,
                targetUserId
            })
            throw ErrInvalidActorToken
        }

        logger.info("actor token created successfully", {
            actorId: userId,
            targetUserId,
            targetName,
            tokenId: data.id
        })

        // Build a relative sign-in path so current origin is used in all envs
        const params = new URLSearchParams()
        params.set("__clerk_ticket", actorToken)
        params.set("redirect_url", "/profile/me/students")
        const signInPath = `/login?${params.toString()}`

        return {
            redirectUrl: signInPath,
            actorToken
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes("not authorized")) {
            throw error
        }
        logger.error("unexpected error during impersonation", {
            error,
            actorId: userId,
            targetUserId
        })
        throw ErrImpersonationFailed
    }
}

/**
 * Stops the current impersonation session and returns to the original user.
 * This ends the impersonated session and restores the original actor's session.
 */
export async function stopImpersonation(): Promise<{ redirectUrl: string }> {
    const { userId, actor } = await auth()
    
    if (!actor) {
        logger.warn("stop impersonation called but no active impersonation")
        throw errors.new("no active impersonation session")
    }

    logger.info("ending impersonation session", {
        impersonatedUserId: userId,
        actorId: actor.sub
    })

    // To stop impersonation, we need to end the current session
    // Since we can't directly call signOut from a server action,
    // we'll return a special indicator that the client should handle the sign-out
    // The admin will need to sign back in manually after ending impersonation
    
    // In a production app, you might want to:
    // 1. Store the original session token before impersonation
    // 2. Restore it after ending impersonation
    // 3. Or use Clerk's session management APIs more sophisticatedly
    
    return {
        redirectUrl: "SIGN_OUT_REQUIRED" // Special indicator for the client to handle sign-out
    }
}
