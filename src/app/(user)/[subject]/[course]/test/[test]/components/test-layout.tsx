"use client"

import * as React from "react"
import type { CourseChallengeLayoutData } from "@/lib/types/page"
import { CourseSidebar } from "../../../components/sidebar"

export function TestLayout({
	courseDataPromise,
	children
}: {
	courseDataPromise: Promise<CourseChallengeLayoutData>
	children: React.ReactNode
}) {
	const courseData = React.use(courseDataPromise)

	return (
		<div className="flex h-full">
			{/* Sidebar - renders immediately, no suspense needed */}
			<div className="flex-shrink-0 w-96">
				<div className="sticky top-0 w-96 max-h-screen overflow-y-auto">
					<CourseSidebar course={courseData.course} lessonCount={0} challenges={courseData.challenges} />
				</div>
			</div>

			{/* Main content area - this is where streaming happens */}
			<div className="flex-1 overflow-y-auto bg-gray-50">{children}</div>
		</div>
	)
}
