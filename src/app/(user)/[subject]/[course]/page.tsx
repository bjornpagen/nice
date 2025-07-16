import * as React from "react"
import { fetchCoursePageData } from "@/lib/data/course"
import type { CoursePageData } from "@/lib/types/page"
import { Content } from "./components/content"

export default function CoursePage({ params }: { params: Promise<{ subject: string; course: string }> }) {
	const courseDataPromise: Promise<CoursePageData> = params.then(fetchCoursePageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading course...</div>}>
			<Content dataPromise={courseDataPromise} />
		</React.Suspense>
	)
}
