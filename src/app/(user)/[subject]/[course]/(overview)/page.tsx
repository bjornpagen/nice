import { requireUser } from "@/lib/auth/require-user"
import * as logger from "@superbuilders/slog"
import { connection } from "next/server"
import * as React from "react"
import { getCachedCoursePageData } from "@/lib/oneroster/react/course-data"
import { type AssessmentProgress, type UnitProficiency } from "@/lib/data/progress"
import { getCachedUserUnitProgress } from "@/lib/progress/react/user-progress"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { CoursePageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"
import { aggregateUnitProficiencies } from "@/lib/utils/progress"
import { Content } from "./components/content"

// Enhanced progress data that includes both individual and aggregated progress
export interface CourseProgressData {
	progressMap: Map<string, AssessmentProgress>
	unitProficiencies: UnitProficiency[]
}

// Force dynamic rendering to prevent prerendering issues with currentUser() and OneRoster API calls
export default async function CoursePage({ params }: { params: Promise<{ subject: string; course: string }> }) {
	// Opt into dynamic rendering to ensure external fetches occur during request lifecycle
	await connection()
	// Normalize params to handle encoded characters
	const normalizedParamsPromise = normalizeParams(params)

	// The courseDataPromise is now handled by the layout, but we still need it for progress data
	const courseDataPromise: Promise<CoursePageData> = normalizedParamsPromise.then((resolvedParams) =>
		getCachedCoursePageData(resolvedParams.subject, resolvedParams.course, false)
	)

	// Get user promise for progress fetching
const userPromise = requireUser()

const canUnlockAllPromise: Promise<boolean> = userPromise.then((user) => {
    const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata ?? {})
		if (!parsed.success) {
			logger.warn("invalid user public metadata for unlock check", { userId: user.id, error: parsed.error })
			return false
		}
		// A user can unlock content if they have any role other than 'student'
		return parsed.data.roles.some((r) => r.role !== "student")
	})

const progressPromise: Promise<CourseProgressData> = Promise.all([courseDataPromise, userPromise]).then(
    ([courseData, user]) => {
        const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
        if (!parsed.success) {
            logger.warn("invalid user public metadata, cannot fetch progress", {
                userId: user.id,
                error: parsed.error
            })
            return { progressMap: new Map<string, AssessmentProgress>(), unitProficiencies: [] }
        }
        if (parsed.data.sourceId) {
            return getCachedUserUnitProgress(parsed.data.sourceId, courseData.course.id).then((progressMap) => {
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
        return { progressMap: new Map<string, AssessmentProgress>(), unitProficiencies: [] }
    }
)

	return (
		<React.Suspense>
			<Content
				dataPromise={courseDataPromise}
				progressPromise={progressPromise}
				canUnlockAllPromise={canUnlockAllPromise}
			/>
		</React.Suspense>
	)
}
