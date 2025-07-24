"use client"

import { usePathname } from "next/navigation"
import * as React from "react"
import { CourseSidebar } from "@/components/practice/course/sidebar/course-sidebar"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { LessonLayoutData } from "@/lib/types/page"
import type { Course as CourseV2 } from "@/lib/v2/types"
import { LessonNext } from "./lesson-next"

export function LessonLayout({
	dataPromise,
	progressPromise,
	coursePromise,
	children
}: {
	dataPromise: Promise<LessonLayoutData>
	progressPromise: Promise<Map<string, AssessmentProgress>>
	coursePromise: Promise<CourseV2 | undefined>
	children: React.ReactNode
}) {
	const { lessonData } = React.use(dataPromise)
	// Now we pass progressPromise to the sidebar instead of consuming it here

	const pathname = usePathname()
	const isExercisePage = pathname.includes("/e/")

	return (
		<div className="flex h-full">
			{/* Wrap CourseSidebar in a flex container to match legacy layout behavior */}
			<div className="w-[var(--sidebar-width)] flex-shrink-0 bg-gray-50 border-r border-gray-200 h-full">
				<CourseSidebar
					coursePromise={coursePromise}
					progressPromise={progressPromise}
					className="h-full bg-transparent border-none"
				/>
			</div>

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
