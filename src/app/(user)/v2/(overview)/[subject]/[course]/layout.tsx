import * as logger from "@superbuilders/slog"
import type React from "react"
import { Footer } from "@/components/footer"
import { type Course, CourseSidebar } from "@/components/overview/course/sidebar/course-sidebar"

export default async function CourseLayout({
	children,
	params
}: {
	children: React.ReactNode
	params: Promise<{ subject: string; course: string }>
}) {
	const { subject, course } = await params
	logger.debug("initializing course layout", { subject, course })

	const coursePromise = getCourseData(subject, course)
	logger.debug("course data retrieved", { subject, course })

	return (
		<div id="course-layout">
			<div className="flex flex-row">
				<nav id="course-layout-sidebar" className="flex-none hidden md:block lg:block sticky top-14 h-screen">
					<CourseSidebar coursePromise={coursePromise} />
				</nav>

				<main id="course-layout-main" className="flex-1 bg-gray-50 px-8 py-4">
					{children}
				</main>
			</div>

			<div id="course-layout-footer flex-none">
				<Footer />
			</div>
		</div>
	)
}

async function getCourseData(subject: string, course: string): Promise<Course> {
	logger.debug("retrieving course data", { subject, course })

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
			},
			{
				slug: "unit-3",
				path: `/v2/${subject}/${course}/unit-3`,
				title: "Unit 3 Title",
				lessons: 8
			},
			{
				slug: "unit-4",
				path: `/v2/${subject}/${course}/unit-4`,
				title: "Unit 4 Title",
				lessons: 7
			},
			{
				slug: "unit-5",
				path: `/v2/${subject}/${course}/unit-5`,
				title: "Unit 5 Title",
				lessons: 6
			},
			{
				slug: "unit-6",
				path: `/v2/${subject}/${course}/unit-6`,
				title: "Unit 6 Title",
				lessons: 9
			},
			{
				slug: "unit-7",
				path: `/v2/${subject}/${course}/unit-7`,
				title: "Unit 7 Title",
				lessons: 4
			},
			{
				slug: "unit-8",
				path: `/v2/${subject}/${course}/unit-8`,
				title: "Unit 8 Title",
				lessons: 12
			},
			{
				slug: "unit-9",
				path: `/v2/${subject}/${course}/unit-9`,
				title: "Unit 9 Title",
				lessons: 11
			},
			{
				slug: "unit-10",
				path: `/v2/${subject}/${course}/unit-10`,
				title: "Unit 10 Title",
				lessons: 3
			}
		],
		challenge: {
			path: `/v2/${subject}/${course}/challenge`
		}
	}
}
