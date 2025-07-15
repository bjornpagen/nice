"use client"

import { BookOpen } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { CoursePage_Course } from "./page"

export function CourseTab({
	course,
	unitCount,
	lessonCount
}: {
	course: CoursePage_Course
	unitCount: number
	lessonCount: number
}) {
	const pathname = usePathname()
	if (pathname === course.path) {
		return (
			<div className="bg-blue-100 border-blue-200 border-l-4 border-l-blue-600 px-4 py-3 shadow-sm">
				<Link href={course.path} className="w-full flex items-center space-x-3">
					<div className="w-10 h-10 bg-cyan-100 flex items-center justify-center">
						<span className="text-cyan-600 text-sm font-bold">
							<BookOpen className="w-4 h-4" />
						</span>
					</div>
					<div>
						<h1 className="text-sm font-bold text-gray-800">{course.title}</h1>
						<p className="text-xs text-gray-500 mt-1">
							{unitCount} UNITS • {lessonCount} LESSONS
						</p>
					</div>
				</Link>
			</div>
		)
	}

	return (
		<div className="px-4 py-3 hover:shadow-sm hover:bg-blue-100 transition-all border-b border-gray-100">
			<Link href={course.path} className="w-full flex items-center space-x-3">
				<div className="w-10 h-10 bg-cyan-100 flex items-center justify-center">
					<span className="text-cyan-600 text-sm font-bold">
						<BookOpen className="w-4 h-4" />
					</span>
				</div>
				<div>
					<h1 className="text-sm font-bold text-gray-800">{course.title}</h1>
					<p className="text-xs text-gray-500 mt-1">
						{unitCount} UNITS • {lessonCount} LESSONS
					</p>
				</div>
			</Link>
		</div>
	)
}
