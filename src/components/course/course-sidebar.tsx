"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import _ from "lodash"
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
	course,
	slug,
	className
}: {
	course: Course
	slug?: string
	className?: string
}) {
	logger.info("initializing course sidebar", { course: _.omit(course, "units") })

	if (course.slug === "" || course.path === "" || course.title === "") {
		throw errors.new("course is invalid")
	}

	return (
		<div id="course-sidebar" className={className}>
			<CourseSidebarCourseItem course={course} active={slug === course.slug} />
			{course.units.map((unit, index) => (
				<CourseSidebarUnitItem key={index} index={index} unit={unit} active={unit.slug === slug} />
			))}
		</div>
	)
}
