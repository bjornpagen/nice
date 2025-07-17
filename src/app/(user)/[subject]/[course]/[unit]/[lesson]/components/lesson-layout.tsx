"use client"

import { usePathname } from "next/navigation"
import * as React from "react"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { LessonLayoutData } from "@/lib/types/page"
import { LessonNext } from "./lesson-next"
import { LessonSidebar } from "./lesson-sidebar"

export function LessonLayout({
	dataPromise,
	progressPromise,
	children
}: {
	dataPromise: Promise<LessonLayoutData>
	progressPromise: Promise<Map<string, AssessmentProgress>>
	children: React.ReactNode
}) {
	const { subject, courseData, unitData, lessonData } = React.use(dataPromise)
	const [isCollapsed, setIsCollapsed] = React.useState(false)

	// Track which lesson's content is currently displayed in the sidebar
	const [selectedLessonId, setSelectedLessonId] = React.useState(lessonData.id)

	const pathname = usePathname()
	const isExercisePage = pathname.includes("/e/")

	// Find the selected lesson from unit children
	const selectedLesson = React.useMemo(() => {
		const foundChild = unitData.children.find((child) => child.type === "Lesson" && child.id === selectedLessonId)
		// Type guard: if found and is Lesson type, it's a Lesson
		if (foundChild && foundChild.type === "Lesson") {
			return foundChild
		}
		// If not found, default to current lesson
		return lessonData
	}, [unitData.children, selectedLessonId, lessonData])

	return (
		<div className="flex h-full">
			{/* Sidebar - renders immediately, now gets progress as a promise */}
			<LessonSidebar
				subject={subject}
				course={courseData}
				unit={unitData}
				lesson={selectedLesson}
				isCollapsed={isCollapsed}
				setIsCollapsed={setIsCollapsed}
				setSelectedLessonId={setSelectedLessonId}
				progressPromise={progressPromise}
			/>

			{/* Main area with flex column layout */}
			<div className="flex-1 flex flex-col">
				{/* Content area - scrollable */}
				<div className="flex-1 overflow-y-auto bg-gray-50">{children}</div>

				{/* Conditionally render LessonNext footer */}
				{!isExercisePage && <LessonNext lessonChildren={lessonData.children} />}
			</div>
		</div>
	)
}
