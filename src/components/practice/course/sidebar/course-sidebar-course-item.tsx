"use client"

import _ from "lodash"
import { BookOpen } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { CourseSidebarData } from "./course-sidebar"

export function CourseSidebarCourseItem({
	course,
	className
}: {
	course: Pick<CourseSidebarData, "path" | "title" | "units">
	className?: string
}) {
	const pathname = usePathname()

	let outerClassName = ""
	let innerClassName = "bg-blue-100"
	if (pathname === course.path) {
		outerClassName = "bg-blue-100 border-blue-200 border-l-4 border-l-blue-600"
		innerClassName = "bg-white"
	}

	return (
		<div
			id="course-sidebar-course-item"
			className={cn("px-4 py-3 hover:shadow-sm hover:bg-blue-100 transition-all", outerClassName, className)}
		>
			<Link href={course.path} className="w-full flex items-center space-x-3">
				<div className={cn("w-10 h-10 flex items-center justify-center transition-all", innerClassName)}>
					<span className="text-blue-600 text-sm font-bold">
						<BookOpen className="w-4 h-4" />
					</span>
				</div>
				<div>
					<h1 className="text-sm font-bold text-gray-800 capitalize">{course.title}</h1>
					<p className="text-xs text-gray-500 mt-1 uppercase">
						{course.units.length} Units • {_.sumBy(course.units, (unit) => unit.lessons.length)} Lessons
					</p>
				</div>
			</Link>
		</div>
	)
}
