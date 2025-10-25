import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { stashBundle, requireBundle } from "@/lib/course-bundle/store"
import {
	getAllCoursesBySlug,
	getCourseResourceBundle,
	getCourseResourceBundleLookups,
	type CourseResourceBundle
} from "@/lib/data/fetchers/oneroster"
import { getAssessmentTest } from "@/lib/data/fetchers/qti"
import { ComponentMetadataSchema, CourseMetadataSchema } from "@/lib/metadata/oneroster"
import type { ComponentMetadata } from "@/lib/metadata/oneroster"
import { resolveAllQuestionsForTestFromXml } from "@/lib/qti-resolution"
import type {
	Article,
	Course,
	CourseChallenge,
	ExerciseInfo,
	Lesson,
	Quiz,
	Unit,
	UnitChild,
	UnitTest,
	Video
} from "@/lib/types/domain"
import type { CoursePageData, LessonLayoutData, UnitPageData } from "@/lib/types/page"
import { assertNoEncodedColons } from "@/lib/utils"
import type { ComponentResourceRead, CourseComponentRead } from "@/lib/oneroster"

function removeNiceAcademyPrefix(title: string): string {
	const prefix = "Nice Academy - "
	return title.startsWith(prefix) ? title.substring(prefix.length).trim() : title
}

function requireSortOrder(component: CourseComponentRead, context: string): number {
	if (typeof component.sortOrder !== "number") {
		logger.error("component missing sortOrder", {
			componentId: component.sourcedId,
			context
		})
		throw errors.new("component sortOrder missing")
	}
	return component.sortOrder
}

async function buildExerciseQuestionMap(bundle: CourseResourceBundle, skipQuestions: boolean) {
	const questionCounts = new Map<string, number>()
	const exerciseResources = bundle.resources.filter((resource) => resource.metadata.khanActivityType === "Exercise")

	if (skipQuestions) {
		for (const resource of exerciseResources) {
			questionCounts.set(resource.sourcedId, 5)
		}
		return questionCounts
	}

	const results = await Promise.all(
		exerciseResources.map(async (resource) => {
			const testResult = await errors.try(getAssessmentTest(resource.sourcedId))
			if (testResult.error) {
				logger.error("failed to fetch assessment test for exercise", {
					courseId: bundle.courseId,
					resourceSourcedId: resource.sourcedId,
					error: testResult.error
				})
				return { resourceId: resource.sourcedId, count: 0 }
			}

			const resolvedResult = await errors.try(resolveAllQuestionsForTestFromXml(testResult.data))
			if (resolvedResult.error) {
				logger.error("failed to resolve questions for exercise", {
					courseId: bundle.courseId,
					resourceSourcedId: resource.sourcedId,
					error: resolvedResult.error
				})
				return { resourceId: resource.sourcedId, count: 0 }
			}

			return { resourceId: resource.sourcedId, count: resolvedResult.data.length }
		})
	)

	for (const entry of results) {
		questionCounts.set(entry.resourceId, entry.count)
	}

	return questionCounts
}

function ensureCourseMetadata(courseMetadataResult: ReturnType<typeof CourseMetadataSchema.safeParse>) {
	if (!courseMetadataResult.success) {
		logger.error("failed to parse course metadata", { error: courseMetadataResult.error })
		throw errors.wrap(courseMetadataResult.error, "invalid course metadata")
	}
	return courseMetadataResult.data
}

