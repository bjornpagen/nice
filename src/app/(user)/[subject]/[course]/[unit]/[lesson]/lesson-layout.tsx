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

	return (
		<div className="flex">
			{/* Sidebar - renders immediately, no suspense needed */}
			<LessonSidebar
				subject={subject}
				course={courseData}
				unit={unitData}
				lesson={lessonData}
				isCollapsed={isCollapsed}
				setIsCollapsed={setIsCollapsed}
			/>

			{/* Main content area - this is where streaming happens */}
			<div className="flex-1 p-6 overflow-y-auto bg-gray-50 min-h-screen pb-20">{children}</div>

			{/* Bottom navigation - renders immediately */}
			<LessonNext lessonChildren={lessonData.children} isCollapsed={isCollapsed} />
		</div>
	)
}
