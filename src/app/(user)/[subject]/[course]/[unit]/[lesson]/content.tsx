"use client"

import * as React from "react"
import { LessonNext } from "./lesson-next"
import { LessonSidebar } from "./lesson-sidebar"
import type { Course, Lesson, Unit } from "./page"

type PageData = {
	subject: string
	courseData: Course
	unitData: Unit
	lessonData: Lesson
	children: React.ReactNode
}

export function Content({ dataPromise }: { dataPromise: Promise<PageData> }) {
	const { subject, courseData, unitData, lessonData, children } = React.use(dataPromise)
	const [isCollapsed, setIsCollapsed] = React.useState(false)

	return (
		<div className="flex">
			{/* Sidebar - part of the layout flow */}
			<LessonSidebar
				subject={subject}
				course={courseData}
				unit={unitData}
				lesson={lessonData}
				isCollapsed={isCollapsed}
				setIsCollapsed={setIsCollapsed}
			/>

			{/* Main content area with bottom padding for the fixed navigation */}
			<div className="flex-1 p-6 overflow-y-auto bg-gray-50 min-h-screen pb-20">{children}</div>

			{/* Bottom navigation - fixed to bottom */}
			<LessonNext lessonChildren={lessonData.children} isCollapsed={isCollapsed} />
		</div>
	)
}
