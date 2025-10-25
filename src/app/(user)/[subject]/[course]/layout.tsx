import { requireUser } from "@/lib/auth/require-user"
import * as React from "react"
import { CourseLockStatusProvider } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { fetchCoursePageData } from "@/lib/data/course"
import { type AssessmentProgress, getUserUnitProgress } from "@/lib/data/progress"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import { buildResourceLockStatus, normalizeParams } from "@/lib/utils"

// Wrapper component to consume the lock status promise and provide it to context
function CourseLockStatusWrapper({
	children,
	resourceLockStatusPromise,
	storageKey,
	canUnlockAll
}: {
	children: React.ReactNode
	resourceLockStatusPromise: Promise<Record<string, boolean>>
	storageKey: string
	canUnlockAll: boolean
}) {
	const initialLockStatus = React.use(resourceLockStatusPromise)
	return (
		<CourseLockStatusProvider initialLockStatus={initialLockStatus} storageKey={storageKey} canUnlockAll={canUnlockAll}>
			{children}
		</CourseLockStatusProvider>
	)
}

// Course-wide layout that provides lock status context for both overview and practice pages
export default function CourseLayout({
	params,
	children
}: {
	params: Promise<{ subject: string; course: string }>
	children: React.ReactNode
}) {
	// Normalize params to handle encoded characters
	const normalizedParamsPromise = normalizeParams(params)

	// Fetch course data for lock status calculation
const courseDataPromise = normalizedParamsPromise.then((resolvedParams) =>
	fetchCoursePageData(resolvedParams, { skipQuestions: true })
)

	const userPromise = requireUser()

	// Fetch progress data for lock status calculation
	const progressPromise: Promise<Map<string, AssessmentProgress>> = Promise.all([courseDataPromise, userPromise]).then(
		([courseData, user]) => {
			const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
			if (parsed.success && parsed.data.sourceId) {
				return getUserUnitProgress(parsed.data.sourceId, courseData.course.id)
			}
			return new Map<string, AssessmentProgress>()
		}
	)

	// Calculate the lock status for all resources in the course
	const resourceLockStatusPromise: Promise<Record<string, boolean>> = Promise.all([
		courseDataPromise,
		progressPromise
	]).then(([courseData, progressData]) => {
		return buildResourceLockStatus(courseData.course, progressData, true)
	})

	// Build a stable per-course storage key for persisting the unlock-all toggle in localStorage
	const storageKeyPromise: Promise<string> = courseDataPromise.then((courseData) => {
		// Example: nice_unlock_all_<courseId>
		return `nice_unlock_all_${courseData.course.id}`
	})

	return (
		<React.Suspense fallback={<div className="h-screen bg-gray-100 animate-pulse" />}>
			<CourseLockStatusWrapper
				resourceLockStatusPromise={resourceLockStatusPromise}
				storageKey={React.use(storageKeyPromise)}
			canUnlockAll={React.use(
				userPromise.then((user) => {
					const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
					return parsed.success && parsed.data.roles.some((r) => r.role !== "student")
				})
			)}
			>
				{children}
			</CourseLockStatusWrapper>
		</React.Suspense>
	)
}
