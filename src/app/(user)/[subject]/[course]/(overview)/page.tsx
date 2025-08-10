import { currentUser } from "@clerk/nextjs/server"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchCoursePageData } from "@/lib/data/course"
import { type AssessmentProgress, getUserUnitProgress, type UnitProficiency } from "@/lib/data/progress"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { CoursePageData } from "@/lib/types/page"
import { buildResourceLockStatus, normalizeParams } from "@/lib/utils"
import { aggregateUnitProficiencies } from "@/lib/utils/progress"
import { Content } from "./components/content"

// Enhanced progress data that includes both individual and aggregated progress
export interface CourseProgressData {
	progressMap: Map<string, AssessmentProgress>
	unitProficiencies: UnitProficiency[]
}

// ✅ CORRECT: Non-async Server Component following RSC patterns
export default function CoursePage({ params }: { params: Promise<{ subject: string; course: string }> }) {
	// Normalize params to handle encoded characters
	const normalizedParamsPromise = normalizeParams(params)

	// The courseDataPromise is now handled by the layout, but we still need it for progress data
	const courseDataPromise: Promise<CoursePageData> = normalizedParamsPromise.then(fetchCoursePageData)

	// Get user promise for progress fetching
	const userPromise = currentUser()

	const progressPromise: Promise<CourseProgressData> = Promise.all([courseDataPromise, userPromise]).then(
		([courseData, user]) => {
			if (user) {
				const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
				if (!parsed.success) {
					logger.warn("invalid user public metadata, cannot fetch progress", {
						userId: user.id,
						error: parsed.error
					})
					return { progressMap: new Map<string, AssessmentProgress>(), unitProficiencies: [] }
				}
				if (parsed.data.sourceId) {
					return getUserUnitProgress(parsed.data.sourceId, courseData.course.id).then((progressMap) => {
						// Aggregate individual progress into unit proficiencies
						const unitProficiencies = aggregateUnitProficiencies(progressMap, courseData.course.units)

						logger.debug("calculated unit proficiencies for course overview", {
							courseId: courseData.course.id,
							unitCount: courseData.course.units.length,
							proficiencies: unitProficiencies.map((up) => ({
								unitId: up.unitId,
								percentage: up.proficiencyPercentage
							}))
						})

						return { progressMap, unitProficiencies }
					})
				}
			}
			return { progressMap: new Map<string, AssessmentProgress>(), unitProficiencies: [] }
		}
	)

	const resourceLockStatusPromise: Promise<Record<string, boolean>> = Promise.all([
		courseDataPromise,
		progressPromise,
		userPromise
	]).then(([courseData, progressData, user]) => {
		const lockingEnabled = Boolean(user)
		return buildResourceLockStatus(courseData.course, progressData.progressMap, lockingEnabled)
	})

	return (
		<React.Suspense>
			<Content
				dataPromise={courseDataPromise}
				progressPromise={progressPromise}
				resourceLockStatusPromise={resourceLockStatusPromise}
			/>
		</React.Suspense>
	)
}
