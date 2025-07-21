import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type * as React from "react"
import { fetchLessonLayoutData } from "@/lib/data/lesson"
import { type AssessmentProgress, getUserUnitProgress } from "@/lib/data/progress"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import type { LessonLayoutData } from "@/lib/types/page"
import { LessonLayout } from "./components/lesson-layout"

// The layout component is NOT async. It orchestrates promises and renders immediately.
export default function Layout({
	params,
	children
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string }>
	children: React.ReactNode
}) {
	const dataPromise: Promise<LessonLayoutData> = params.then(fetchLessonLayoutData)
	const userPromise = currentUser()

	const progressPromise: Promise<Map<string, AssessmentProgress>> = Promise.all([userPromise, dataPromise]).then(
		([user, data]) => {
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
					return getUserUnitProgress(publicMetadataResult.data.sourceId, data.courseData.id)
				}
			}
			return new Map<string, AssessmentProgress>()
		}
	)

	return (
		<LessonLayout dataPromise={dataPromise} progressPromise={progressPromise}>
			{children}
		</LessonLayout>
	)
}
