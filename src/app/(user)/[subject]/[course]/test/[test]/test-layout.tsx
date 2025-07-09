"use client"

import * as React from "react"
import { LessonSidebar } from "../../[unit]/[lesson]/lesson-sidebar"
import type { CourseData } from "./page"

export function TestLayout({
	courseDataPromise,
	children
}: {
	courseDataPromise: Promise<CourseData>
	children: React.ReactNode
}) {
	const courseData = React.use(courseDataPromise)
	const [isCollapsed, setIsCollapsed] = React.useState(false)

	// Create mock unit and lesson data for the sidebar
	const mockUnit = {
		title: "Course Challenge",
		path: courseData.course.path,
		ordering: 0,
		children: []
	}

	const mockLesson = {
		title: courseData.test.title,
		path: `${courseData.course.path}/test/${courseData.test.slug}`,
		children: []
	}

	// No-op function since we don't have multiple lessons in a test
	const setSelectedLessonId = React.useCallback(() => {}, [])

	return (
		<div className="flex h-full">
			{/* Sidebar - renders immediately, no suspense needed */}
			<LessonSidebar
				subject={courseData.subject}
				course={courseData.course}
				unit={mockUnit}
				lesson={mockLesson}
				isCollapsed={isCollapsed}
				setIsCollapsed={setIsCollapsed}
				setSelectedLessonId={setSelectedLessonId}
			/>

			{/* Main content area - this is where streaming happens */}
			<div className="flex-1 overflow-y-auto bg-gray-50">{children}</div>
		</div>
	)
}
