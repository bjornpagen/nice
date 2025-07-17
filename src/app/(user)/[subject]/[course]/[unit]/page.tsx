import { currentUser } from "@clerk/nextjs/server"
import * as React from "react"
import { type AssessmentProgress, getUserUnitProgress } from "@/lib/data/progress"
import { fetchUnitPageData } from "@/lib/data/unit"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
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
		if (user?.publicMetadata) {
			const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
			if (metadataValidation.success && metadataValidation.data.sourceId) {
				return getUserUnitProgress(metadataValidation.data.sourceId, unitData.course.id)
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
