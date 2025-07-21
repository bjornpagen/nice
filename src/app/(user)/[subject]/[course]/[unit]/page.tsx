import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { type AssessmentProgress, getUserUnitProgress } from "@/lib/data/progress"
import { fetchUnitPageData } from "@/lib/data/unit"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import type { UnitPageData } from "@/lib/types/page"
import { Content } from "./components/content"

export default async function UnitPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string }>
}) {
	const user = await currentUser()
	const unitDataPromise: Promise<UnitPageData> = params.then(fetchUnitPageData)

	const progressPromise: Promise<Map<string, AssessmentProgress>> = unitDataPromise.then((unitData) => {
		if (user) {
			const publicMetadataResult = errors.trySync(() => parseUserPublicMetadata(user.publicMetadata))
			if (publicMetadataResult.error) {
				logger.warn("invalid user public metadata, cannot fetch progress", {
					userId: user.id,
					error: publicMetadataResult.error
				})
				return new Map<string, AssessmentProgress>()
			}
			if (publicMetadataResult.data.sourceId) {
				return getUserUnitProgress(publicMetadataResult.data.sourceId, unitData.course.id)
			}
		}
		return new Map<string, AssessmentProgress>()
	})

	return (
		<React.Suspense fallback={<div className="p-8">Loading unit...</div>}>
			<Content dataPromise={unitDataPromise} progressPromise={progressPromise} />
		</React.Suspense>
	)
}
