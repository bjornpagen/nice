"use client"

import * as errors from "@superbuilders/errors"
import _ from "lodash"
import { notFound, usePathname } from "next/navigation"
import * as React from "react"
import { cn } from "@/lib/utils"
import { type Course, getCourseMaterials } from "@/lib/v2/types"
import { CourseSidebarCourseBreadcrumbs } from "./course-sidebar-course-breadcrumbs"
import { CourseSidebarCourseCarousel } from "./course-sidebar-course-carousel"
import { CourseSidebarCourseMaterials } from "./course-sidebar-course-materials"

export function CourseSidebar({
	coursePromise,
	className
}: {
	coursePromise: Promise<Course | undefined>
	className?: string
}) {
	const pathname = usePathname()

	const course = React.use(coursePromise)
	if (course == null) {
		notFound()
	}

	const materials = getCourseMaterials(course)
	if (materials.length === 0) {
		throw errors.new(`course sidebar: no content found for course: ${course.title}`)
	}

	const cursor = _.findIndex(materials, (material) => {
		if (material.type === "Lesson") {
			return _.some(material.resources, (resource) => resource.path === pathname)
		}
		return material.path === pathname
	})
	if (cursor === -1) {
		throw errors.new(`course sidebar: material not found: ${pathname}`)
	}

	const material = materials[cursor]
	if (material == null) {
		throw errors.new(`course sidebar: material not found: ${pathname}`)
	}

	const [index, setIndex] = React.useState<number>(_.clamp(cursor, 0, materials.length - 1))

	return (
		<div id="course-sidebar" className={cn("bg-gray-100 border-r border-gray-200 flex flex-col h-full p-4", className)}>
			<div className="px-6 pb-4 flex-1 overflow-hidden bg-white rounded-md shadow-md">
				<div id="course-sidebar-course-title" className="text-lg font-bold mt-4">
					<div className="flex items-center gap-4">
						<div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
							<span className="w-3 h-3 bg-white rounded-sm" />
						</div>

						<span className="font-medium text-gray-900 text-xl capitalize">{course.title}</span>
					</div>
				</div>

				{/* Separator */}
				<div className="h-px my-4 bg-gray-200" />

				<div className="mt-4">
					<CourseSidebarCourseCarousel course={course} materials={materials} index={index} setIndex={setIndex} />
				</div>

				{/* Separator */}
				<div className="h-px my-4 bg-gray-200" />

				<CourseSidebarCourseMaterials index={index} materials={materials} pathname={pathname} />

				{/* Separator */}
				<div className="h-px my-4 bg-gray-200" />

				<CourseSidebarCourseBreadcrumbs
					course={_.pick(course, ["path", "title"])}
					material={material}
					pathname={pathname}
				/>

				{/* 
				<div id="course-sidebar-unit-items" className="divide-y divide-gray-200 mb-4">
					{course.units.map((unit, index) => (
						<CourseSidebarUnitItem key={index} index={index} unit={unit} />
					))}
				</div> 
				*/}
			</div>
		</div>
	)
}
