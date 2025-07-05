"use client"

import { Info } from "lucide-react"
import * as React from "react"
import { Footer } from "@/components/footer"
import { CourseHeader } from "./course-header"
import type { Course, CourseChallenge, Unit } from "./page"
import { ProficiencyLegend } from "./proficiency-legend"
import { Section } from "./section"
import { CourseSidebar } from "./sidebar"

export function Content({
	paramsPromise,
	coursePromise,
	unitsPromise,
	lessonCountPromise,
	challengesPromise
}: {
	paramsPromise: Promise<{ subject: string; course: string }>
	coursePromise: Promise<Course>
	unitsPromise: Promise<Unit[]>
	lessonCountPromise: Promise<number>
	challengesPromise: Promise<CourseChallenge[]>
}) {
	// Consume all promises with React.use(), which suspends rendering until data is ready.
	const { subject, course: courseSlug } = React.use(paramsPromise)
	const course = React.use(coursePromise)
	const units = React.use(unitsPromise)
	const lessonCount = React.use(lessonCountPromise)
	const challenges = React.use(challengesPromise)

	return (
		<React.Fragment>
			{/* Main Layout Container */}
			<div className="flex">
				{/* Sidebar */}
				<div className="sticky top-0 h-screen overflow-y-auto">
					<CourseSidebar course={course} units={units} lessonCount={lessonCount} challenges={challenges} />
				</div>

				{/* Main Content Area */}
				<div className="flex-1 p-6 overflow-y-auto bg-gray-50">
					<CourseHeader subject={subject} course={courseSlug} />

					{/* Course Header */}
					<div className="mb-6">
						{/* Course Details */}
						<h1 className="text-3xl font-bold text-gray-800 mb-2">{course.title}</h1>
						<div className="flex items-center space-x-2 text-gray-600">
							<span className="text-sm">0 possible mastery points</span>
							<Info className="w-4 h-4 bg-gray-200 rounded-full cursor-not-allowed" />
						</div>

						{/* Proficiency Metrics */}
						<ProficiencyLegend />
						{/* <ProficiencyProgress unit={unitData} /> */}
					</div>

					{/* Separator */}
					<div className="border-t border-gray-400 mt-2 mb-6" />

					{/* About Section */}
					<Section>
						<h2 className="font-semibold text-gray-900 mb-2 text-xl">About this course</h2>
						<p className="text-gray-600 text-xs">{course.description}</p>
					</Section>
				</div>
			</div>

			<Footer />
		</React.Fragment>
	)
}