export async function fetchCoursePageData(
	params: { subject: string; course: string },
	options?: { skipQuestions?: boolean }
): Promise<CoursePageData> {
	logger.info("fetchCoursePageData (bundle) called", { params, options })

	assertNoEncodedColons(params.course, "fetchCoursePageData course parameter")
	assertNoEncodedColons(params.subject, "fetchCoursePageData subject parameter")

	const courseResult = await errors.try(getAllCoursesBySlug(params.course))
	if (courseResult.error) {
		logger.error("failed to fetch courses by slug", { slug: params.course, error: courseResult.error })
		throw errors.wrap(courseResult.error, "fetch courses by slug")
	}

	const courseRecord = courseResult.data[0]
	if (!courseRecord) {
		logger.error("course not found for slug", { slug: params.course })
		notFound()
	}

	const courseMetadata = ensureCourseMetadata(CourseMetadataSchema.safeParse(courseRecord.metadata))
	if (params.subject !== courseMetadata.khanSubjectSlug) {
		logger.warn("subject slug mismatch for course", {
			requestedSubject: params.subject,
			courseSlug: params.course,
			actualSubject: courseMetadata.khanSubjectSlug
		})
		notFound()
	}

	const bundle = await getCourseResourceBundle(courseRecord.sourcedId)
	const lookups = getCourseResourceBundleLookups(bundle)
	const skipQuestions = options?.skipQuestions === true
	const questionCounts = await buildExerciseQuestionMap(bundle, skipQuestions)

	const componentResourcesByComponentId = lookups.componentResourcesByComponentId

	const units: Unit[] = []
	const challenges: CourseChallenge[] = []
	let totalLessons = 0

	for (const component of bundle.courseComponents) {
		if (component.parent) continue

		const componentMetaResult = ComponentMetadataSchema.safeParse(component.metadata)
		if (!componentMetaResult.success) {
			logger.error("invalid unit component metadata", {
				componentId: component.sourcedId,
				error: componentMetaResult.error
			})
			throw errors.wrap(componentMetaResult.error, "invalid unit metadata")
		}
		const unitMeta = componentMetaResult.data

		if (unitMeta.khanSlug === "course-challenge") {
			const challengeResources = componentResourcesByComponentId.get(component.sourcedId)
			if (!challengeResources) {
				logger.warn("course challenge component has no resources in bundle", {
					courseId: bundle.courseId,
					componentId: component.sourcedId
				})
				continue
			}
			for (const cr of challengeResources) {
				const resource = lookups.resourcesById.get(cr.resource.sourcedId)
				if (!resource) {
					logger.error("course challenge resource missing from bundle", {
						courseId: bundle.courseId,
						componentResourceId: cr.sourcedId
					})
					continue
				}
				if (resource.metadata.khanActivityType !== "CourseChallenge") continue
				challenges.push({
					id: resource.sourcedId,
					componentResourceSourcedId: cr.sourcedId,
					type: "CourseChallenge",
					title: resource.title,
					slug: resource.metadata.khanSlug,
					path: `/${params.subject}/${params.course}/test/${resource.metadata.khanSlug}`,
					description: resource.metadata.khanDescription,
					questions: [],
					ordering: cr.sortOrder,
					xp: resource.metadata.xp
				})
			}
			continue
		}

		const unitChildComponents = bundle.courseComponents.filter((child) => child.parent?.sourcedId === component.sourcedId)

		const unit: Unit = {
			id: component.sourcedId,
			slug: unitMeta.khanSlug,
			title: component.title,
			description: unitMeta.khanDescription,
			path: `/${params.subject}/${params.course}/${unitMeta.khanSlug}`,
			ordering: requireSortOrder(component, "unit"),
			children: []
		}

	const assessments: Array<Quiz | UnitTest> = []
	const lessons: Lesson[] = []

	const lessonComponents: CourseComponentRead[] = []
	const pendingAssessments: Array<{
		component: CourseComponentRead
		resource: (typeof bundle.resources)[number]
		componentResource: ComponentResourceRead
	}> = []
	for (const childComponent of unitChildComponents) {
		const childMetaResult = ComponentMetadataSchema.safeParse(childComponent.metadata)
		if (!childMetaResult.success) {
				logger.error("invalid child component metadata", {
					componentId: childComponent.sourcedId,
					error: childMetaResult.error
				})
				throw errors.wrap(childMetaResult.error, "invalid child component metadata")
			}

			const resources = componentResourcesByComponentId.get(childComponent.sourcedId)
			let assessmentResource: (typeof bundle.resources)[number] | undefined
			let assessmentComponentResource: ComponentResourceRead | undefined
			if (resources) {
				const resourceMatches = resources
					.map((cr) => lookups.resourcesById.get(cr.resource.sourcedId))
					.filter((value): value is (typeof bundle.resources)[number] => Boolean(value))
				assessmentResource = resourceMatches.find((resource) => {
					return resource.metadata.khanActivityType === "Quiz" || resource.metadata.khanActivityType === "UnitTest"
				})
				if (assessmentResource) {
					assessmentComponentResource = resources.find((cr) => cr.resource.sourcedId === assessmentResource!.sourcedId)
				}
			} else {
				logger.debug("component has no resources in bundle", {
					courseId: bundle.courseId,
					componentId: childComponent.sourcedId
				})
			}

			if (assessmentResource) {
				const resource = assessmentResource
				const componentResource = assessmentComponentResource
				if (!componentResource) {
					logger.error("assessment component resource missing", {
						componentId: childComponent.sourcedId,
						resourceSourcedId: resource.sourcedId
					})
					continue
				}
			pendingAssessments.push({ component: childComponent, resource, componentResource })
			continue
		}

		lessonComponents.push(childComponent)
	}

	const lastLessonSlug = determineLastLessonSlug(lessonComponents, unitMeta, component)
	for (const pending of pendingAssessments) {
		const typeDiscriminator = pending.resource.metadata.khanActivityType === "Quiz" ? "Quiz" : "UnitTest"
		const pathSegment = typeDiscriminator === "Quiz" ? "quiz" : "test"
		if (!lastLessonSlug) {
			logger.error("assessment path missing lesson slug", {
				courseId: bundle.courseId,
				unitId: component.sourcedId,
				assessmentResourceId: pending.resource.sourcedId
			})
			throw errors.new("assessment path: missing lesson slug")
		}
		assessments.push({
			id: pending.resource.sourcedId,
			componentResourceSourcedId: pending.componentResource.sourcedId,
			type: typeDiscriminator,
			slug: pending.resource.metadata.khanSlug,
			title: pending.resource.title,
			description: pending.resource.metadata.khanDescription,
			path: `/${params.subject}/${params.course}/${unit.slug}/${lastLessonSlug}/${pathSegment}/${pending.resource.metadata.khanSlug}`,
			questions: [],
			ordering: requireSortOrder(pending.component, "assessment"),
			xp: pending.resource.metadata.xp
		})
	}

		for (const lessonComponent of lessonComponents) {
			const lessonMetaResult = ComponentMetadataSchema.safeParse(lessonComponent.metadata)
			if (!lessonMetaResult.success) {
				logger.error("invalid lesson component metadata", {
					componentId: lessonComponent.sourcedId,
					error: lessonMetaResult.error
				})
				throw errors.wrap(lessonMetaResult.error, "invalid lesson metadata")
			}
			const lessonMeta = lessonMetaResult.data
			const lessonResources = componentResourcesByComponentId.get(lessonComponent.sourcedId)
			if (!lessonResources) {
				logger.warn("lesson has no component resources in bundle", {
					courseId: bundle.courseId,
					lessonComponentId: lessonComponent.sourcedId,
					lessonSlug: lessonMeta.khanSlug
				})
			}

			const videos: Array<Video & { sortOrder: number }> = []
			const articles: Array<Article & { sortOrder: number }> = []
			const exercises: Array<ExerciseInfo & { sortOrder: number }> = []

			if (lessonResources) {
				for (const componentResource of lessonResources) {
					const resource = lookups.resourcesById.get(componentResource.resource.sourcedId)
					if (!resource) {
						logger.error("lesson resource missing from bundle", {
							courseId: bundle.courseId,
							componentResourceId: componentResource.sourcedId
						})
						continue
					}

				switch (resource.metadata.khanActivityType) {
					case "Video": {
						const youtubeId = resource.metadata.khanYoutubeId
						if (!youtubeId) {
							logger.error("video resource missing youtubeId", { resourceSourcedId: resource.sourcedId })
							throw errors.new("video metadata missing youtubeId")
						}
						videos.push({
							id: resource.sourcedId,
							componentResourceSourcedId: componentResource.sourcedId,
							title: resource.title,
							path: `/${params.subject}/${params.course}/${unit.slug}/${lessonMeta.khanSlug}/v/${resource.metadata.khanSlug}`,
							slug: resource.metadata.khanSlug,
							type: "Video",
							description: resource.metadata.khanDescription,
							youtubeId,
							xp: resource.metadata.xp,
							sortOrder: componentResource.sortOrder,
							ordering: componentResource.sortOrder
						})
						break
					}
					case "Article": {
						articles.push({
							type: "Article",
							id: resource.sourcedId,
							componentResourceSourcedId: componentResource.sourcedId,
							title: resource.title,
							path: `/${params.subject}/${params.course}/${unit.slug}/${lessonMeta.khanSlug}/a/${resource.metadata.khanSlug}`,
							slug: resource.metadata.khanSlug,
							description: resource.metadata.khanDescription,
							xp: resource.metadata.xp,
							sortOrder: componentResource.sortOrder,
							ordering: componentResource.sortOrder
						})
						break
					}
					case "Exercise": {
						const questionCount = questionCounts.get(resource.sourcedId)
						if (questionCount === undefined) {
							logger.error("exercise questions missing from bundle cache", {
								courseId: bundle.courseId,
								exerciseSourcedId: resource.sourcedId
							})
							throw errors.new("exercise questions missing from bundle")
						}
						const totalQuestions = Math.min(4, questionCount)
						const questionsToPass = totalQuestions > 0 ? totalQuestions - 1 : 0
						exercises.push({
							type: "Exercise",
							id: resource.sourcedId,
							componentResourceSourcedId: componentResource.sourcedId,
							title: resource.title,
							path: `/${params.subject}/${params.course}/${unit.slug}/${lessonMeta.khanSlug}/e/${resource.metadata.khanSlug}`,
							slug: resource.metadata.khanSlug,
							description: resource.metadata.khanDescription,
							xp: resource.metadata.xp,
							totalQuestions,
							questionsToPass,
							sortOrder: componentResource.sortOrder,
							ordering: componentResource.sortOrder
						})
						break
					}
					default:
						break
				}
			}
			}

			const lessonChildren = [...videos, ...articles, ...exercises]
				.sort((a, b) => a.sortOrder - b.sortOrder)
				.map(({ sortOrder, ...child }) => child) as Lesson["children"]

			const lesson: Lesson = {
				type: "Lesson",
				id: lessonComponent.sourcedId,
				componentResourceSourcedId: lessonComponent.sourcedId,
				slug: lessonMeta.khanSlug,
				title: lessonComponent.title,
				description: lessonMeta.khanDescription,
				path: `/${params.subject}/${params.course}/${unit.slug}/${lessonMeta.khanSlug}`,
				ordering: requireSortOrder(lessonComponent, "lesson"),
				xp: lessonChildren.reduce((sum, child) => sum + child.xp, 0),
				children: lessonChildren
			}

			lessons.push(lesson)
			totalLessons += 1
		}

		const unitChildren: UnitChild[] = [...lessons, ...assessments]
		unitChildren.sort((a, b) => a.ordering - b.ordering)
		unit.children = unitChildren

		units.push(unit)
	}

	units.sort((a, b) => a.ordering - b.ordering)
	challenges.sort((a, b) => a.ordering - b.ordering)

	const totalCourseXp = calculateCourseTotalXp(units, challenges)

	const course: Course = {
		id: courseRecord.sourcedId,
		slug: courseMetadata.khanSlug,
		title: removeNiceAcademyPrefix(courseRecord.title),
		description: courseMetadata.khanDescription,
		path: `/${params.subject}/${courseMetadata.khanSlug}`,
		units,
		challenges
	}

	const result: CoursePageData = {
		params,
		course,
		lessonCount: totalLessons,
		totalXP: totalCourseXp
	}

	return stashBundle(result, bundle)
}

