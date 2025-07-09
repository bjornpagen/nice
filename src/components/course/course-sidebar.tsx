"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { cn } from "@/lib/utils"
import { CourseSidebarCourseChallenge } from "./course-sidebar-course-challenge"
import { CourseSidebarCourseItem } from "./course-sidebar-course-item"
import { CourseSidebarUnitItem } from "./course-sidebar-unit-item"

// TODO: Extract this to a separate file.
export type Unit = {
	slug: string
	path: string
	title: string
	lessons: number
}

export type Challenge = {
	path: string
}

/**
 * A course is a collection of units.
 */
export type Course = {
	slug: string
	path: string
	title: string
	units: Unit[]
	challenge: Challenge
}

export function CourseSidebar({ coursePromise, className }: { coursePromise: Promise<Course>; className?: string }) {
	const course = React.use(coursePromise)
	if (course.slug === "" || course.path === "" || course.title === "") {
		throw errors.new("course data is invalid")
	}

	return (
		<div id="course-sidebar" className={cn("p-4", className)}>
			<CourseSidebarCourseItem course={course} />

			<div id="course-sidebar-unit-items" className="divide-y divide-gray-200 mb-4">
				{course.units.map((unit, index) => (
					<CourseSidebarUnitItem key={index} index={index} unit={unit} />
				))}
			</div>

			<CourseSidebarCourseChallenge challenge={course.challenge} />
		</div>
	)
}
