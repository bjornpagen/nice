"use client"

import _ from "lodash"
import { notFound } from "next/navigation"
import * as React from "react"
import { ContentHeader } from "@/components/overview/content-header"
import { Button } from "@/components/ui/button"
import type { Course } from "@/lib/v2/types"
import { CourseContentBreadcrumbs } from "./course-content-breadcrumbs"
import { CourseContentChallenge } from "./course-content-challenge"
import { CourseContentUnitOverviewItem } from "./course-content-unit-overview-item"
import { CourseContentUnitProficiencyItem } from "./course-content-unit-proficiency-item"

export function CourseContent({ coursePromise }: { coursePromise: Promise<Course | undefined> }) {
	const course = React.use(coursePromise)
	if (course == null) {
		notFound()
	}

	const challenge: Course["resources"][number] | undefined = course.resources.find(
		(resource) => resource.type === "CourseChallenge"
	)

	return (
		<div id="course-content">
			<div id="course-content-header">
				<CourseContentBreadcrumbs course={_.pick(course, ["path"])} className="mb-4" />
				<ContentHeader title={course.title} points={0} className="mb-4" />
			</div>

			<div id="course-content-unit-proficiency-items" className="sm:columns-1 md:columns-2 lg:columns-2 gap-6 mt-4">
				{course.units.map((unit, index) => (
					<CourseContentUnitProficiencyItem
						key={index}
						index={index}
						unit={unit}
						active={index === 0}
						className="break-inside-avoid border-b border-gray-300 px-6 py-3 mb-2"
					/>
				))}
				{challenge && <CourseContentChallenge challenge={challenge} />}
			</div>

			<div id="course-content-app-section" className="mt-16 mb-16 text-center">
				<h2 className="text-xl font-medium text-gray-900 mb-4">Learn with the Nice Academy Kids app!</h2>
				<p className="text-gray-700 text-base mb-6 max-w-2xl mx-auto">
					Kids ages 2-8 (preschool—2nd grade) can read, play, and learn with fun animal friends in our free interactive
					mobile app, Nice Academy Kids. We have tools for teachers, too!
				</p>
				<Button
					variant="outline"
					className="px-6 py-2 text-blue-600 border-blue-600 hover:bg-blue-50 hover:ring-2 hover:ring-blue-600 hover:cursor-not-allowed"
				>
					Learn more
				</Button>
			</div>

			<div id="course-content-unit-overview-items">
				{course.units.map((unit, index) => (
					<CourseContentUnitOverviewItem key={index} index={index} unit={unit} active={index === 0} className="mb-2" />
				))}
			</div>
		</div>
	)
}
