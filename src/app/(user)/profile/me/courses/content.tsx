"use client"

import * as React from "react"
import { CourseSelector } from "@/components/course-selector-content"
import { OnboardingModal } from "@/components/onboarding-modal"
import { Button } from "@/components/ui/button"
import { CourseCard } from "./course-card"
import type { AllCourse, AllSubject, Course, Unit } from "./page"

export function Content({
	coursesPromise,
	unitsPromise,
	allSubjectsPromise,
	allCoursesPromise
}: {
	coursesPromise: Promise<Course[]>
	unitsPromise: Promise<Unit[]>
	allSubjectsPromise: Promise<AllSubject[]>
	allCoursesPromise: Promise<AllCourse[]>
}) {
	const courses = React.use(coursesPromise)
	const units = React.use(unitsPromise)
	const allSubjects = React.use(allSubjectsPromise)
	const allCourses = React.use(allCoursesPromise)
	const [showCourseSelector, setShowCourseSelector] = React.useState(false)

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

	const handleCourseSelection = async (_selectedCourseIds: string[]) => {
		// TODO: Implement course selection logic
		// When implemented, this would save the selected courses to the user's profile
		setShowCourseSelector(false)
	}

	return (
		<>
			<OnboardingModal />

			{/* Header with My courses title and Edit Courses button */}
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

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
				{courses.map((course) => (
					<CourseCard key={course.id} course={course} units={unitsByCourseId.get(course.id) || []} />
				))}
			</div>

			{/* Course Selector Modal */}
			<CourseSelector
				subjects={subjectsWithCourses}
				open={showCourseSelector}
				onOpenChange={setShowCourseSelector}
				onComplete={handleCourseSelection}
			/>
		</>
	)
}
