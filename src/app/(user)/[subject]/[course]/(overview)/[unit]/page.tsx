import { currentUser } from "@clerk/nextjs/server"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { Content } from "@/app/(user)/[subject]/[course]/(overview)/[unit]/components/content"
import { type AssessmentProgress, getUserUnitProgress } from "@/lib/data/progress"
import { fetchUnitPageData } from "@/lib/data/unit"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { UnitPageData } from "@/lib/types/page"
import { buildResourceLockStatus, normalizeParams } from "@/lib/utils"

// ✅ CORRECT: Non-async Server Component following RSC patterns
export default function UnitPage({ params }: { params: Promise<{ subject: string; course: string; unit: string }> }) {
	// Normalize params to handle encoded characters
	const normalizedParamsPromise = normalizeParams(params)

	// The sidebar data is now handled by the layout, but we still need unit-specific data
	const unitDataPromise: Promise<UnitPageData> = normalizedParamsPromise.then(fetchUnitPageData)

	// Get user promise for progress fetching
	const userPromise = currentUser()

	const progressPromise: Promise<Map<string, AssessmentProgress>> = Promise.all([unitDataPromise, userPromise]).then(
		([unitData, user]) => {
			if (user) {
				const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
				if (!parsed.success) {
					logger.warn("invalid user public metadata, cannot fetch progress", {
						userId: user.id,
						error: parsed.error
					})
					return new Map<string, AssessmentProgress>()
				}
				if (parsed.data.sourceId) {
					return getUserUnitProgress(parsed.data.sourceId, unitData.course.id)
				}
			}
			// For unauthenticated users or users without a sourceId, an empty map is acceptable.
			// This is not a fallback for an error state, but a valid state for the user.
			return new Map<string, AssessmentProgress>()
		}
	)

	const resourceLockStatusPromise: Promise<Record<string, boolean>> = Promise.all([
		unitDataPromise,
		progressPromise,
		userPromise
	]).then(([unitData, progress, user]) => {
		const lockingEnabled = Boolean(user)
		return buildResourceLockStatus(unitData.course, progress, lockingEnabled)
	})

	return (
		<React.Suspense>
			<Content
				dataPromise={unitDataPromise}
				progressPromise={progressPromise}
				resourceLockStatusPromise={resourceLockStatusPromise}
			/>
		</React.Suspense>
	)
}
