"use client"

import _ from "lodash"
import { BookOpen } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Course } from "./course-sidebar"

export function CourseSidebarCourseItem({ course, className }: { course: Course; className?: string }) {
	const pathname = usePathname()

	let outerClassName = "px-4 py-3 hover:shadow-sm hover:bg-blue-100 transition-all"
	if (pathname === course.path) {
		outerClassName = "bg-blue-100 border-blue-200 border-l-4 border-l-blue-600 px-4 py-3 shadow-sm"
	}

	return (
		<div id="course-sidebar-course-item" className={cn(outerClassName, className)}>
			<Link href={course.path} className="w-full flex items-center space-x-3">
				<div className="w-10 h-10 bg-blue-100 flex items-center justify-center">
					<span className="text-blue-600 text-sm font-bold">
						<BookOpen className="w-4 h-4" />
					</span>
				</div>
				<div>
					<h1 className="text-sm font-bold text-gray-800 capitalize">{course.title}</h1>
					<p className="text-xs text-gray-500 mt-1">
						{course.units.length} UNITS • {_.sumBy(course.units, "lessons")} LESSONS
					</p>
				</div>
			</Link>
		</div>
	)
}
