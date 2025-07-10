"use client"

import { notFound } from "next/navigation"
import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Course, CourseResource, Lesson, Prettify, Unit } from "@/lib/v2/types"
import { CourseSidebarCourseCarousel } from "./course-sidebar-course-carousel"

export type CourseSidebarData = Prettify<
	Pick<Course, "slug" | "path" | "title"> & {
		units: Array<
			Pick<Unit, "path" | "title"> & {
				lessons: Omit<Lesson, "slug">[]
				resources: Array<Pick<CourseResource, "type" | "path">>
			}
		>
	}
>

export function CourseSidebar({
	coursePromise,
	className
}: {
	coursePromise: Promise<CourseSidebarData | undefined>
	className?: string
}) {
	const course = React.use(coursePromise)
	if (course == null) {
		notFound()
	}

	return (
		<div id="course-sidebar" className={cn("bg-gray-200 border-r border-gray-200 flex flex-col h-full", className)}>
			<div className="px-6 pb-6 flex-1 overflow-hidden bg-white">
				<ScrollArea className="h-full">
					<div className="mt-4">
						<CourseSidebarCourseCarousel course={course} />
					</div>

					{/* 
					<div id="course-sidebar-unit-items" className="divide-y divide-gray-200 mb-4">
						{course.units.map((unit, index) => (
							<CourseSidebarUnitItem key={index} index={index} unit={unit} />
						))}
					</div> 
					*/}
				</ScrollArea>
			</div>
		</div>
	)
}
