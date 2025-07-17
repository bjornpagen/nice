"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { toast } from "sonner"
import { CourseSelector } from "@/components/course-selector-content"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { saveUserCourses } from "@/lib/actions/courses"
import type { ProfileCourse } from "@/lib/types/domain"
import type { ProfileCoursesPageData } from "@/lib/types/page"
import { CourseCard } from "./course-card"

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
				return <CourseCard key={course.id} course={course} units={course.units || []} color={color} />
			})}
		</div>
	)
}

// Inner component that renders the data
function ProfileCoursesInner({ data }: { data: ProfileCoursesPageData }) {
	const { subjects, userCourses } = data
	const [isModalOpen, setIsModalOpen] = React.useState(false)

	const handleCourseSelection = async (selectedClassIds: string[]) => {
		// Get initial course IDs for comparison
		const initialCourseIds = userCourses.map((course) => course.id)

		// Compare with selected IDs to check if anything changed
		const initialSet = new Set(initialCourseIds)
		const selectedSet = new Set(selectedClassIds)

		// Check if sets are identical
		const hasChanges = initialSet.size !== selectedSet.size || ![...initialSet].every((id) => selectedSet.has(id))

		// If no changes, just close the modal
		if (!hasChanges) {
			setIsModalOpen(false)
			return
		}

		// Only save if there are actual changes
		const promise = saveUserCourses(selectedClassIds)
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

// Wrapper that consumes the promise
function ProfileCoursesSuspense({ coursesPromise }: { coursesPromise: Promise<ProfileCoursesPageData> }) {
	const data = React.use(coursesPromise)
	return <ProfileCoursesInner data={data} />
}

// Main content component
export function Content({ coursesPromise }: { coursesPromise: Promise<ProfileCoursesPageData> }) {
	return (
		<React.Suspense
			fallback={
				<>
					<div className="flex items-center justify-between mb-6">
						<h1 className="text-2xl font-bold text-gray-800">My courses</h1>
						<Skeleton className="h-9 w-24" />
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{[...Array(2)].map((_, i) => (
							<CourseCardSkeleton key={i} />
						))}
					</div>
				</>
			}
		>
			<ProfileCoursesSuspense coursesPromise={coursesPromise} />
		</React.Suspense>
	)
}
