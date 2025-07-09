"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { CourseSidebarCourseItem } from "./course-sidebar-course-item"
import { CourseSidebarUnitItem } from "./course-sidebar-unit-item"

// TODO: Extract this to a separate file.
export type Unit = {
	slug: string
	path: string
	title: string
	lessons: number
}

/**
 * A course is a collection of units.
 */
export type Course = {
	slug: string
	path: string
	title: string
	units: Unit[]
}

export async function CourseSidebar({
	coursePromise,
	className
}: {
	coursePromise: Promise<Course>
	className?: string
}) {
	const course = React.use(coursePromise)
	if (course.slug === "" || course.path === "" || course.title === "") {
		throw errors.new("course data is invalid")
	}

	return (
		<div id="course-sidebar" className={className}>
			<CourseSidebarCourseItem course={course} />
			{course.units.map((unit, index) => (
				<CourseSidebarUnitItem key={index} index={index} unit={unit} />
			))}
		</div>
	)
}
