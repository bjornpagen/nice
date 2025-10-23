import * as errors from "@superbuilders/errors"
import { inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { type Events, inngest } from "@/inngest/client"
import { HARDCODED_SUPPLEMENTARY_SCIENCE_ARTICLE_SLUGS } from "@/lib/constants/course-mapping"

export const orchestrateHardcodedArticleSlugsStimulusMigration = inngest.createFunction(
  {
    id: "orchestrate-hardcoded-article-slugs-stimulus-migration",
    name: "Orchestrate Hardcoded Article Slugs Perseus to QTI Stimulus Migration"
  },
  { event: "migration/hardcoded.article-slugs.stimuli.perseus-to-qti" },
  async ({ logger }) => {
    const slugs = [...HARDCODED_SUPPLEMENTARY_SCIENCE_ARTICLE_SLUGS]
    logger.info("dispatching stimulus migrations for hardcoded article slugs", { slugCount: slugs.length })

    if (slugs.length === 0) {
      logger.info("no article slugs provided, skipping")
      return { status: "complete", slugCount: 0, articlesFound: 0, stimuliDispatched: 0 }
    }

    // 1) Resolve article IDs from slugs
    const articlesResult = await errors.try(
      db
        .select({ id: schema.niceArticles.id, slug: schema.niceArticles.slug })
        .from(schema.niceArticles)
        .where(inArray(schema.niceArticles.slug, slugs))
    )
    if (articlesResult.error) {
      logger.error("db query for articles by slug failed", { error: articlesResult.error })
      throw errors.wrap(articlesResult.error, "db query for articles by slug")
    }

    const foundArticleIds = articlesResult.data.map((a) => a.id)
    const foundSlugs = new Set(articlesResult.data.map((a) => a.slug))
    const missingSlugs = slugs.filter((s) => !foundSlugs.has(s))

    if (missingSlugs.length > 0) {
      logger.warn?.("some article slugs not found", { count: missingSlugs.length, slugs: missingSlugs })
    }

    if (foundArticleIds.length === 0) {
      logger.info("no articles found for provided slugs, skipping migration dispatch")
      return { status: "complete", slugCount: slugs.length, articlesFound: 0, stimuliDispatched: 0 }
    }

    // 2) Build and send per-article stimulus migration events in batches
    const stimulusEvents: Events["qti/stimulus.migrate"][] = foundArticleIds.map((articleId) => ({
      name: "qti/stimulus.migrate",
      data: { articleId }
    }))

    const BATCH_SIZE = 500
    for (let i = 0; i < stimulusEvents.length; i += BATCH_SIZE) {
      const batch = stimulusEvents.slice(i, i + BATCH_SIZE)
      const sendResult = await errors.try(inngest.send(batch))
      if (sendResult.error) {
        logger.error("failed to send stimulus migration event batch", { error: sendResult.error })
        throw errors.wrap(sendResult.error, "inngest batch send")
      }
      logger.debug("sent stimulus migration event batch", { batchNumber: i / BATCH_SIZE + 1, size: batch.length })
    }

    logger.info("successfully dispatched stimulus migrations for article slugs", {
      stimuliDispatched: stimulusEvents.length,
      articlesFound: foundArticleIds.length
    })

    return {
      status: "complete",
      slugCount: slugs.length,
      articlesFound: foundArticleIds.length,
      stimuliDispatched: stimulusEvents.length
    }
  }
)