function calculateCourseTotalXp(units: Unit[], challenges: CourseChallenge[]) {
	let xp = 0
	for (const unit of units) {
		for (const child of unit.children) {
			if (child.type === "Lesson") {
				xp += child.children.reduce((sum, content) => sum + content.xp, 0)
			} else {
				xp += child.xp
			}
		}
	}
	for (const challenge of challenges) {
		xp += challenge.xp
	}
	return xp
}

function determineLastLessonSlug(
	lessonComponents: CourseComponentRead[],
	unitMeta: ComponentMetadata,
	unitComponent: CourseComponentRead
): string | null {
	if (lessonComponents.length === 0) {
		logger.error("no lesson components available for unit when building assessment path", {
			unitId: unitComponent.sourcedId,
			unitSlug: unitMeta.khanSlug
		})
		return null
	}

	const sorted = [...lessonComponents].sort(
		(a, b) => requireSortOrder(a, "determineLastLessonSlug") - requireSortOrder(b, "determineLastLessonSlug")
	)
	const lastComponent = sorted[sorted.length - 1]
	if (!lastComponent) {
		logger.error("invalid lesson ordering when determining assessment path", {
			unitId: unitComponent.sourcedId,
			unitSlug: unitMeta.khanSlug
		})
		throw errors.new("assessment path: lesson ordering missing")
	}
	const metaResult = ComponentMetadataSchema.safeParse(lastComponent.metadata)
	if (!metaResult.success) {
		logger.error("invalid lesson metadata when determining assessment path", {
			lessonComponentId: lastComponent.sourcedId,
			error: metaResult.error
		})
		throw errors.wrap(metaResult.error, "invalid lesson metadata for assessment path")
	}
	return metaResult.data.khanSlug
}

