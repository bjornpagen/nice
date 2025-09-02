import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { niceArticles, niceExercises, niceVideos } from "@/db/schemas"

interface LinkInfo {
  full: string
  type: "a" | "e" | "v"
  slug: string
}

/**
 * Resolve relative hrefs in QTI stimulus XML to absolute canonical URLs using DB paths.
 *
 * Rules:
 * - Only rewrites anchors with hrefs that are relative (start with "/")
 * - Expects the last two segments to be: /{type}/{slug} where type in {a,e,v}
 * - Looks up canonical path for the resource by (type, slug) and replaces href with https://nice.academy{path}
 * - If any such relative link cannot be resolved, the function logs and throws to prevent silent fallbacks
 */
export async function resolveRelativeLinksToCanonicalDomain(
  xml: string,
  slog: logger.Logger
): Promise<string> {
  // Collect candidate links first to batch DB queries
  const linkRegex = /href="(?<url>\/(?:[^"#?]*))"/g
  const candidates: LinkInfo[] = []

  // Use matchAll for robust iteration across entire XML
  const matches = Array.from(xml.matchAll(linkRegex))
  for (const m of matches) {
    const url = m.groups?.url ?? ""
    if (!url || url.startsWith("http://") || url.startsWith("https://")) continue
    // Split by "/", ignoring empty leading segment
    const parts = url.split("/").filter((p) => p !== "")
    if (parts.length < 2) continue
    const slug = parts[parts.length - 1] ?? ""
    const typeSegment = parts[parts.length - 2] ?? ""
    if (typeSegment !== "a" && typeSegment !== "e" && typeSegment !== "v") continue
    if (slug === "") continue
    candidates.push({ full: url, type: typeSegment, slug })
  }

  if (candidates.length === 0) return xml

  slog.debug("resolving relative links to canonical domain", {
    count: candidates.length
  })

  // Build unique slug sets per type
  const articleSlugs = Array.from(new Set(candidates.filter((c) => c.type === "a").map((c) => c.slug)))
  const videoSlugs = Array.from(new Set(candidates.filter((c) => c.type === "v").map((c) => c.slug)))
  const exerciseSlugs = Array.from(new Set(candidates.filter((c) => c.type === "e").map((c) => c.slug)))

  // Fetch canonical paths in parallel
  const [articlesRes, videosRes, exercisesRes] = await Promise.all([
    articleSlugs.length > 0
      ? errors.try(
          db
            .select({ slug: niceArticles.slug, path: niceArticles.path })
            .from(niceArticles)
            .where(inArray(niceArticles.slug, articleSlugs))
        )
      : ({ data: [], error: null } as const),
    videoSlugs.length > 0
      ? errors.try(
          db
            .select({ slug: niceVideos.slug, path: niceVideos.path })
            .from(niceVideos)
            .where(inArray(niceVideos.slug, videoSlugs))
        )
      : ({ data: [], error: null } as const),
    exerciseSlugs.length > 0
      ? errors.try(
          db
            .select({ slug: niceExercises.slug, path: niceExercises.path })
            .from(niceExercises)
            .where(inArray(niceExercises.slug, exerciseSlugs))
        )
      : ({ data: [], error: null } as const)
  ])

  if ("error" in articlesRes && articlesRes.error) {
    slog.error("db query for articles by slug failed", { error: articlesRes.error })
    throw errors.wrap(articlesRes.error, "query articles by slug")
  }
  if ("error" in videosRes && videosRes.error) {
    slog.error("db query for videos by slug failed", { error: videosRes.error })
    throw errors.wrap(videosRes.error, "query videos by slug")
  }
  if ("error" in exercisesRes && exercisesRes.error) {
    slog.error("db query for exercises by slug failed", { error: exercisesRes.error })
    throw errors.wrap(exercisesRes.error, "query exercises by slug")
  }

  const articleMap = new Map<string, string>()
  for (const row of (articlesRes as any).data as Array<{ slug: string; path: string }>) {
    articleMap.set(row.slug, row.path)
  }
  const videoMap = new Map<string, string>()
  for (const row of (videosRes as any).data as Array<{ slug: string; path: string }>) {
    videoMap.set(row.slug, row.path)
  }
  const exerciseMap = new Map<string, string>()
  for (const row of (exercisesRes as any).data as Array<{ slug: string; path: string }>) {
    exerciseMap.set(row.slug, row.path)
  }

  // Verify all candidates are resolvable
  for (const c of candidates) {
    let found = false
    if (c.type === "a") found = articleMap.has(c.slug)
    if (c.type === "v") found = videoMap.has(c.slug)
    if (c.type === "e") found = exerciseMap.has(c.slug)
    if (!found) {
      slog.error("relative link could not be resolved by type+slug", { url: c.full, type: c.type, slug: c.slug })
      throw errors.new("unresolvable relative link")
    }
  }

  // Rewrite hrefs
  const rewrittenXml = xml.replace(/href="(\/[^"#?]*)"/g, (_match, url: string) => {
    // Skip absolute URLs
    if (url.startsWith("http://") || url.startsWith("https://")) return `href="${url}"`
    const parts = url.split("/").filter((p: string) => p !== "")
    if (parts.length < 2) return `href="${url}"`
    const slug = parts[parts.length - 1] ?? ""
    const typeSegment = parts[parts.length - 2] ?? ""
    let canonicalPath = ""
    if (typeSegment === "a") canonicalPath = articleMap.get(slug) ?? ""
    else if (typeSegment === "v") canonicalPath = videoMap.get(slug) ?? ""
    else if (typeSegment === "e") canonicalPath = exerciseMap.get(slug) ?? ""
    if (canonicalPath === "") return `href="${url}"`
    return `href="https://nice.academy${canonicalPath}"`
  })

  slog.debug("resolved relative links to canonical domain", {
    totalCandidates: candidates.length
  })

  return rewrittenXml
}


