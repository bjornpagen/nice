"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { toast } from "sonner"
import { CourseSelector } from "@/components/course-selector-content"
import { Button } from "@/components/ui/button"
import { saveUserCourses } from "@/lib/actions/courses"
import type { ProfileCourse } from "@/lib/types/domain"
import type { ProfileCoursesPageData } from "@/lib/types/page"
import { CourseCard } from "./course-card"

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
				return <CourseCard key={course.id} course={course} units={course.units} color={color} />
			})}
		</div>
	)
}

export function Content({ coursesPromise }: { coursesPromise: Promise<ProfileCoursesPageData> }) {
	const { subjects, userCourses } = React.use(coursesPromise)
	const [isModalOpen, setIsModalOpen] = React.useState(false)

	// Automatically open course selector if user has no courses
	React.useEffect(() => {
		if (userCourses.length === 0) {
			setIsModalOpen(true)
		}
	}, [userCourses.length])

	const handleCourseSelection = async (selectedClassIds: string[]) => {
		const initialCourseIds = userCourses.map((course) => course.id)
		const initialSet = new Set(initialCourseIds)
		const selectedSet = new Set(selectedClassIds)
		const hasChanges = initialSet.size !== selectedSet.size || ![...initialSet].every((id) => selectedSet.has(id))

		if (!hasChanges) {
			setIsModalOpen(false)
			return
		}

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
