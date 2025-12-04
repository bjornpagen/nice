import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { oneroster } from "@/lib/clients"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"

// Schema for parsing existing OneRoster result data
const ExistingResultSchema = z.object({
    score: z.number().optional(),
    scoreStatus: z.enum(["fully graded", "partially graded", "submitted", "not submitted", "exempt"]).optional(),
    scoreDate: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional()
}).passthrough()

// Schema for parsing the time spent from metadata
const TimeSpentMetadataSchema = z.object({
    nice_timeSpent: z.number().optional()
}).passthrough()

export async function upsertNiceTimeSpentToOneRoster(params: {
    kind: "video" | "article"
    userSourcedId: string
    resourceSourcedId: string
    courseSourcedId: string
    finalSeconds: number
}): Promise<void> {
    const lineItemId = getAssessmentLineItemId(params.resourceSourcedId)
    const resultId = `nice_${params.userSourcedId}_${lineItemId}`

    // Default values
    let preservedScore = 100
    let preservedStatus: "fully graded" | "partially graded" = "fully graded"
    let preservedScoreDate: string | undefined
    let existingTime: number | undefined

    // Fetch existing result and parse with Zod
    const getResult = await errors.try(oneroster.getResult(resultId))
    if (!getResult.error && getResult.data) {
        const parsed = ExistingResultSchema.safeParse(getResult.data)
        if (parsed.success) {
            if (typeof parsed.data.score === "number") {
                preservedScore = Math.round(parsed.data.score)
            }
            if (parsed.data.scoreStatus === "partially graded" || parsed.data.scoreStatus === "fully graded") {
                preservedStatus = parsed.data.scoreStatus
            }
            // Only preserve scoreDate if already completed (don't update on re-watch)
            if (parsed.data.scoreDate && parsed.data.scoreStatus === "fully graded") {
                preservedScoreDate = parsed.data.scoreDate
            }
            if (parsed.data.metadata) {
                const metadataParsed = TimeSpentMetadataSchema.safeParse(parsed.data.metadata)
                if (metadataParsed.success && metadataParsed.data.nice_timeSpent !== undefined) {
                    existingTime = metadataParsed.data.nice_timeSpent
                }
            }
        }
    }

    // Calculate final time to write (ensure monotonic increase)
    const newTime = Math.floor(params.finalSeconds)
    const writeTime = existingTime !== undefined ? Math.max(existingTime, newTime) : newTime

    logger.debug("upserting nice time spent to oneroster", {
        kind: params.kind,
        resultId,
        existingTime,
        newTime,
        writeTime
    })

    const updatePayload = {
        result: {
            assessmentLineItem: { sourcedId: lineItemId, type: "assessmentLineItem" as const },
            student: { sourcedId: params.userSourcedId, type: "user" as const },
            scoreStatus: preservedStatus,
            scoreDate: preservedScoreDate ?? new Date().toISOString(),
            score: preservedScore,
            metadata: {
                nice_timeSpent: writeTime,
                lessonType: params.kind,
                courseSourcedId: params.courseSourcedId
            }
        }
    }

    const putResult = await errors.try(oneroster.putResult(resultId, updatePayload))
    if (putResult.error) {
        logger.error("failed to write nice_timeSpent to oneroster", {
            error: putResult.error,
            kind: params.kind,
            resultId,
            userSourcedId: params.userSourcedId,
            resourceSourcedId: params.resourceSourcedId,
            writeTime
        })
        // Don't throw - this is a non-critical background operation
    } else {
        logger.info("wrote nice time spent to oneroster", {
            kind: params.kind,
            resultId,
            userSourcedId: params.userSourcedId,
            resourceSourcedId: params.resourceSourcedId,
            writeTime,
            existingTime,
            preservedScore,
            preservedStatus
        })
    }
}


