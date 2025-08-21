import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import { env } from "@/env"
import { oneroster } from "@/lib/clients"
import { getAggregatedTimeSpentByResource } from "@/lib/data/fetchers/caliper"
import { getResource } from "@/lib/data/fetchers/oneroster"
import { generateResultSourcedId } from "@/lib/utils/assessment-identifiers"

const VIDEO_ID = "nice_xbf5bf081a67372ad"
const ARTICLE_ID = "nice_xcc4568554cb8ebe9"

function buildActorId(userId: string): string {
  return `${env.TIMEBACK_ONEROSTER_SERVER_URL}/ims/oneroster/rostering/v1p2/users/${userId}`
}

async function getXpAndThresholdMinutes(resourceId: string): Promise<{ xp: number; thresholdMinutes: number }> {
  const resResult = await errors.try(getResource(resourceId))
  if (resResult.error) {
    logger.error("failed to fetch resource", { resourceId, error: resResult.error })
    throw errors.wrap(resResult.error, "get resource")
  }
  const res = resResult.data
  if (!res) {
    logger.error("resource not found or inactive", { resourceId })
    throw errors.new("resource not found")
  }
  const xpRaw = typeof res.metadata?.xp === "number" ? res.metadata?.xp : 0
  const thresholdMinutes = Math.ceil(xpRaw * 0.95)
  return { xp: xpRaw, thresholdMinutes }
}

async function checkTimeSpent(userId: string): Promise<void> {
  const actorId = buildActorId(userId)

  const [videoMeta, articleMeta] = await Promise.all([
    getXpAndThresholdMinutes(VIDEO_ID),
    getXpAndThresholdMinutes(ARTICLE_ID)
  ])

  const aggResult = await errors.try(
    getAggregatedTimeSpentByResource(actorId, [VIDEO_ID, ARTICLE_ID])
  )
  if (aggResult.error) {
    logger.error("failed to aggregate time spent", { error: aggResult.error })
    throw errors.wrap(aggResult.error, "aggregate time spent")
  }
  const timeMap = aggResult.data

  const secVideo = timeMap.get(VIDEO_ID) || 0
  const secArticle = timeMap.get(ARTICLE_ID) || 0
  const minVideo = secVideo > 0 ? Math.ceil(secVideo / 60) : 0
  const minArticle = secArticle > 0 ? Math.ceil(secArticle / 60) : 0

  const videoMeets = minVideo >= videoMeta.thresholdMinutes && videoMeta.xp > 0
  const articleMeets = minArticle >= articleMeta.thresholdMinutes && articleMeta.xp > 0

  const videoResultId = generateResultSourcedId(userId, VIDEO_ID, false)
  const articleResultId = generateResultSourcedId(userId, ARTICLE_ID, false)

  const [videoExisting, articleExisting] = await Promise.all([
    errors.try(oneroster.getResult(videoResultId)),
    errors.try(oneroster.getResult(articleResultId))
  ])
  if (videoExisting.error) {
    logger.error("failed to read existing result for video", { error: videoExisting.error, resultId: videoResultId })
    throw errors.wrap(videoExisting.error, "read existing video result")
  }
  if (articleExisting.error) {
    logger.error("failed to read existing result for article", { error: articleExisting.error, resultId: articleResultId })
    throw errors.wrap(articleExisting.error, "read existing article result")
  }

  const extractBank = (metadata: unknown) => {
    const meta = (metadata || {}) as Record<string, unknown>
    const xp = typeof meta.xp === "number" ? meta.xp : 0
    const reason = typeof meta.xpReason === "string" ? meta.xpReason : ""
    return { xp, reason }
  }

  const videoBank = extractBank(videoExisting.data?.metadata)
  const articleBank = extractBank(articleExisting.data?.metadata)

  logger.info("weathering-and-erosion bank check", {
    userId,
    resources: {
      video: {
        id: VIDEO_ID,
        xp: videoMeta.xp,
        thresholdMinutes: videoMeta.thresholdMinutes,
        seconds: secVideo,
        minutes: minVideo,
        meetsThreshold: videoMeets,
        existingResult: {
          sourcedId: videoResultId,
          bankedXp: videoBank.xp,
          reason: videoBank.reason
        }
      },
      article: {
        id: ARTICLE_ID,
        xp: articleMeta.xp,
        thresholdMinutes: articleMeta.thresholdMinutes,
        seconds: secArticle,
        minutes: minArticle,
        meetsThreshold: articleMeets,
        existingResult: {
          sourcedId: articleResultId,
          bankedXp: articleBank.xp,
          reason: articleBank.reason
        }
      }
    }
  })
}

async function main(): Promise<void> {
  const userId = process.argv[2]
  if (!userId) {
    logger.error("usage: bun run tsx scripts/check-banked-xp-for-weathering-erosion.ts <oneroster-user-sourced-id>")
    throw errors.new("missing user id")
  }
  await checkTimeSpent(userId)
}

const run = await errors.try(main())
if (run.error) {
  logger.error("operation failed", { error: run.error })
  process.exit(1)
}



