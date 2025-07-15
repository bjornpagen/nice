"use client"

import * as React from "react"
import type { LessonLayoutData } from "./layout"
import { LessonNext } from "./lesson-next"
import { LessonSidebar } from "./lesson-sidebar"

export function LessonLayout({
	dataPromise,
	children
}: {
	dataPromise: Promise<LessonLayoutData>
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
		<div className="flex h-full">
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

			{/* Main area with flex column layout */}
			<div className="flex-1 flex flex-col">
				{/* Content area - scrollable */}
				<div className="flex-1 overflow-y-auto bg-gray-50">{children}</div>

				{/* Bottom navigation - always visible, never overlaps content */}
				<LessonNext lessonChildren={lessonData.children} />
			</div>
		</div>
	)
}
