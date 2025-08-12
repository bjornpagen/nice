"use client"

import { Book } from "lucide-react"
import Link from "next/link"
import * as React from "react"

type UnitSummary = {
	id: string
	title: string
	path: string
}

type CourseSummary = {
	id: string
	slug: string
	title: string
	path: string
	units: UnitSummary[]
}

type SubjectData = {
	slug: string
	title: string
	courses: CourseSummary[]
}

export function Content({ subjectPromise }: { subjectPromise: Promise<SubjectData | undefined> }) {
	const subject = React.use(subjectPromise)
	if (!subject) {
		return <div className="bg-gray-100 py-10 px-4">Subject not found</div>
	}

	return (
		<div className="bg-gray-100 py-10 px-4">
			<div className="max-w-5xl mx-auto flex flex-col gap-6">
				{subject.courses.map((course) => (
					<SubjectCourseItem course={course} key={course.path} />
				))}
			</div>
		</div>
	)
}

function SubjectCourseItem({ course }: { course: CourseSummary }) {
	return (
		<div className="bg-white border border-gray-200 rounded-xs p-6 flex gap-6 items-start">
			<div className="h-10 w-10 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center text-white">
				<Book size={20} />
			</div>
			<div className="flex-1">
				<Link href={course.path} className="text-sm font-semibold mb-2 hover:underline cursor-pointer block w-fit">
					{course.title}
				</Link>

				{course.units.length > 0 && (
					<div className="mt-2">
						<div className="text-xs text-gray-500 mb-1">Units</div>
						<ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
							{course.units.map((unit) => (
								<li key={unit.id}>
									<Link href={unit.path} className="text-sm text-blue-700 hover:underline">
										{unit.title}
									</Link>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</div>
	)
}
