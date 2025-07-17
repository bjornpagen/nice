"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { Course, Lesson, Unit } from "@/lib/types/structure"
import { LessonBreadcrumbs } from "./lesson-breadcrumbs"
import { LessonChildTab } from "./lesson-child-tab"
import { LessonNavigation } from "./lesson-navigation"

export function LessonSidebar({
	subject,
	course,
	unit,
	lesson,
	isCollapsed,
	setIsCollapsed,
	setSelectedLessonId,
	progressPromise
}: {
	subject: string
	course: Pick<Course, "id" | "title" | "path">
	unit: Pick<Unit, "title" | "path" | "children" | "ordering">
	lesson: Pick<Lesson, "title" | "path" | "children">
	isCollapsed: boolean
	setIsCollapsed: (collapsed: boolean) => void
	setSelectedLessonId: (lessonId: string) => void
	progressPromise: Promise<Map<string, AssessmentProgress>>
}) {
	const progressMap = React.use(progressPromise)

	const toggleSidebar = () => {
		setIsCollapsed(!isCollapsed)
	}

	return (
		<div className="relative flex-shrink-0 h-full">
			{/* Collapsed sidebar - thin strip */}
			{isCollapsed && (
				<div className="w-8 hidden lg:flex bg-gray-50 border-r border-gray-200 flex-col h-full">
					{/* Empty collapsed sidebar */}
				</div>
			)}

			{/* Expanded sidebar - full width */}
			{!isCollapsed && (
				<div className="w-112 hidden lg:flex bg-gray-50 border-r border-gray-200 flex-col h-full">
					{/* Fixed header section */}
					<div className="flex-shrink-0 p-5 pb-0">
						{/* Course header */}
						<div className="bg-white p-5 rounded-t-lg border border-gray-200">
							<div className="flex items-center gap-4">
								<div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
									<span className="w-3 h-3 bg-white rounded-sm" />
								</div>
								<span className="font-medium text-gray-900 text-xl">{course.title}</span>
							</div>
						</div>

						{/* Navigation - fixed */}
						<div className="bg-white border-x border-gray-200">
							<LessonNavigation course={course} unit={unit} lesson={lesson} setSelectedLessonId={setSelectedLessonId} />
						</div>
					</div>

					{/* Scrollable content area containing lessons, breadcrumbs, and footer */}
					<div className="flex-1 overflow-hidden px-5 pb-5">
						<div className="bg-white border-x border-b border-gray-200 rounded-b-lg h-full">
							<ScrollArea className="h-full [&>div]:overscroll-contain">
								{/* Lesson content */}
								<div className="px-5 py-2">
									{lesson.children.map((child) => (
										<LessonChildTab key={child.id} child={child} progress={progressMap.get(child.id)} />
									))}
								</div>

								{/* Breadcrumbs at the bottom */}
								<div className="bg-gray-100 mx-5 mb-2 rounded">
									<LessonBreadcrumbs subject={subject} course={course} unit={unit} lesson={lesson} />
								</div>

								{/* Footer */}
								<div className="p-2 mb-4 text-center">
									<div className="text-xs text-gray-600 ">© 2025 Nice Academy</div>
									<div className="text-xs text-gray-500 space-x-4">
										<span className="hover:text-gray-700 underline cursor-not-allowed">Terms of use</span>
										<span className="hover:text-gray-700 underline cursor-not-allowed">Privacy Policy</span>
										<span className="hover:text-gray-700 underline cursor-not-allowed">Cookie Notice</span>
										<span className="hover:text-gray-700 underline cursor-not-allowed">Accessibility Statement</span>
									</div>
								</div>
							</ScrollArea>
						</div>
					</div>
				</div>
			)}

			{/* Toggle button - fixed to middle of viewport */}
			<div
				className={`fixed top-1/2 -translate-y-1/2 z-50 transition-all duration-300 ease-in-out ${
					isCollapsed ? "left-6" : "left-[27.5rem]"
				}`}
			>
				<button
					type="button"
					onClick={toggleSidebar}
					className="w-4 h-8 bg-white border border-gray-300 rounded-r-sm shadow-sm hover:bg-gray-50 flex items-center justify-center transition-colors duration-200"
				>
					{isCollapsed ? (
						<ChevronRight className="w-3 h-3 text-gray-500" />
					) : (
						<ChevronLeft className="w-3 h-3 text-gray-500" />
					)}
				</button>
			</div>
		</div>
	)
}
