"use client"

import * as React from "react"
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

	return (
		<div className="flex">
			<div className="sticky top-0 h-screen overflow-y-auto">
				<LessonSidebar subject={subject} course={courseData} unit={unitData} lesson={lessonData} />
			</div>

			<div className="flex-1 p-6 overflow-y-auto bg-gray-50">{children}</div>
		</div>
	)
}
