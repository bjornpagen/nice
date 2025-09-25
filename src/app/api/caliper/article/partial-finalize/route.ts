import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { PartialFinalizeRequestSchema, type PartialFinalizeRequest } from "@/lib/schemas/caliper-article"
import { finalizeArticlePartialTimeSpentService } from "@/lib/services/caliper-article"
import { getCurrentUserSourcedId } from "@/lib/authorization"
import { redis } from "@/lib/redis"

export async function POST(request: Request) {
	const { userId } = await auth()
	if (!userId) {
		return new NextResponse(null, { status: 204 })
	}

	const bodyResult = await errors.try(request.json())
	if (bodyResult.error) {
		logger.error("failed to parse partial-finalize request body", { error: bodyResult.error })
		return new NextResponse("Bad Request", { status: 400 })
	}

    // Validate request body with shared Zod schema
    const validation = PartialFinalizeRequestSchema.safeParse(bodyResult.data)
	if (!validation.success) {
		logger.error("invalid partial-finalize request body", { error: validation.error })
		return new NextResponse("Bad Request", { status: 400 })
	}
	
	const { onerosterUserSourcedId, onerosterArticleResourceSourcedId, articleTitle, courseInfo } = validation.data

	const serverSourcedId = await getCurrentUserSourcedId(userId)
	if (onerosterUserSourcedId !== serverSourcedId) {
		logger.warn("unauthorized partial-finalize request", { client: onerosterUserSourcedId, server: serverSourcedId })
		return new NextResponse("Unauthorized", { status: 401 })
	}
	

	// Short NX lock to dedupe multiple beacons fired during unload
	const lockKey = `caliper:article:pf:${serverSourcedId}:${onerosterArticleResourceSourcedId}`
	if (redis) {
		const setResult = await errors.try(redis.set(lockKey, "1", { EX: 5, NX: true }))
		if (setResult.error) {
			// If we cannot set the lock, still attempt finalize best-effort
			logger.error("partial-finalize: lock set failed", { error: setResult.error })
		}
		if (!setResult.error && setResult.data === null) {
			// Lock not acquired, another beacon likely in-flight
			return new NextResponse(null, { status: 204 })
		}
	}

	// Drill userEmail now (safe during live request)
    let userEmail: string | undefined
    if (userId) {
        const userResult = await errors.try((await (await import("@clerk/nextjs/server")).clerkClient()).users.getUser(userId))
        if (!userResult.error) {
            userEmail = userResult.data.emailAddresses[0]?.emailAddress
        }
    }

    if (!userEmail) {
        logger.error("partial finalize: missing user email in request context")
        return new NextResponse("Unauthorized", { status: 401 })
    }

	// Make synchronous for reliability and logging
	const serviceResult = await errors.try(
		finalizeArticlePartialTimeSpentService(
			onerosterUserSourcedId,
			onerosterArticleResourceSourcedId,
			articleTitle,
			courseInfo,
			userEmail
		)
	)
	if (serviceResult.error) {
		logger.error("partial finalize failed", { error: serviceResult.error })
		return new NextResponse("Internal Server Error", { status: 500 })
	}

	return new NextResponse(null, { status: 204 })
}
