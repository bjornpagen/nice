import { requireUser } from "@/lib/auth/require-user"
import * as logger from "@superbuilders/slog"
import { connection } from "next/server"
import * as React from "react"
import { Content } from "@/app/(user)/[subject]/[course]/(overview)/[unit]/components/content"
import { type AssessmentProgress } from "@/lib/data/progress"
import { getCachedUserUnitProgress } from "@/lib/server-cache/progress"
import { getCachedUnitPageData } from "@/lib/server-cache/course-data"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { UnitPageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"

// Force dynamic rendering to prevent prerendering issues with currentUser() and OneRoster API calls
export default async function UnitPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string }>
}) {
	// Opt into dynamic rendering to ensure external fetches occur during request lifecycle
	await connection()
	// Normalize params to handle encoded characters
	const normalizedParamsPromise = normalizeParams(params)

	// The sidebar data is now handled by the layout, but we still need unit-specific data
	const unitDataPromise: Promise<UnitPageData> = normalizedParamsPromise.then((resolvedParams) =>
		getCachedUnitPageData(resolvedParams.subject, resolvedParams.course, resolvedParams.unit)
	)

	// Get user promise for progress fetching
const userPromise = requireUser()

const canUnlockAllPromise: Promise<boolean> = userPromise.then((user) => {
    const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata ?? {})
		if (!parsed.success) {
			logger.warn("invalid user public metadata for unlock check", {
				userId: user.id,
				error: parsed.error
			})
			return false
		}
		// A user can unlock content if they have any role other than 'student'
		return parsed.data.roles.some((r) => r.role !== "student")
	})

const progressPromise: Promise<Map<string, AssessmentProgress>> = Promise.all([unitDataPromise, userPromise]).then(
    ([unitData, user]) => {
        const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
        if (!parsed.success) {
            logger.warn("invalid user public metadata, cannot fetch progress", {
                userId: user.id,
                error: parsed.error
            })
            return new Map<string, AssessmentProgress>()
        }
        if (parsed.data.sourceId) {
            return getCachedUserUnitProgress(parsed.data.sourceId, unitData.course.id)
        }
        return new Map<string, AssessmentProgress>()
    }
)

	return (
		<React.Suspense>
			<Content
				dataPromise={unitDataPromise}
				progressPromise={progressPromise}
				canUnlockAllPromise={canUnlockAllPromise}
			/>
		</React.Suspense>
	)
}
