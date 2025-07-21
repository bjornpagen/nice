"use client"

import { Book } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import type { ProfileSubject } from "@/lib/types/domain"

export function SubjectContent({ subjectPromise }: { subjectPromise: Promise<ProfileSubject | undefined> }) {
	const subject = React.use(subjectPromise)
	if (!subject) {
		return <div>Subject not found</div>
	}

	return (
		<div>
			<div className="w-full bg-blue-950 py-8">
				<div className="px-6 max-w-6xl mx-auto flex items-center">
					<h1 className="text-3xl font-medium text-white tracking-tight capitalize">{subject.title}</h1>
				</div>
			</div>

			<div className="bg-gray-100 py-10 px-4">
				<div className="max-w-5xl mx-auto flex flex-col gap-6">
					{subject.courses.map((course) => (
						<SubjectCourseItem course={course} key={course.path} />
					))}
				</div>
			</div>
		</div>
	)
}

function SubjectCourseItem({ course }: { course: ProfileSubject["courses"][number] }) {
	return (
		<div className="bg-white border border-gray-200 rounded-xs p-6 flex gap-6 items-start">
			{/* faux icon */}
			<div className="h-10 w-10 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center text-white">
				<Book size={20} />
			</div>
			<div className="flex-1">
				<Link href={course.path} className="text-sm font-semibold mb-2 hover:underline cursor-pointer block w-fit">
					{course.title}
				</Link>
			</div>
		</div>
	)
}
