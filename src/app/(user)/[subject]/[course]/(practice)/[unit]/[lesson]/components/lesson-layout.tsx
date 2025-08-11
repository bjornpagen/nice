"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import * as React from "react"
import { LessonFooter } from "@/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/components/lesson-footer"
import { Sidebar } from "@/components/practice/course/sidebar/sidebar"
import { LessonProgressProvider } from "@/components/practice/lesson-progress-context"
import { Button } from "@/components/ui/button"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { LessonLayoutData } from "@/lib/types/page"
import type { Course as CourseV2 } from "@/lib/types/sidebar"
import { assertNoEncodedColons, normalizeString } from "@/lib/utils"

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
	React.use(dataPromise)
	// Now we pass progressPromise to the sidebar instead of consuming it here

	const rawPathname = usePathname()
	const pathname = normalizeString(rawPathname)
	assertNoEncodedColons(pathname, "lesson-layout pathname")
	const [isCollapsed, setIsCollapsed] = React.useState(false)

	// Don't show Next on exercise, quiz, unit test, or course challenge pages
	const isExercisePage = pathname.includes("/e/")
	const isQuizPage = pathname.includes("/quiz/")
	const isUnitTestPage = pathname.includes("/test/")
	const isCourseChallengePage = pathname.includes("/test/") && !pathname.includes("/lesson/")

	const shouldShowNext = !isExercisePage && !isQuizPage && !isUnitTestPage && !isCourseChallengePage

	const toggleSidebar = () => setIsCollapsed(!isCollapsed)

	return (
		<div className="flex h-full">
			{/* Wrap Sidebar in a flex container to match legacy layout behavior */}
			<div
				className="w-[var(--sidebar-width)] flex-shrink-0 bg-gray-50 border-r border-gray-200 h-full sidebar-container"
				data-collapsed={isCollapsed}
			>
				<Sidebar
					coursePromise={coursePromise}
					progressPromise={progressPromise}
					className="h-full bg-transparent border-none"
				/>
			</div>

			{/* Main area with flex column layout */}
			<div className="flex-1 flex flex-col relative">
				{/* Sidebar toggle button */}
				<Button
					onClick={toggleSidebar}
					variant="ghost"
					size="icon"
					className="absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow-md z-10 rounded-l-none rounded-r-md hover:cursor-pointer size-7 border border-l-0"
				>
					{isCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
					<span className="sr-only">Toggle Sidebar</span>
				</Button>

				{/* Content area + footer share the same lesson progress context */}
				<LessonProgressProvider>
					<div className="flex-1 overflow-y-auto bg-gray-50">{children}</div>

					{/* Conditionally render LessonFooter */}
					{shouldShowNext && <LessonFooter coursePromise={coursePromise} progressPromise={progressPromise} />}
				</LessonProgressProvider>
			</div>
		</div>
	)
}
