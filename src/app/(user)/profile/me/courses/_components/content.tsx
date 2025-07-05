"use client"

import * as React from "react"
import type { Course, Unit } from "../page"
import { CourseCard } from "./course-card"

export function Content({
	coursesPromise,
	unitsPromise
}: {
	coursesPromise: Promise<Course[]>
	unitsPromise: Promise<Unit[]>
}) {
	const courses = React.use(coursesPromise)
	const units = React.use(unitsPromise)

	const unitsByCourseId = React.useMemo(() => {
		const map = new Map<string, Unit[]>()
		for (const unit of units) {
			if (!map.has(unit.courseId)) {
				map.set(unit.courseId, [])
			}
			map.get(unit.courseId)?.push(unit)
		}
		// Sort units by their ordering
		for (const unitList of map.values()) {
			unitList.sort((a, b) => a.ordering - b.ordering)
		}
		return map
	}, [units])

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
			{courses.map((course) => (
				<CourseCard key={course.id} course={course} units={unitsByCourseId.get(course.id) || []} />
			))}
		</div>
	)
}
