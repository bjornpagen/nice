"use client"

import * as React from "react"
import type { CourseChallengeLayoutData } from "@/lib/types"
import { LessonSidebar } from "../../[unit]/[lesson]/lesson-sidebar"

export function TestLayout({
	courseDataPromise,
	children
}: {
	courseDataPromise: Promise<CourseChallengeLayoutData>
	children: React.ReactNode
}) {
	const courseData = React.use(courseDataPromise)
	const [isCollapsed, setIsCollapsed] = React.useState(false)

	// No-op function since we don't have multiple lessons in a test
	const setSelectedLessonId = React.useCallback(() => {}, [])

	return (
		<div className="flex h-full">
			{/* Sidebar - renders immediately, no suspense needed */}
			<LessonSidebar
				subject={courseData.subject}
				course={courseData.course}
				unit={courseData.unit}
				lesson={courseData.lesson}
				isCollapsed={isCollapsed}
				setIsCollapsed={setIsCollapsed}
				setSelectedLessonId={setSelectedLessonId}
			/>

			{/* Main content area - this is where streaming happens */}
			<div className="flex-1 overflow-y-auto bg-gray-50">{children}</div>
		</div>
	)
}
