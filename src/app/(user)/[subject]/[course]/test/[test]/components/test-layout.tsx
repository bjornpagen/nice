"use client"

import type * as React from "react"
import { CourseSidebar } from "@/components/practice/course/sidebar/course-sidebar"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { Course as CourseV2 } from "@/lib/v2/types"

export function TestLayout({
	coursePromise,
	progressPromise,
	children
}: {
	coursePromise: Promise<CourseV2 | undefined>
	progressPromise: Promise<Map<string, AssessmentProgress>>
	children: React.ReactNode
}) {
	return (
		<div className="flex h-full">
			{/* Practice Course Sidebar */}
			<div className="w-[var(--sidebar-width)] flex-shrink-0 bg-gray-50 border-r border-gray-200 h-full">
				<CourseSidebar
					coursePromise={coursePromise}
					progressPromise={progressPromise}
					className="h-full bg-transparent border-none"
				/>
			</div>

			{/* Main content area */}
			<div className="flex-1 overflow-y-auto bg-gray-50">{children}</div>
		</div>
	)
}
