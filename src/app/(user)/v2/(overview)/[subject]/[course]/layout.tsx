"use server"

import * as logger from "@superbuilders/slog"
import React from "react"
import { type Course, CourseSidebar } from "@/components/course/course-sidebar"

export default async function CourseLayout({
	children,
	params
}: {
	children: React.ReactNode
	params: Promise<{ subject: string; course: string; unit?: string }>
}) {
	const { subject, course, unit } = await params
	logger.info("initializing course layout", { subject, course, unit })

	const courseData = await getCourseData(subject, course)

	return (
		<div id="course-layout" className="flex">
			<React.Suspense>
				<CourseSidebar course={courseData} slug={unit != null ? unit : course} className="flex-none w-1/6" />
			</React.Suspense>

			<main id="course-layout-main" className="flex-1">
				{children}
			</main>
		</div>
	)
}

async function getCourseData(subject: string, course: string): Promise<Course> {
	return {
		slug: course,
		path: `/v2/${subject}/${course}`,
		title: course,
		units: [
			{
				slug: "unit-1",
				path: `/v2/${subject}/${course}/unit-1`,
				title: "Unit 1 Title",
				lessons: 10
			},
			{
				slug: "unit-2",
				path: `/v2/${subject}/${course}/unit-2`,
				title: "Unit 2 Title",
				lessons: 5
			}
		]
	}
}
