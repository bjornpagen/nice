"use client"

import * as errors from "@superbuilders/errors"
import _ from "lodash"
import Image from "next/image"
import { notFound, usePathname } from "next/navigation"
import * as React from "react"
import { useSidebar } from "@/components/ui/sidebar"
import type { AssessmentProgress } from "@/lib/data/progress"
import { cn } from "@/lib/utils"
import { type Course, getCourseMaterials } from "@/lib/v2/types"
import { CourseSidebarCourseBreadcrumbs } from "./course-sidebar-course-breadcrumbs"
import { CourseSidebarCourseCarousel } from "./course-sidebar-course-carousel"
import { CourseSidebarCourseMaterials } from "./course-sidebar-course-materials"
import courseIconForeground from "./images/7a86b575f4360619-course-icon.svg"
import courseIconBackground from "./images/course-accordion-bg.png"

export function CourseSidebar({
	coursePromise,
	progressPromise,
	className
}: {
	coursePromise: Promise<Course | undefined>
	progressPromise: Promise<Map<string, AssessmentProgress>>
	className?: string
}) {
	const pathname = usePathname()
	const { open } = useSidebar()

	const course = React.use(coursePromise)
	const progressMap = React.use(progressPromise)
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

	// If we can't find an exact match, try to find a reasonable fallback
	let finalCursor = cursor
	if (cursor === -1) {
		// For quiz/test pages, try to find any quiz/test in the materials
		if (pathname.includes("/quiz/") || pathname.includes("/test/")) {
			finalCursor = _.findIndex(materials, (material) => material.type === "Quiz" || material.type === "UnitTest")
		}

		// If still no match, default to the first material
		if (finalCursor === -1 && materials.length > 0) {
			finalCursor = 0
		}
	}

	if (finalCursor === -1) {
		throw errors.new(`course sidebar: material not found: ${pathname}`)
	}

	const material = materials[finalCursor]
	if (material == null) {
		throw errors.new(`course sidebar: material not found: ${pathname}`)
	}

	const [index, setIndex] = React.useState<number>(_.clamp(finalCursor, 0, materials.length - 1))

	return (
		<div
			id="course-sidebar"
			className={cn("bg-gray-100 border-r border-gray-200 h-full p-4", className, !open && "hidden")}
		>
			<div className="px-6 pb-4 flex-1 overflow-hidden bg-white rounded-md shadow-md">
				<div id="course-sidebar-course-title" className="text-lg font-bold mt-4">
					<div className="flex items-center gap-4">
						<div className="w-10 h-10 rounded flex items-center justify-center relative">
							<Image src={courseIconBackground} alt="Course icon background" fill className="object-cover rounded" />
							<Image
								src={courseIconForeground}
								alt="Course icon foreground"
								className="w-6 h-6 relative z-10 brightness-0 invert"
							/>
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

				<CourseSidebarCourseMaterials
					index={index}
					materials={materials}
					pathname={pathname}
					progressMap={progressMap}
				/>

				{/* Separator */}
				<div className="h-px my-4 bg-gray-200" />

				<CourseSidebarCourseBreadcrumbs
					course={_.pick(course, ["path", "title"])}
					material={material}
					pathname={pathname}
				/>

				<div id="course-sidebar-footer" className="p-2 my-4 flex flex-col gap-2 text-center">
					<div className="text-xs text-gray-600">© 2025 Nice Academy</div>
					<div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 justify-center">
						<span className="hover:text-gray-700 underline cursor-not-allowed whitespace-nowrap">Terms of use</span>
						<span className="hover:text-gray-700 underline cursor-not-allowed whitespace-nowrap">Privacy Policy</span>
						<span className="hover:text-gray-700 underline cursor-not-allowed whitespace-nowrap">Cookie Notice</span>
						<span className="hover:text-gray-700 underline cursor-not-allowed whitespace-nowrap">
							Accessibility Statement
						</span>
					</div>
				</div>
			</div>
		</div>
	)
}
