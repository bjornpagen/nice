"use client"

import * as React from "react"
import { LessonNext } from "./lesson-next"
import { LessonSidebar } from "./lesson-sidebar"
import type { LessonData } from "./page"

export function LessonLayout({
	dataPromise,
	children
}: {
	dataPromise: Promise<LessonData>
	children: React.ReactNode
}) {
	const { subject, courseData, unitData, lessonData } = React.use(dataPromise)
	const [isCollapsed, setIsCollapsed] = React.useState(false)

	// Track which lesson's content is currently displayed in the sidebar
	const [selectedLessonId, setSelectedLessonId] = React.useState(lessonData.id)

	// Find the selected lesson from unit children
	const selectedLesson = React.useMemo(() => {
		const lesson = unitData.children.find((child) => child.id === selectedLessonId)
		// If not found, default to current lesson
		return lesson || lessonData
	}, [unitData.children, selectedLessonId, lessonData])

	return (
		<div className="flex">
			{/* Sidebar - renders immediately, no suspense needed */}
			<LessonSidebar
				subject={subject}
				course={courseData}
				unit={unitData}
				lesson={selectedLesson}
				isCollapsed={isCollapsed}
				setIsCollapsed={setIsCollapsed}
				setSelectedLessonId={setSelectedLessonId}
			/>

			{/* Main content area - this is where streaming happens */}
			<div className="flex-1 p-6 overflow-y-auto bg-gray-50 min-h-screen pb-20">{children}</div>

			{/* Bottom navigation - renders immediately */}
			<LessonNext lessonChildren={lessonData.children} isCollapsed={isCollapsed} />
		</div>
	)
}
