import * as logger from "@superbuilders/slog"
import type { NextRequest } from "next/server"

export function extractSubjectAndCourse(pathname: string): { subject: string; course: string } | null {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length < 2) return null
    const first = segments[0] ?? ""
    const RESERVED = new Set(["profile", "course-builder", "debug", "_guard"])
    if (!first || RESERVED.has(first)) return null
    return { subject: segments[0]!, course: segments[1]! }
}

export async function checkEnrollmentFromEdge(
    req: NextRequest,
    subject: string,
    course: string
): Promise<boolean> {
    const origin = req.nextUrl.origin
    const url = new URL("/api/internal/course-access", origin)
    url.searchParams.set("subject", subject)
    url.searchParams.set("course", course)

    const cookie = req.headers.get("cookie") ?? ""
    const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
            cookie
        }
    })
    if (!res.ok) {
        logger.warn("course access helper: api responded non-ok", { status: res.status })
        return false
    }
    const data = (await res.json()) as { allowed?: boolean }
    return data?.allowed === true
}


