"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { CourseSelector } from "@/components/course-selector-content"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { dialogKeys, useDialogManager } from "@/hooks/use-dialog-manager"
import { saveUserCourses } from "@/lib/actions/courses"
import { CourseCard } from "./course-card"
import type { AllSubject, Course, Unit } from "./page"

// Loading skeleton for course cards
function CourseCardSkeleton() {
	return (
		<div className="rounded-lg border p-4 space-y-3">
			<Skeleton className="h-6 w-3/4" />
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-4 w-5/6" />
			<div className="space-y-2 mt-4">
				<Skeleton className="h-3 w-full" />
				<Skeleton className="h-3 w-full" />
				<Skeleton className="h-3 w-4/5" />
			</div>
		</div>
	)
}

// Component to handle course display with its own Suspense
function CourseGrid({
	coursesPromise,
	unitsPromise
}: {
	coursesPromise: Promise<Course[]>
	unitsPromise: Promise<Unit[]>
}) {
	const courses = React.use(coursesPromise)
	const units = React.use(unitsPromise)

	const unitsByCourseId = React.useMemo(() => {
		const map = new Map<string, Unit[]>()
		for (const unit of units) {
			if (!map.has(unit.courseId)) {
				map.set(unit.courseId, [])
			}
			map.get(unit.courseId)?.push(unit)
		}
		// Sort units by their ordering
		for (const unitList of map.values()) {
			unitList.sort((a, b) => a.ordering - b.ordering)
		}
		return map
	}, [units])

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
			{courses.map((course) => (
				<CourseCard key={course.id} course={course} units={unitsByCourseId.get(course.id) || []} />
			))}
		</div>
	)
}

export function Content({
	coursesPromise,
	unitsPromise,
	allSubjectsPromise, // This prop now receives the promise from getOneRosterClassesForSelector
	userCourseCountPromise
}: {
	coursesPromise: Promise<Course[]>
	unitsPromise: Promise<Unit[]>
	allSubjectsPromise: Promise<AllSubject[]>
	userCourseCountPromise: Promise<{ count: number }>
}) {
	// Use the centralized dialog manager
	const { openDialog, shouldShow, closeDialog, activeDialog } = useDialogManager()

	// Use the promises for modal logic
	const userCourseCount = React.use(userCourseCountPromise)
	const subjectsWithCourses = React.use(allSubjectsPromise) // Data is now pre-formatted
	const courses = React.use(coursesPromise)

	// Check if user has no courses - show onboarding modal for new users
	const isNewUser = userCourseCount.count === 0

	React.useEffect(() => {
		if (isNewUser && shouldShow(dialogKeys.USER_ONBOARDING)) {
			openDialog(dialogKeys.USER_ONBOARDING)
		}
	}, [isNewUser, shouldShow, openDialog])

	// The complex useMemo hook for grouping courses by subject is no longer needed.
	// The data comes pre-formatted from the server action.

	const handleEditCourses = () => {
		openDialog(dialogKeys.COURSE_SELECTOR)
	}

	const handleCourseSelection = async (selectedCourseIds: string[]) => {
		const result = await errors.try(saveUserCourses(selectedCourseIds))

		if (result.error) {
			// TODO: Show error toast/notification to user
			throw result.error
		}

		// Close the course selector via the dialog manager
		closeDialog()

		// Refresh the page to show the newly selected courses
		window.location.reload()
	}

	return (
		<>
			{/* Header with My courses title and Edit Courses button - Always visible */}
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-gray-800">My courses</h1>
				<Button
					onClick={handleEditCourses}
					variant="outline"
					className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4"
				>
					Edit Courses
				</Button>
			</div>

			{/* Course grid with its own Suspense boundary */}
			<React.Suspense
				fallback={
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
						<CourseCardSkeleton />
						<CourseCardSkeleton />
						<CourseCardSkeleton />
						<CourseCardSkeleton />
					</div>
				}
			>
				<CourseGrid coursesPromise={coursesPromise} unitsPromise={unitsPromise} />
			</React.Suspense>

			{/* Course Selector Modal - now controlled by the global provider */}
			<CourseSelector
				subjects={subjectsWithCourses}
				open={activeDialog === dialogKeys.COURSE_SELECTOR}
				onOpenChange={(newOpen) => {
					if (!newOpen) {
						closeDialog()
					} else {
						openDialog(dialogKeys.COURSE_SELECTOR)
					}
				}}
				onComplete={handleCourseSelection}
				initialSelectedCourseIds={courses.map((course) => course.id)}
			/>
		</>
	)
}
