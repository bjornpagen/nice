"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import type { CourseTest } from "./page"

export function TestSidebar({
	subject,
	course,
	test,
	isCollapsed,
	setIsCollapsed
}: {
	subject: string
	course: { title: string; path: string }
	test: CourseTest
	isCollapsed: boolean
	setIsCollapsed: (collapsed: boolean) => void
}) {
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

						{/* Test info */}
						<div className="bg-white border-x border-gray-200 p-5">
							<div className="text-lg font-semibold text-gray-900 mb-2">{test.title}</div>
							{test.description && <div className="text-sm text-gray-600 mb-4">{test.description}</div>}
							<div className="text-sm text-blue-600 font-medium">Course Challenge</div>
						</div>
					</div>

					{/* Scrollable content area */}
					<div className="flex-1 overflow-hidden">
						<div className="bg-white border-x border-gray-200 mx-5 h-full">
							<div className="px-5 py-4">
								<div className="text-sm text-gray-600 mb-4">
									This is a comprehensive test covering all the concepts in this course.
								</div>
								<div className="space-y-3">
									<div className="flex items-center text-sm text-gray-700">
										<div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
										Test your understanding of key concepts
									</div>
									<div className="flex items-center text-sm text-gray-700">
										<div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
										Apply what you've learned
									</div>
									<div className="flex items-center text-sm text-gray-700">
										<div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
										Challenge yourself with advanced problems
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Fixed footer section */}
					<div className="flex-shrink-0 p-5 pt-0">
						<div className="bg-white border-x border-b border-gray-200 rounded-b-lg">
							{/* Breadcrumbs */}
							<div className="bg-gray-100 mx-5 mb-2 rounded">
								<div className="px-4 py-2 text-sm text-gray-600">
									<span className="capitalize">{subject}</span>
									<span className="text-gray-400 mx-2">›</span>
									<span>{course.title}</span>
									<span className="text-gray-400 mx-2">›</span>
									<span className="text-blue-600">{test.title}</span>
								</div>
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
