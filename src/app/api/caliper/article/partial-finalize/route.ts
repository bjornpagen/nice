import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { PartialFinalizeRequestSchema, type PartialFinalizeRequest } from "@/lib/schemas/caliper-article"
import { finalizeArticlePartialTimeSpent } from "@/lib/actions/tracking"
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

	// Fire-and-forget call to the server action
	void finalizeArticlePartialTimeSpent(
		onerosterUserSourcedId,
		onerosterArticleResourceSourcedId,
		articleTitle,
		courseInfo
	).catch((error) => {
		logger.error("partial finalize failed", { error })
	})

	return new NextResponse(null, { status: 204 })
}
