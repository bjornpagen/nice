import * as React from "react"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { currentUser } from "@clerk/nextjs/server"
import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs"
import { getAllResources, getAllCoursesBySlug } from "@/lib/data/fetchers/oneroster"
import { caseApi } from "@/lib/clients"
import { redis } from "@/lib/redis"
import { Content } from "@/app/(admin)/course-builder/content"
import { Header } from "@/components/header"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

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
    const resourcesPromise: Promise<ExplorerResource[]> = getAllResources().then(async (resources) => {
        // Build allowlist of course slugs: must be active and NOT custom
        const uniqueSlugs = new Set<string>()
        for (const r of resources) {
            const md = (r.metadata ?? {}) as Record<string, unknown>
            const path = typeof md.path === "string" ? md.path : undefined
            if (!path) continue
            const parts = path.split("/").filter(Boolean)
            // path: /<subjectSlug>/<courseSlug>/...
            const slug = parts[1]
            if (slug) uniqueSlugs.add(slug)
        }

        const allowSlugs = new Set<string>()
        await Promise.all(
            Array.from(uniqueSlugs).map(async (slug) => {
                const res = await errors.try(getAllCoursesBySlug(slug))
                if (res.error) {
                    logger.debug("courses by slug fetch failed", { slug, error: res.error })
                    return
                }
                const course = res.data?.[0]
                if (!course) {
                    // No active course for this slug (likely tobedeleted) → exclude
                    return
                }
                const meta = (course.metadata ?? {}) as Record<string, unknown>
                const isCustom = meta.custom === true || meta.custom === "true"
                if (!isCustom) allowSlugs.add(slug)
            })
        )

        return resources.filter((r) => {
            const md = (r.metadata ?? {}) as Record<string, unknown>
            const path = typeof md.path === "string" ? md.path : undefined
            if (!path) return true
            const parts = path.split("/").filter(Boolean)
            const slug = parts[1]
            if (!slug) return true
            return allowSlugs.has(slug)
        })
    })

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
        <div className="flex flex-col h-screen bg-white">
            <div className="flex-shrink-0 z-50">
                <React.Suspense fallback={<Header dark />}>
                    <ClerkLoaded>
                        <UserHeader />
                    </ClerkLoaded>
                    <ClerkLoading>
                        <Header dark />
                    </ClerkLoading>
                </React.Suspense>
            </div>
            <div className="flex-1 overflow-hidden">
                <React.Suspense fallback={<div>Loading resources…</div>}>
                    <Content resourcesPromise={resourcesPromise} caseMapPromise={caseMapPromise} />
                </React.Suspense>
            </div>
        </div>
    )
}

async function UserHeader() {
    const user = await currentUser()

    if (!user) {
        logger.info("user not authenticated, showing default header")
        return <Header dark />
    }

    if (!user.publicMetadata) {
        logger.info("user metadata not yet available", { userId: user.id })
        return <Header dark />
    }

    const validationResult = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
    if (!validationResult.success) {
        logger.warn("invalid user metadata structure, showing default header", {
            userId: user.id,
            error: validationResult.error
        })
        return <Header dark />
    }

    const { nickname } = validationResult.data

    return <Header dark nickname={nickname} />
}


