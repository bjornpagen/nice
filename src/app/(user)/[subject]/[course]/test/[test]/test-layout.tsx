"use client"

import * as React from "react"
import type { CourseData } from "./page"
import { TestSidebar } from "./test-sidebar"

export function TestLayout({
	courseDataPromise,
	children
}: {
	courseDataPromise: Promise<CourseData>
	children: React.ReactNode
}) {
	const courseData = React.use(courseDataPromise)
	const [isCollapsed, setIsCollapsed] = React.useState(false)

	return (
		<div className="flex h-full">
			{/* Sidebar - renders immediately, no suspense needed */}
			<TestSidebar
				subject={courseData.subject}
				course={courseData.course}
				test={courseData.test}
				isCollapsed={isCollapsed}
				setIsCollapsed={setIsCollapsed}
			/>

			{/* Main content area - this is where streaming happens */}
			<div className="flex-1 overflow-y-auto bg-gray-50">{children}</div>
		</div>
	)
}
