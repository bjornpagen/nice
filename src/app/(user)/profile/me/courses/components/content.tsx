"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { CourseSelector } from "@/components/course-selector-content"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { dialogKeys, useDialogManager } from "@/hooks/use-dialog-manager"
import { saveUserCourses } from "@/lib/actions/courses"
import type { ProfileCoursesPageData } from "@/lib/types/page"
import type { ProfileCourse, ProfileSubject } from "@/lib/types/profile"
import { CourseCard } from "./course-card"

// Enhanced loading skeleton for course cards
function CourseCardSkeleton() {
	return (
		<div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-full space-y-4">
			{/* Header skeleton */}
			<div className="flex items-start justify-between">
				<Skeleton className="h-6 w-3/4" />
				<Skeleton className="h-4 w-16" />
			</div>

			{/* Description skeleton */}
			<div className="space-y-2">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
				<Skeleton className="h-4 w-4/6" />
			</div>

			{/* Units skeleton */}
			<div className="flex-1 space-y-3 relative">
				<div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
				{[...Array(3)].map((_, i) => (
					<div key={i} className="flex items-center space-x-3">
						<Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
						<Skeleton className="h-4 w-2/3" />
					</div>
				))}
			</div>

			{/* Button skeleton */}
			<div className="flex justify-end">
				<Skeleton className="h-9 w-16" />
			</div>
		</div>
	)
}

// Course grid with its own suspense boundary
function CourseGrid({ coursesPromise }: { coursesPromise: Promise<ProfileCourse[]> }) {
	const courses = React.use(coursesPromise)

	// Define colors for course cards
	const colors = [
		"bg-blue-500",
		"bg-green-500",
		"bg-purple-500",
		"bg-orange-500",
		"bg-pink-500",
		"bg-teal-500",
		"bg-indigo-500",
		"bg-red-500"
	] as const

	if (courses.length === 0) {
		return (
			<div className="text-center py-12">
				<div className="text-gray-500 text-lg mb-4">No courses enrolled yet</div>
				<div className="text-gray-400 text-sm">Click "Edit Courses" to get started!</div>
			</div>
		)
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
			{courses.map((course, index) => {
				const color = colors[index % colors.length]
				if (!color) {
					throw errors.new("color calculation failed, this should be unreachable")
				}
				return <CourseCard key={course.id} course={course} units={course.units} color={color} />
			})}
		</div>
	)
}

// Course selector with lazy loading
function LazyCourseSelectorContent({
	allSubjectsPromise,
	coursesPromise,
	isOpen,
	onOpenChange,
	onComplete
}: {
	allSubjectsPromise: Promise<ProfileSubject[]>
	coursesPromise: Promise<ProfileCourse[]>
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onComplete: (selectedIds: string[]) => Promise<void>
}) {
	// Only resolve promises when modal is actually opened
	if (!isOpen) {
		return (
			<CourseSelector
				subjects={[]}
				open={false}
				onOpenChange={onOpenChange}
				onComplete={onComplete}
				initialSelectedCourseIds={[]}
			/>
		)
	}

	const subjectsWithCourses = React.use(allSubjectsPromise)
	const courses = React.use(coursesPromise)

	return (
		<CourseSelector
			subjects={subjectsWithCourses}
			open={isOpen}
			onOpenChange={onOpenChange}
			onComplete={onComplete}
			initialSelectedCourseIds={courses.map((course) => course.id)}
		/>
	)
}

export function Content({ coursesPromise }: { coursesPromise: Promise<ProfileCoursesPageData> }) {
	const { openDialog, shouldShow, closeDialog, activeDialog } = useDialogManager()
	const [hasShownOnboarding, setHasShownOnboarding] = React.useState(false)

	// Create new promises for userCourses and allSubjects from the main promise
	const userCoursesPromise = React.useMemo(() => coursesPromise.then((data) => data.userCourses), [coursesPromise])
	const allSubjectsPromise = React.useMemo(() => coursesPromise.then((data) => data.subjects), [coursesPromise])

	// Handle onboarding for new users (will be resolved by the CourseGrid suspense)
	React.useEffect(() => {
		// This will trigger when CourseGrid resolves and shows 0 courses
		const checkNewUser = async () => {
			const result = await errors.try(userCoursesPromise)
			if (result.error) {
				// Handle error silently - CourseGrid will show the error
				return
			}

			const courses = result.data
			if (courses.length === 0 && shouldShow(dialogKeys.USER_ONBOARDING) && !hasShownOnboarding) {
				setHasShownOnboarding(true)
				openDialog(dialogKeys.USER_ONBOARDING)
			}
		}
		checkNewUser()
	}, [userCoursesPromise, shouldShow, openDialog, hasShownOnboarding])

	// Watch for when onboarding closes to open course selector
	React.useEffect(() => {
		// If we just closed the onboarding dialog and user has no courses, open course selector
		const checkForCourseSelector = async () => {
			if (activeDialog === null && hasShownOnboarding && !shouldShow(dialogKeys.USER_ONBOARDING)) {
				const result = await errors.try(userCoursesPromise)
				if (!result.error && result.data.length === 0) {
					// Small delay to ensure smooth transition
					setTimeout(() => {
						openDialog(dialogKeys.COURSE_SELECTOR)
					}, 100)
				}
			}
		}
		checkForCourseSelector()
	}, [activeDialog, hasShownOnboarding, shouldShow, userCoursesPromise, openDialog])

	const handleEditCourses = () => {
		openDialog(dialogKeys.COURSE_SELECTOR)
	}

	const handleCourseSelection = async (selectedClassIds: string[]) => {
		const result = await errors.try(saveUserCourses(selectedClassIds))

		if (result.error) {
			// TODO: Show error toast/notification to user
			throw result.error
		}

		closeDialog()
		window.location.reload()
	}

	return (
		<>
			{/* Header renders immediately - no waiting for data */}
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-gray-800">My courses</h1>
				<Button
					onClick={handleEditCourses}
					variant="outline"
					className="bg-blue-600 hover:bg-blue-700 text-white hover:text-white font-medium px-4 border-blue-600 hover:border-blue-600 hover:outline hover:outline-2 hover:outline-blue-600 hover:outline-offset-2 transition-all"
				>
					Edit Courses
				</Button>
			</div>

			{/* Course grid with its own suspense boundary and nice skeleton */}
			<React.Suspense
				fallback={
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
						{[...Array(4)].map((_, i) => (
							<CourseCardSkeleton key={i} />
						))}
					</div>
				}
			>
				<CourseGrid coursesPromise={userCoursesPromise} />
			</React.Suspense>

			{/* Course selector with lazy loading - only loads data when opened */}
			<React.Suspense fallback={null}>
				<LazyCourseSelectorContent
					allSubjectsPromise={allSubjectsPromise}
					coursesPromise={userCoursesPromise}
					isOpen={activeDialog === dialogKeys.COURSE_SELECTOR}
					onOpenChange={(newOpen) => {
						if (!newOpen) {
							closeDialog()
						} else {
							openDialog(dialogKeys.COURSE_SELECTOR)
						}
					}}
					onComplete={handleCourseSelection}
				/>
			</React.Suspense>
		</>
	)
}