export async function fetchUnitPageData(params: {
	subject: string
	course: string
	unit: string
}): Promise<UnitPageData> {
	assertNoEncodedColons(params.unit, "fetchUnitPageData unit parameter")

	const coursePageData = await fetchCoursePageData({ subject: params.subject, course: params.course }, { skipQuestions: true })
	const bundle = requireBundle(coursePageData)
	const unit = coursePageData.course.units.find((entry) => entry.slug === params.unit)

	if (!unit) {
		logger.error("unit not found in bundle", {
			courseId: bundle.courseId,
			unitSlug: params.unit
		})
		notFound()
	}

	const result: UnitPageData = {
		params,
		course: coursePageData.course,
		allUnits: coursePageData.course.units,
		unit,
		lessonCount: coursePageData.lessonCount,
		challenges: coursePageData.course.challenges,
		totalXP: unit.children.reduce((xp, child) => {
			if (child.type === "Lesson") {
				return xp + child.children.reduce((sum, content) => sum + content.xp, 0)
			}
			return xp + child.xp
		}, 0)
	}

	return stashBundle(result, bundle)
}

export async function fetchLessonLayoutData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
}): Promise<LessonLayoutData> {
	assertNoEncodedColons(params.lesson, "fetchLessonLayoutData lesson parameter")

	const unitPageData = await fetchUnitPageData({ subject: params.subject, course: params.course, unit: params.unit })
	const bundle = requireBundle(unitPageData)
	const lesson = unitPageData.unit.children.find(
		(child): child is Lesson => child.type === "Lesson" && child.slug === params.lesson
	)

	if (!lesson) {
		logger.error("lesson not found in bundle", {
			courseId: bundle.courseId,
			unitId: unitPageData.unit.id,
			lessonSlug: params.lesson
		})
		notFound()
	}

	const result: LessonLayoutData = {
		subject: params.subject,
		courseData: {
			id: unitPageData.course.id,
			title: unitPageData.course.title,
			path: unitPageData.course.path
		},
		unitData: unitPageData.unit,
		lessonData: lesson
	}

	return stashBundle(result, bundle)
}
