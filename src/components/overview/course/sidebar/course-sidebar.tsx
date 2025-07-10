"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import type { Course, CourseResource, Lesson, Prettify, Unit } from "@/components/overview/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { CourseSidebarCourseChallenge } from "./course-sidebar-course-challenge"
import { CourseSidebarCourseItem } from "./course-sidebar-course-item"
import { CourseSidebarUnitItem } from "./course-sidebar-unit-item"

export type CourseSidebarData = Prettify<
	Pick<Course, "slug" | "path" | "title"> & {
		units: Array<
			Pick<Unit, "path" | "title"> & {
				lessons: readonly Pick<Lesson, "slug">[]
			}
		>
		resources: Array<Pick<CourseResource, "type" | "path">>
	}
>

export function CourseSidebar({
	coursePromise,
	className
}: {
	coursePromise: Promise<CourseSidebarData>
	className?: string
}) {
	const course = React.use(coursePromise)
	if (course.slug === "" || course.path === "" || course.title === "") {
		throw errors.new("course data is invalid")
	}

	const challenge: CourseSidebarData["resources"][number] | undefined = course.resources.find(
		(resource) => resource.type === "CourseChallenge"
	)

	return (
		<div id="course-sidebar" className={cn("bg-white border-r border-gray-200 flex flex-col h-full", className)}>
			<div className="px-6 pb-6 flex-1 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="mt-4">
						<CourseSidebarCourseItem course={course} />
					</div>

					<div id="course-sidebar-unit-items" className="divide-y divide-gray-200 mb-4">
						{course.units.map((unit, index) => (
							<CourseSidebarUnitItem key={index} index={index} unit={unit} />
						))}
					</div>

					{challenge != null && <CourseSidebarCourseChallenge challenge={challenge} />}
				</ScrollArea>
			</div>
		</div>
	)
}
