"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { CourseSelector } from "@/components/course-selector-content"
import { OnboardingModal } from "@/components/onboarding-modal"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { saveUserCourses } from "@/lib/actions/courses"
import { CourseCard } from "./course-card"
import type { AllCourse, AllSubject, Course, Unit } from "./page"

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
	allSubjectsPromise,
	allCoursesPromise,
	userCourseCountPromise
}: {
	coursesPromise: Promise<Course[]>
	unitsPromise: Promise<Unit[]>
	allSubjectsPromise: Promise<AllSubject[]>
	allCoursesPromise: Promise<AllCourse[]>
	userCourseCountPromise: Promise<{ count: number }>
}) {
	const [showCourseSelector, setShowCourseSelector] = React.useState(false)
	const [onboardingCompleted, setOnboardingCompleted] = React.useState(false)

	// Use the promises for modal logic
	const userCourseCount = React.use(userCourseCountPromise)
	const allSubjects = React.use(allSubjectsPromise)
	const allCourses = React.use(allCoursesPromise)
	const courses = React.use(coursesPromise)

	// Check if user has no courses - show onboarding modal for new users
	const shouldShowOnboarding = userCourseCount.count === 0 && !onboardingCompleted
	const isNewUser = userCourseCount.count === 0

	// For new users, show course selector immediately (it will be behind onboarding modal)
	React.useEffect(() => {
		if (isNewUser) {
			setShowCourseSelector(true)
		}
	}, [isNewUser])

	// Handle onboarding completion - just mark as completed, course selector is already open
	const handleOnboardingComplete = () => {
		setOnboardingCompleted(true)
		// Course selector is already open, no need to do anything else
	}

	// Process course selector data
	const subjectsWithCourses = React.useMemo(() => {
		// Group courses by subject based on path pattern
		const coursesBySubject = new Map<string, AllCourse[]>()
		const otherCourses: AllCourse[] = []

		// Initialize map with all subjects
		for (const subject of allSubjects) {
			coursesBySubject.set(subject.slug, [])
		}

		// Group courses
		for (const course of allCourses) {
			// Extract subject from course path (e.g., /math/arithmetic -> math)
			const pathParts = course.path.split("/")
			const subjectSlug = pathParts[1] // First part after leading /

			if (subjectSlug && coursesBySubject.has(subjectSlug)) {
				coursesBySubject.get(subjectSlug)?.push(course)
			} else {
				otherCourses.push(course)
			}
		}

		// If there are courses without matching subjects, add "Other" category
		if (otherCourses.length > 0) {
			coursesBySubject.set("other", otherCourses)
		}

		// Convert to array format for easier consumption
		const subjectsWithCourses = Array.from(coursesBySubject.entries())
			.map(([slug, coursesForSubject]) => {
				const subject = allSubjects.find((s) => s.slug === slug)
				return {
					slug,
					title: subject?.title || "Other",
					courses: coursesForSubject.sort((a, b) => a.title.localeCompare(b.title))
				}
			})
			.filter((s) => s.courses.length > 0) // Only include subjects with courses

		return subjectsWithCourses
	}, [allSubjects, allCourses])

	const handleEditCourses = () => {
		setShowCourseSelector(true)
	}

	const handleCourseSelection = async (selectedCourseIds: string[]) => {
		const result = await errors.try(saveUserCourses(selectedCourseIds))

		if (result.error) {
			// TODO: Show error toast/notification to user
			// For now, we'll just rethrow the error
			throw result.error
		}

		// Close the course selector
		setShowCourseSelector(false)

		// Refresh the page to show the newly selected courses
		window.location.reload()
	}

	return (
		<>
			{/* Onboarding modal shows for new users */}
			<OnboardingModal show={shouldShowOnboarding} onComplete={handleOnboardingComplete} />

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

			{/* Course Selector Modal - only shows after onboarding is complete or for existing users editing */}
			<CourseSelector
				subjects={subjectsWithCourses}
				open={showCourseSelector}
				onOpenChange={(newOpen) => {
					// Don't allow closing the course selector if onboarding is active
					if (!newOpen && shouldShowOnboarding) {
						return // Ignore close request
					}
					setShowCourseSelector(newOpen)
				}}
				onComplete={handleCourseSelection}
				initialSelectedCourseIds={courses.map((course) => course.id)}
			/>
		</>
	)
}
