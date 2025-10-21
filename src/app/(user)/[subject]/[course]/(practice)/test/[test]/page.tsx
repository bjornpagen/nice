import { requireUser } from "@/lib/auth/require-user"
import * as logger from "@superbuilders/slog"
import { connection } from "next/server"
import * as React from "react"
import { fetchCourseChallengePage_LayoutData, fetchCourseChallengePage_TestData } from "@/lib/data/assessment"
import { type AssessmentProgress, getUserUnitProgress } from "@/lib/data/progress"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { CourseChallengeLayoutData, CourseChallengePageData } from "@/lib/types/page"
import type { Course as CourseV2 } from "@/lib/types/sidebar"
import { normalizeParams } from "@/lib/utils"
import { ChallengeLayout } from "./components/challenge-layout"
import { Content } from "./components/content"
import { getAssessmentItem } from "@/lib/data/fetchers/qti"

export default async function CourseChallengePage({
	params
}: {
	params: Promise<{ subject: string; course: string; test: string }>
}) {
	// Opt into dynamic rendering to prevent prerendering issues with currentUser() and OneRoster API calls
	await connection()
	const normalizedParamsPromise = normalizeParams(params)
const userPromise = requireUser()
	const layoutDataPromise: Promise<CourseChallengeLayoutData> = normalizedParamsPromise.then(
		fetchCourseChallengePage_LayoutData
	)
	const testDataPromise: Promise<CourseChallengePageData> = normalizedParamsPromise.then(
		fetchCourseChallengePage_TestData
	)

	const expectedIdentifiersPromisesPromise: Promise<Promise<string[]>[]> = testDataPromise.then((data) =>
		data.questions.map((q) => getAssessmentItem(q.id).then((item) => (item.responseDeclarations ?? []).map((d) => d.identifier)))
	)

	// Transform CourseChallengeLayoutData to CourseV2 format for the practice sidebar
const coursePromise: Promise<CourseV2 | undefined> = layoutDataPromise.then((courseData) => {
		// Convert the course data to V2 format
		const courseV2: CourseV2 = {
			id: courseData.course.id,
			slug: courseData.course.path.split("/").pop() || "",
			path: courseData.course.path,
			type: "Course" as const,
			title: courseData.course.title,
			description: courseData.course.description,

			// Convert units to V2 format
			units: courseData.course.units.map((unit) => ({
				id: unit.id,
				slug: unit.slug,
				path: unit.path,
				type: "Unit" as const,
				title: unit.title,
				description: unit.description,

				// Convert lessons
				lessons: unit.children
					.filter((child) => child.type === "Lesson")
					.map((lesson) => ({
						id: lesson.id,
						slug: lesson.slug,
						path: lesson.path,
						type: "Lesson" as const,
						title: lesson.title,

						// Convert lesson resources
						resources: lesson.children.map((resource) => {
							const baseResource = {
								id: resource.id,
								componentResourceSourcedId: resource.componentResourceSourcedId,
								slug: resource.slug,
								path: resource.path,
								title: resource.title
							}

							if (resource.type === "Article") {
								return {
									...baseResource,
									type: "Article" as const,
									data: {}
								}
							}
							if (resource.type === "Exercise") {
								return {
									...baseResource,
									type: "Exercise" as const,
									data: { questions: [] }
								}
							}
							return {
								...baseResource,
								type: "Video" as const,
								data: {}
							}
						})
					})),

				// Convert unit-level assessments (quizzes, unit tests)
				resources: unit.children
					.filter((child) => child.type === "Quiz" || child.type === "UnitTest")
					.map((assessment) => {
						// Find the last lesson in this unit to construct correct path
						const lessons = unit.children.filter((child) => child.type === "Lesson")
						const lastLesson = lessons[lessons.length - 1]

						// Construct the correct path: unit/lastLesson/quiz|test/slug
						const pathSegment = assessment.type === "Quiz" ? "quiz" : "test"
						const correctPath = lastLesson
							? `${unit.path}/${lastLesson.slug}/${pathSegment}/${assessment.slug}`
							: assessment.path

						if (assessment.type === "Quiz") {
							return {
								id: assessment.id,
								componentResourceSourcedId: assessment.componentResourceSourcedId,
								slug: assessment.slug,
								path: correctPath,
								type: "Quiz" as const,
								title: assessment.title,
								data: { questions: [] }
							}
						}
						return {
							id: assessment.id,
							componentResourceSourcedId: assessment.componentResourceSourcedId,
							slug: assessment.slug,
							path: correctPath,
							type: "UnitTest" as const,
							title: assessment.title,
							data: { questions: [] }
						}
					})
			})),

			// Convert course challenges
			resources: courseData.challenges.map((challenge) => ({
				id: challenge.id,
				componentResourceSourcedId: challenge.componentResourceSourcedId,
				slug: challenge.slug,
				path: challenge.path,
				type: "CourseChallenge" as const,
				title: challenge.title,
				data: { questions: [] }
			}))
		}

		return courseV2
	})

	// Get progress data
const progressPromise: Promise<Map<string, AssessmentProgress>> = Promise.all([layoutDataPromise, userPromise]).then(
    ([courseData, user]) => {
        const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
        if (!parsed.success) {
            logger.warn("invalid user public metadata, cannot fetch progress", {
                userId: user.id,
                error: parsed.error
            })
            return new Map<string, AssessmentProgress>()
        }
        if (parsed.data.sourceId) {
            return getUserUnitProgress(parsed.data.sourceId, courseData.course.id)
        }
        return new Map<string, AssessmentProgress>()
    }
)

	return (
		<ChallengeLayout coursePromise={coursePromise} progressPromise={progressPromise}>
			<React.Suspense>
				<Content testDataPromise={testDataPromise} expectedIdentifiersPromisesPromise={expectedIdentifiersPromisesPromise} />
			</React.Suspense>
		</ChallengeLayout>
	)
}
