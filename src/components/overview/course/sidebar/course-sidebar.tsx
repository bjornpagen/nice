"use client"

import _ from "lodash"
import { notFound } from "next/navigation"
import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Course, CourseResource } from "@/lib/v2/types"
import { CourseSidebarCourseChallenge } from "./course-sidebar-course-challenge"
import { CourseSidebarCourseItem } from "./course-sidebar-course-item"
import { CourseSidebarUnitItem } from "./course-sidebar-unit-item"

export function CourseSidebar({
	coursePromise,
	className
}: {
	coursePromise: Promise<Course | undefined>
	className?: string
}) {
	const course = React.use(coursePromise)
	if (course == null) {
		notFound()
	}

	const challenge: CourseResource | undefined = course.resources.find((resource) => resource.type === "CourseChallenge")

	return (
		<div id="course-sidebar" className={cn("bg-white border-r border-gray-200 flex flex-col h-full", className)}>
			<div className="px-6 pb-6 flex-1 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="mt-4">
						<CourseSidebarCourseItem course={_.pick(course, ["path", "title", "units"])} />
					</div>

					<div id="course-sidebar-unit-items" className="divide-y divide-gray-200 mb-4">
						{course.units.map((unit, index) => (
							<CourseSidebarUnitItem key={index} index={index} unit={_.pick(unit, ["path", "title", "lessons"])} />
						))}
					</div>

					{challenge != null && <CourseSidebarCourseChallenge challenge={_.pick(challenge, ["path"])} />}
				</ScrollArea>
			</div>
		</div>
	)
}
