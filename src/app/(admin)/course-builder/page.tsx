import * as React from "react"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { getAllResources } from "@/lib/data/fetchers/oneroster"
import { caseApi } from "@/lib/clients"
import { redis } from "@/lib/redis"
import { Content } from "@/app/(admin)/course-builder/content"

export type ExplorerResource = Awaited<ReturnType<typeof getAllResources>>[number]

// Helper to get CASE humanCodingScheme with Redis caching
async function getCaseHumanCodingScheme(id: string): Promise<string | null> {
    const cacheKey = `case:hcs:${id}`

    // Try to get from cache first
    const cachedResult = await errors.try(redis.get(cacheKey))
    if (!cachedResult.error && cachedResult.data) {
        return cachedResult.data
    }

    // Not in cache, fetch from API
    const itemResult = await errors.try(
        caseApi.getCFItem(id, { fields: "humanCodingScheme" })
    )
    if (itemResult.error) {
        // Log but don't throw - this is best-effort
        logger.debug("failed to fetch CASE item", { id, error: itemResult.error })
        return null
    }

    const item = itemResult.data
    const hcs = (item && typeof item.humanCodingScheme === "string") ? item.humanCodingScheme : null

    // Cache the result if we got a value (cache for 7 days)
    if (hcs) {
        const cacheResult = await errors.try(redis.set(cacheKey, hcs, { EX: 604800 }))
        if (cacheResult.error) {
            logger.debug("failed to cache CASE humanCodingScheme", { id, error: cacheResult.error })
        }
    }

    return hcs
}

export default function CourseBuilderPage() {
    const resourcesPromise = getAllResources()

    const caseMapPromise: Promise<Record<string, string>> = resourcesPromise
        .then((resources) => {
            const ids = new Set<string>()
            for (const r of resources) {
                const md = (r.metadata ?? {}) as Record<string, unknown>
                const los = md.learningObjectiveSet as
                    | Array<{ source: string; learningObjectiveIds: string[] }>
                    | undefined
                if (!Array.isArray(los)) continue
                for (const lo of los) {
                    if (lo && lo.source === "CASE" && Array.isArray(lo.learningObjectiveIds)) {
                        for (const id of lo.learningObjectiveIds) {
                            if (typeof id === "string" && id.length > 0) ids.add(id)
                        }
                    }
                }
            }
            return Array.from(ids)
        })
        .then((uniqueIds) =>
            Promise.all(
                uniqueIds.map(async (id) => {
                    const hcs = await getCaseHumanCodingScheme(id)
                    return [id, hcs] as const
                })
            ).then((pairs) => {
                const map: Record<string, string> = {}
                for (const [id, hcs] of pairs) {
                    if (hcs) map[id] = hcs
                }
                return map
            })
        )

    return (
        <React.Suspense fallback={<div>Loading resources…</div>}>
            <Content resourcesPromise={resourcesPromise} caseMapPromise={caseMapPromise} />
        </React.Suspense>
    )
}


