import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import { getAllResources } from "@/lib/data/fetchers/oneroster"

type MinimalMeta = {
  type?: unknown
  khanActivityType?: unknown
  xp?: unknown
  khanSlug?: unknown
}

async function main(): Promise<void> {
  const titleTarget = "weathering and erosion"

  const resourcesResult = await errors.try(getAllResources())
  if (resourcesResult.error) {
    logger.error("failed to fetch resources", { error: resourcesResult.error })
    throw errors.wrap(resourcesResult.error, "get resources")
  }

  const all = resourcesResult.data
  const matching = all.filter((r) => {
    const title = typeof r.title === "string" ? r.title.toLowerCase().trim() : ""
    return title === titleTarget
  })

  if (matching.length === 0) {
    logger.info("no resources matched title", { title: titleTarget })
    return
  }

  const isInteractiveVideo = (meta: MinimalMeta | undefined): boolean => {
    if (!meta || typeof meta !== "object") return false
    const t = (meta as Record<string, unknown>).type
    const a = (meta as Record<string, unknown>).khanActivityType
    return t === "interactive" && a === "Video"
  }

  const isInteractiveArticle = (meta: MinimalMeta | undefined): boolean => {
    if (!meta || typeof meta !== "object") return false
    const t = (meta as Record<string, unknown>).type
    const a = (meta as Record<string, unknown>).khanActivityType
    return t === "interactive" && a === "Article"
  }

  const videos = matching.filter((r) => isInteractiveVideo(r.metadata as MinimalMeta | undefined))
  const articles = matching.filter((r) => isInteractiveArticle(r.metadata as MinimalMeta | undefined))

  const summarize = (items: typeof matching) =>
    items.map((r) => {
      const meta = (r.metadata || {}) as Record<string, unknown>
      return {
        sourcedId: r.sourcedId,
        title: r.title,
        metadata: {
          type: meta.type,
          khanActivityType: meta.khanActivityType,
          xp: meta.xp,
          khanSlug: meta.khanSlug
        }
      }
    })

  logger.info("weathering and erosion resources", {
    title: titleTarget,
    videoCount: videos.length,
    articleCount: articles.length,
    videos: summarize(videos),
    articles: summarize(articles)
  })
}

const run = await errors.try(main())
if (run.error) {
  logger.error("operation failed", { error: run.error })
  process.exit(1)
}


