"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"
import { Card } from "@/app/(user)/profile/me/courses/components/card"
import { CourseSelector } from "@/components/course-selector-content"
import { OnboardingModal } from "@/components/onboarding-modal"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { setUserEnrollmentsByCourseId } from "@/lib/actions/courses"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { ProfileCourse } from "@/lib/types/domain"
import type { ProfileCoursesPageData } from "@/lib/types/page"

function CourseCardSkeleton() {
	return (
		<div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-full space-y-4">
			<div className="flex items-start justify-between">
				<Skeleton className="h-6 w-3/4" />
			</div>
			<div className="space-y-2">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
			</div>
			<div className="flex-1 space-y-3 relative">
				<div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
				{[...Array(3)].map((_, i) => (
					<div key={i} className="flex items-center space-x-3">
						<Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
						<Skeleton className="h-4 w-2/3" />
					</div>
				))}
			</div>
			<div className="flex justify-end">
				<Skeleton className="h-9 w-24" />
			</div>
		</div>
	)
}

function CourseGrid({ courses }: { courses: ProfileCourse[] }) {
	const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500"] as const

	if (courses.length === 0) {
		return (
			<div className="text-center py-12 text-gray-500">
				<h2 className="text-xl font-semibold mb-2">No courses yet!</h2>
				<p>Click "Edit Courses" to start your learning journey.</p>
			</div>
		)
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
			{courses.map((course, index) => {
				const colorIndex = index % colors.length
				const color = colors[colorIndex]
				if (!color) {
					throw errors.new("color selection failed")
				}
				if (!course.units) {
					throw errors.new("course units: missing required data")
				}
				return <Card key={course.id} course={course} units={course.units} />
			})}
		</div>
	)
}

export function Content({ coursesPromise }: { coursesPromise: Promise<ProfileCoursesPageData> }) {
	const { subjects, userCourses, needsSync } = React.use(coursesPromise)
	const [isModalOpen, setIsModalOpen] = React.useState(false)
	const [showOnboarding, setShowOnboarding] = React.useState(false)
	const { user, isLoaded } = useUser()
	const router = useRouter()

	// Show onboarding modal for new users with no courses
	React.useEffect(() => {
		if (!needsSync && userCourses.length === 0) {
			setShowOnboarding(true)
		}
	}, [needsSync, userCourses.length])

	// Monitor for sync completion
	React.useEffect(() => {
		if (!needsSync || !isLoaded || !user) return

		// Check if user now has sourceId (sync completed)
		const checkSyncStatus = () => {
			const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata || {})
			if (metadataValidation.success && metadataValidation.data.sourceId) {
				// Sync completed! Refresh the page to show enrollments
				router.refresh()
			}
		}

		// Set up polling to check for sync completion
		const interval = setInterval(checkSyncStatus, 1000) // Check every second

		// Also check immediately in case sync already completed
		checkSyncStatus()

		// Clean up interval after 30 seconds (timeout)
		const timeout = setTimeout(() => {
			clearInterval(interval)
			// If still no sourceId after 30s, something went wrong
			const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata || {})
			if (!metadataValidation.success || !metadataValidation.data.sourceId) {
				toast.error("Account sync is taking longer than expected. Please refresh the page.")
			}
		}, 30000)

		return () => {
			clearInterval(interval)
			clearTimeout(timeout)
		}
	}, [needsSync, isLoaded, user, router])

	const handleCourseSelection = async (selectedCourseIds: string[]) => {
		const initialCourseIds = userCourses.map((course) => course.id)
		const initialSet = new Set(initialCourseIds)
		const selectedSet = new Set(selectedCourseIds)
		const hasChanges = initialSet.size !== selectedSet.size || ![...initialSet].every((id) => selectedSet.has(id))

		if (!hasChanges) {
			setIsModalOpen(false)
			return
		}

		const promise = setUserEnrollmentsByCourseId(selectedCourseIds)
		toast.promise(promise, {
			loading: "Saving your courses...",
			success: "Courses saved successfully!",
			error: "Failed to save courses."
		})

		const result = await errors.try(promise)
		if (result.error) {
			return
		}

		setIsModalOpen(false)
	}

	const handleOnboardingComplete = () => {
		setShowOnboarding(false)
		// Open course selector to help them get started
		setIsModalOpen(true)
	}

	// Show skeleton while syncing
	if (needsSync && isLoaded) {
		return (
			<>
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-bold text-gray-800">My courses</h1>
					<Skeleton className="h-9 w-24" />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<CourseCardSkeleton />
					<CourseCardSkeleton />
				</div>
			</>
		)
	}

	return (
		<>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-gray-800">My courses</h1>
				<Button
					onClick={() => setIsModalOpen(true)}
					variant="outline"
					className="bg-blue-600 hover:bg-blue-700 text-white hover:text-white font-medium px-4 border-blue-600 hover:border-blue-600 hover:outline hover:outline-2 hover:outline-blue-600 hover:outline-offset-2 transition-all"
				>
					Edit Courses
				</Button>
			</div>

			<CourseGrid courses={userCourses} />

			<OnboardingModal show={showOnboarding} onComplete={handleOnboardingComplete} />

			<CourseSelector
				subjects={subjects}
				open={isModalOpen}
				onOpenChange={setIsModalOpen}
				onComplete={handleCourseSelection}
				initialSelectedCourseIds={userCourses.map((course) => course.id)}
			/>
		</>
	)
}
