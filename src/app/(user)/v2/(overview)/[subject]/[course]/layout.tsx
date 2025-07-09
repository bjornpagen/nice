"use server"

import * as logger from "@superbuilders/slog"
import type React from "react"
import { type Course, CourseSidebar } from "@/components/course/course-sidebar"

export default async function CourseLayout({
	children,
	params
}: {
	children: React.ReactNode
	params: Promise<{ subject: string; course: string }>
}) {
	const { subject, course } = await params
	logger.debug("initializing course layout", { subject, course })

	logger.debug("retrieving course data", { subject, course })
	const coursePromise = getCourseData(subject, course)

	return (
		<div id="course-layout" className="flex flex-col lg:flex-row">
			<nav id="course-layout-sidebar" className="flex-none w-full lg:w-64 xl:w-80">
				<CourseSidebar coursePromise={coursePromise} />
			</nav>

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
