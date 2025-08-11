import { currentUser } from "@clerk/nextjs/server"
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
	storageKey
}: {
	children: React.ReactNode
	resourceLockStatusPromise: Promise<Record<string, boolean>>
	storageKey: string
}) {
	const initialLockStatus = React.use(resourceLockStatusPromise)
	return (
		<CourseLockStatusProvider initialLockStatus={initialLockStatus} storageKey={storageKey}>
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
		fetchCoursePageData(resolvedParams, { skip: { questions: true } })
	)

	const userPromise = currentUser()

	// Fetch progress data for lock status calculation
	const progressPromise: Promise<Map<string, AssessmentProgress>> = Promise.all([courseDataPromise, userPromise]).then(
		([courseData, user]) => {
			if (user) {
				const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
				if (parsed.success && parsed.data.sourceId) {
					return getUserUnitProgress(parsed.data.sourceId, courseData.course.id)
				}
			}
			return new Map<string, AssessmentProgress>()
		}
	)

	// Calculate the lock status for all resources in the course
	const resourceLockStatusPromise: Promise<Record<string, boolean>> = Promise.all([
		courseDataPromise,
		progressPromise,
		userPromise
	]).then(([courseData, progressData, user]) => {
		const lockingEnabled = Boolean(user)
		return buildResourceLockStatus(courseData.course, progressData, lockingEnabled)
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
			>
				{children}
			</CourseLockStatusWrapper>
		</React.Suspense>
	)
}
