import * as logger from "@superbuilders/slog"
// PowerPath removed; attempt number derived via server action in prepareInteractiveAssessment
import { fetchAndResolveQuestions, prepareUserQuestionSet } from "@/lib/data/fetchers/interactive-helpers"
import { requireBundle } from "@/lib/course-bundle/store"
import { fetchCoursePageDataBase, fetchLessonLayoutDataBase } from "@/lib/course-bundle/course-loaders"
import {
	findAndValidateResourceBundle,
	findComponentResourceWithContextBundle,
	findCourseChallengeBundle
} from "@/lib/course-bundle/interactive-helpers"
// import type { AssessmentTest, TestQuestionsResponse } from "@/lib/qti"
import { applyQtiSelectionAndOrdering as applyQtiSelectionAndOrderingCommon } from "@/lib/qti-selection"
// NOTE: selection util now returns domain Question; direct type import not required here
// import type { Question } from "@/lib/types/domain"
import type {
	CourseChallengeLayoutData,
	CourseChallengePageData,
	QuizPageData,
	UnitTestPageData
} from "@/lib/types/page"
import { assertNoEncodedColons } from "@/lib/utils"
import { findAssessmentRedirectPath } from "@/lib/utils/assessment-redirect"

export const applyQtiSelectionAndOrdering = applyQtiSelectionAndOrderingCommon

export async function fetchQuizPageDataBase(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	quiz: string
}): Promise<QuizPageData> {
	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.quiz, "fetchQuizPageData quiz parameter")
	logger.info("fetchQuizPageData raw executed", { params })

	const layoutData = await fetchLessonLayoutDataBase(params)
	const bundle = requireBundle(layoutData)

	const resource = findAndValidateResourceBundle({ bundle, slug: params.quiz, activityType: "Quiz" })
	const componentResource = findComponentResourceWithContextBundle({
		bundle,
		resourceSourcedId: resource.sourcedId,
		parentComponentSourcedId: layoutData.unitData.id
	})
	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
	const questions = await prepareUserQuestionSet({
		resourceSourcedId: resource.sourcedId,
		componentResourceSourcedId: componentResource.sourcedId,
		assessmentTest,
		resolvedQuestions
	})

	const resourceMetadata = resource.metadata

	return {
		quiz: {
			id: resource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			onerosterCourseSourcedId: layoutData.courseData.id,
			title: resource.title,
			path: `/${params.subject}/${params.course}/${params.unit}/${params.lesson}/quiz/${resourceMetadata.khanSlug}`,
			description: resourceMetadata.khanDescription,
			type: "Quiz" as const,
			expectedXp: resourceMetadata.xp
		},
		questions,
		layoutData
	}
}

export async function fetchUnitTestPageDataBase(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	test: string
}): Promise<UnitTestPageData> {
	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.test, "fetchUnitTestPageData test parameter")
	logger.info("fetchUnitTestPageData raw executed", { params })

	const layoutData = await fetchLessonLayoutDataBase(params)
	const bundle = requireBundle(layoutData)

	const resource = findAndValidateResourceBundle({ bundle, slug: params.test, activityType: "UnitTest" })
	const componentResource = findComponentResourceWithContextBundle({
		bundle,
		resourceSourcedId: resource.sourcedId,
		parentComponentSourcedId: layoutData.unitData.id
	})
	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
	const questions = await prepareUserQuestionSet({
		resourceSourcedId: resource.sourcedId,
		componentResourceSourcedId: componentResource.sourcedId,
		assessmentTest,
		resolvedQuestions
	})

	const resourceMetadata = resource.metadata

	return {
		test: {
			id: resource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			onerosterCourseSourcedId: layoutData.courseData.id,
			title: resource.title,
			path: `/${params.subject}/${params.course}/${params.unit}/${params.lesson}/test/${resourceMetadata.khanSlug}`,
			description: resourceMetadata.khanDescription,
			type: "UnitTest" as const,
			expectedXp: resourceMetadata.xp
		},
		questions,
		layoutData
	}
}

export async function fetchCourseChallengePage_TestDataBase(params: {
	test: string
	course: string
	subject: string
}): Promise<CourseChallengePageData> {
	logger.info("fetchCourseChallengePage_TestData raw executed", { params })

	const coursePageData = await fetchCoursePageDataBase(
		{ subject: params.subject, course: params.course },
		true
	)
	const bundle = requireBundle(coursePageData)
	const { resource, componentResource } = findCourseChallengeBundle({ bundle, slug: params.test })
	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
	const questions = await prepareUserQuestionSet({
		resourceSourcedId: resource.sourcedId,
		componentResourceSourcedId: componentResource.sourcedId,
		assessmentTest,
		resolvedQuestions
	})

	const resourceMetadata = resource.metadata

	return {
		test: {
			id: resource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			onerosterCourseSourcedId: coursePageData.course.id,
			type: "CourseChallenge",
			title: resource.title,
			slug: params.test,
			path: `/${params.subject}/${params.course}/test/${resourceMetadata.khanSlug}`,
			description: resourceMetadata.khanDescription,
			expectedXp: resourceMetadata.xp
		},
		questions
	}
}

export async function fetchCourseChallengePage_LayoutDataBase(params: {
	course: string
	subject: string
}): Promise<CourseChallengeLayoutData> {
	// dynamic opt-in is handled at the page level
	logger.info("fetchCourseChallengePage_LayoutData raw executed", { params })

	const coursePageData = await fetchCoursePageDataBase(
		{ subject: params.subject, course: params.course },
		true
	)

	// The CourseSidebar component needs the full course object with units,
	// the lesson count, and any challenges.
	return {
		course: coursePageData.course,
		lessonCount: coursePageData.lessonCount,
		challenges: coursePageData.course.challenges
	}
}

export async function fetchQuizRedirectPath(params: {
	subject: string
	course: string
	unit: string
	quiz: string
}): Promise<string> {
	return findAssessmentRedirectPath({
		...params,
		assessment: params.quiz,
		assessmentType: "quiz"
	})
}

export async function fetchTestRedirectPath(params: {
	subject: string
	course: string
	unit: string
	test: string
}): Promise<string> {
	return findAssessmentRedirectPath({
		...params,
		assessment: params.test,
		assessmentType: "unittest"
	})
}
