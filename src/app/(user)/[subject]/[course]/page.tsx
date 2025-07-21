import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchCoursePageData } from "@/lib/data/course"
import { type AssessmentProgress, getUserUnitProgress } from "@/lib/data/progress"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import type { CoursePageData } from "@/lib/types/page"
import { Content } from "./components/content"

export default async function CoursePage({ params }: { params: Promise<{ subject: string; course: string }> }) {
	const user = await currentUser()
	const courseDataPromise: Promise<CoursePageData> = params.then(fetchCoursePageData)

	const progressPromise: Promise<Map<string, AssessmentProgress>> = courseDataPromise.then((courseData) => {
		if (user) {
			const publicMetadataResult = errors.trySync(() => parseUserPublicMetadata(user.publicMetadata))
			if (publicMetadataResult.error) {
				logger.warn("invalid user public metadata, cannot fetch progress", {
					userId: user.id,
					error: publicMetadataResult.error
				})
				return new Map<string, AssessmentProgress>()
			}
			if (publicMetadataResult.data.sourceId) {
				return getUserUnitProgress(publicMetadataResult.data.sourceId, courseData.course.id)
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
