import type * as React from "react"
import { Sidebar } from "@/components/practice/course/sidebar/sidebar"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { Course as CourseV2 } from "@/lib/types/sidebar"

export function ChallengeLayout({
	coursePromise,
	progressPromise,
	resourceLockStatusPromise,
	children
}: {
	coursePromise: Promise<CourseV2 | undefined>
	progressPromise: Promise<Map<string, AssessmentProgress>>
	resourceLockStatusPromise: Promise<Record<string, boolean>>
	children: React.ReactNode
}) {
	return (
		<div className="flex h-full">
			{/* Practice Course Sidebar */}
			<div className="w-[var(--sidebar-width)] flex-shrink-0 bg-gray-50 border-r border-gray-200 h-full">
				<Sidebar
					coursePromise={coursePromise}
					progressPromise={progressPromise}
					resourceLockStatusPromise={resourceLockStatusPromise}
					className="h-full bg-transparent border-none"
				/>
			</div>

			{/* Main content area */}
			<div className="flex-1 overflow-y-auto bg-gray-50">{children}</div>
		</div>
	)
}
