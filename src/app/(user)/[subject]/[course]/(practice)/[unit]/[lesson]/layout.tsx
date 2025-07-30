import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type * as React from "react"
import { fetchCoursePageData } from "@/lib/data/course"
import { fetchLessonLayoutData } from "@/lib/data/lesson"
import { type AssessmentProgress, getUserUnitProgress } from "@/lib/data/progress"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import type { LessonLayoutData } from "@/lib/types/page"
import type { Course as CourseV2 } from "@/lib/types/sidebar"
import { assertNoEncodedColons, normalizeParams } from "@/lib/utils"
import { LessonLayout } from "./components/lesson-layout"

// The layout component is NOT async. It orchestrates promises and renders immediately.
export default function Layout({
	params,
	children
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string }>
	children: React.ReactNode
}) {
	// Normalize params to handle encoded characters
	const normalizedParamsPromise = normalizeParams(params)

	const dataPromise: Promise<LessonLayoutData> = normalizedParamsPromise.then(async (resolvedParams) => {
		return fetchLessonLayoutData(resolvedParams)
	})
	const userPromise = currentUser()

	// Create a promise for the v2 course format using real data
	const courseV2Promise: Promise<CourseV2 | undefined> = normalizedParamsPromise.then(async (resolvedParams) => {
		// Defensive check: normalized URLs should not have encoded colons
		assertNoEncodedColons(resolvedParams.subject, "lesson layout subject param")
		assertNoEncodedColons(resolvedParams.course, "lesson layout course param")
		assertNoEncodedColons(resolvedParams.unit, "lesson layout unit param")
		assertNoEncodedColons(resolvedParams.lesson, "lesson layout lesson param")

		// Use fetchCoursePageData to get the actual course data
		const courseResult = await errors.try(
			fetchCoursePageData(
				{
					subject: resolvedParams.subject,
					course: resolvedParams.course
				},
				{ skip: { questions: true } }
			)
		)

		if (courseResult.error) {
			logger.error("failed to fetch course data for sidebar", { error: courseResult.error })
			return undefined
		}

		// Make sure the courseData exists
		const courseData = courseResult.data.course

		// Get the current path to inject into the sidebar structure
		const pathname = `/${resolvedParams.subject}/${resolvedParams.course}/${resolvedParams.unit}/${resolvedParams.lesson}`

		// Extract resource type from path
		let resourceType = ""
		if (resolvedParams.lesson.startsWith("e/")) {
			resourceType = "e"
		} else if (resolvedParams.lesson.startsWith("a/")) {
			resourceType = "a"
		} else if (resolvedParams.lesson.startsWith("v/")) {
			resourceType = "v"
		}

		// Convert the v1 course to v2 format
		const courseV2: CourseV2 = {
			id: courseData.id,
			slug: courseData.slug,
			path: courseData.path,
			type: "Course" as const,
			title: courseData.title,
			description: courseData.description,

			// Convert units
			units: courseData.units.map((unit) => {
				// Map each v1 unit to v2 format
				const unitV2 = {
					id: unit.id,
					slug: unit.slug,
					path: unit.path,
					type: "Unit" as const,
					title: unit.title,
					description: unit.description,

					// Convert lessons
					lessons: unit.children
						.filter((child) => child.type === "Lesson")
						.map((lesson) => {
							// Find matching lesson for current URL path
							const isCurrentLesson = pathname.includes(`/${lesson.slug}/`)

							// Find the original index in unit.children to preserve ordering
							const originalIndex = unit.children.findIndex((child) => child.id === lesson.id)

							// Create base lesson format
							const lessonBase = {
								id: lesson.id,
								slug: lesson.slug,
								path: lesson.path,
								type: "Lesson" as const,
								title: lesson.title,
								sortOrder: originalIndex, // Preserve original ordering

								// Convert resources within lessons
								resources: lesson.children.map((resource) => {
									const baseResource = {
										id: resource.id,
										slug: resource.slug,
										path: resource.path,
										title: resource.title
									}

									// Create the appropriate resource type based on the original type
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
							}

							// If this is the current lesson, add a special resource with the exact current path
							if (isCurrentLesson && resourceType) {
								const pathParts = pathname.split("/")
								const resourceSlug = pathParts[pathParts.length - 1] || ""

								// Only add special resource if we have a valid slug
								if (resourceSlug) {
									// Add the appropriate resource based on type
									if (resourceType === "e") {
										const exerciseResource = {
											id: resourceSlug,
											slug: resourceSlug,
											path: pathname,
											title: `Exercise: ${resourceSlug}`,
											type: "Exercise" as const,
											data: { questions: [] }
										}
										lessonBase.resources.push(exerciseResource)
									} else if (resourceType === "a") {
										const articleResource = {
											id: resourceSlug,
											slug: resourceSlug,
											path: pathname,
											title: `Article: ${resourceSlug}`,
											type: "Article" as const,
											data: {}
										}
										lessonBase.resources.push(articleResource)
									} else if (resourceType === "v") {
										const videoResource = {
											id: resourceSlug,
											slug: resourceSlug,
											path: pathname,
											title: `Video: ${resourceSlug}`,
											type: "Video" as const,
											data: {}
										}
										lessonBase.resources.push(videoResource)
									}

									logger.info("added special resource with exact path", {
										path: pathname,
										resourceType
									})
								}
							}

							return lessonBase
						}),

					// Convert unit-level assessments (quizzes, unit tests)
					resources: unit.children
						.filter((child) => child.type === "Quiz" || child.type === "UnitTest")
						.map((assessment) => {
							// Find the last lesson in this unit to construct correct path
							const lessons = unit.children.filter((child) => child.type === "Lesson")
							const lastLesson = lessons[lessons.length - 1]

							// Find the original index in unit.children to preserve ordering
							const originalIndex = unit.children.findIndex((child) => child.id === assessment.id)

							// Construct the correct path: unit/lastLesson/quiz|test/slug
							// Map assessment types to URL segments
							const pathSegment = assessment.type === "Quiz" ? "quiz" : "test"
							const correctPath = lastLesson
								? `${unit.path}/${lastLesson.slug}/${pathSegment}/${assessment.slug}`
								: assessment.path // fallback to original path if no lessons found

							if (assessment.type === "Quiz") {
								return {
									id: assessment.id,
									slug: assessment.slug,
									path: correctPath,
									type: "Quiz" as const,
									title: assessment.title,
									sortOrder: originalIndex, // Preserve original ordering
									data: { questions: [] }
								}
							}
							return {
								id: assessment.id,
								slug: assessment.slug,
								path: correctPath,
								type: "UnitTest" as const,
								title: assessment.title,
								sortOrder: originalIndex, // Preserve original ordering
								data: { questions: [] }
							}
						})
				}

				return unitV2
			}),

			// Convert course challenges
			resources: courseData.challenges.map((challenge) => ({
				id: challenge.id,
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
	const progressPromise: Promise<Map<string, AssessmentProgress>> = Promise.all([userPromise, dataPromise]).then(
		([user, data]) => {
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
					return getUserUnitProgress(publicMetadataResult.data.sourceId, data.courseData.id)
				}
			}
			return new Map<string, AssessmentProgress>()
		}
	)

	return (
		<LessonLayout dataPromise={dataPromise} progressPromise={progressPromise} coursePromise={courseV2Promise}>
			{children}
		</LessonLayout>
	)
}
