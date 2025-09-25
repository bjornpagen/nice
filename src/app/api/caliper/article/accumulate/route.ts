import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { AccumulateRequestSchema, type AccumulateRequest } from "@/lib/schemas/caliper-article"
import { accumulateArticleReadTime } from "@/lib/actions/tracking"
import { getCurrentUserSourcedId } from "@/lib/authorization"

export async function POST(request: Request) {
	const { userId } = await auth()
	if (!userId) {
		// Not an error, just an unauthenticated request to ignore
		return new NextResponse(null, { status: 204 })
	}

	const bodyResult = await errors.try(request.json())
	if (bodyResult.error) {
		logger.error("failed to parse accumulate request body", { error: bodyResult.error })
		return new NextResponse("Bad Request", { status: 400 })
	}

    // Validate request body with shared Zod schema
    const validation = AccumulateRequestSchema.safeParse(bodyResult.data)
	if (!validation.success) {
		logger.error("invalid accumulate request body", { error: validation.error })
		return new NextResponse("Bad Request", { status: 400 })
	}

	const { onerosterUserSourcedId, onerosterArticleResourceSourcedId, sessionDeltaSeconds } = validation.data
	
	const serverSourcedId = await getCurrentUserSourcedId(userId)
	if (onerosterUserSourcedId !== serverSourcedId) {
		logger.warn("unauthorized accumulate request", { client: onerosterUserSourcedId, server: serverSourcedId })
		return new NextResponse("Unauthorized", { status: 401 })
	}

	// Fire-and-forget call to the server action
	void accumulateArticleReadTime(
		onerosterUserSourcedId,
		onerosterArticleResourceSourcedId,
		sessionDeltaSeconds
	).catch((error) => {
		logger.error("accumulate article read time failed", { error })
	})

	return new NextResponse(null, { status: 204 })
}
