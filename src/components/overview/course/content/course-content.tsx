"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { ContentHeader } from "@/components/overview/content-header"
import { CourseContentBreadcrumbs } from "./course-content-breadcrumbs"
import { CourseContentChallenge } from "./course-content-challenge"
import { CourseContentUnitItem } from "./course-content-unit-item"

export type Lesson = {
	slug: string
	path: string
	type: "exercise" | "quiz" | "unit-test"
	title: string
}

export type Unit = {
	slug: string
	path: string
	title: string
	lessons: Lesson[]
}

export type Challenge = {
	path: string
}

export type Course = {
	path: string
	title: string
	units: Unit[]
	challenge: Challenge
}

export function CourseContent({ coursePromise }: { coursePromise: Promise<Course> }) {
	const course = React.use(coursePromise)
	if (course.path === "") {
		throw errors.new("course data is invalid")
	}

	return (
		<div id="course-content">
			<div id="course-content-header">
				<CourseContentBreadcrumbs course={course} className="mb-4" />
				<ContentHeader title={course.title} points={0} className="mb-4" />
			</div>
			<div id="course-content-overview" className="columns-1 sm:columns-2 gap-6 mt-4">
				{course.units.map((unit, index) => (
					<CourseContentUnitItem
						key={index}
						index={index}
						unit={unit}
						active={index === 0}
						className="break-inside-avoid border-b border-gray-300 px-6 py-3 mb-2"
					/>
				))}
				<CourseContentChallenge challenge={course.challenge} />
			</div>
		</div>
	)
}
