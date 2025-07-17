import { currentUser } from "@clerk/nextjs/server"
import * as React from "react"
import { fetchCoursePageData } from "@/lib/data/course"
import { type AssessmentProgress, getUserUnitProgress } from "@/lib/data/progress"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { CoursePageData } from "@/lib/types/page"
import { Content } from "./components/content"

export default async function CoursePage({ params }: { params: Promise<{ subject: string; course: string }> }) {
	const user = await currentUser()
	const courseDataPromise: Promise<CoursePageData> = params.then(fetchCoursePageData)

	const progressPromise: Promise<Map<string, AssessmentProgress>> = courseDataPromise.then((courseData) => {
		if (user?.publicMetadata) {
			const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
			if (metadataValidation.success && metadataValidation.data.sourceId) {
				return getUserUnitProgress(metadataValidation.data.sourceId, courseData.course.id)
			}
		}
		return new Map<string, AssessmentProgress>()
	})

	return (
		<React.Suspense fallback={<div className="p-8">Loading course...</div>}>
			<Content dataPromise={courseDataPromise} progressPromise={progressPromise} />
		</React.Suspense>
	)
}
