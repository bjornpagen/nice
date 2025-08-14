import * as logger from "@superbuilders/slog"
// PowerPath removed; attempt number derived via server action in prepareInteractiveAssessment
import {
	fetchAndResolveQuestions,
	findAndValidateResource,
	findComponentResourceWithContext,
	findCourseChallenge,
	prepareUserQuestionSet
} from "@/lib/data/fetchers/interactive-helpers"
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
import { fetchCoursePageData } from "./course"
import { fetchLessonLayoutData } from "./lesson"

export const applyQtiSelectionAndOrdering = applyQtiSelectionAndOrderingCommon

export async function fetchQuizPageData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	quiz: string
}): Promise<QuizPageData> {
	const layoutData = await fetchLessonLayoutData(params)

	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.quiz, "fetchQuizPageData quiz parameter")
	logger.info("fetchQuizPageData called", { params })

	const resource = await findAndValidateResource(params.quiz, "Quiz")
	const componentResource = await findComponentResourceWithContext(resource.sourcedId, layoutData.unitData.id)
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

export async function fetchUnitTestPageData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	test: string
}): Promise<UnitTestPageData> {
	const layoutData = await fetchLessonLayoutData(params)

	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.test, "fetchUnitTestPageData test parameter")
	logger.info("fetchUnitTestPageData called", { params })

	const resource = await findAndValidateResource(params.test, "UnitTest")
	const componentResource = await findComponentResourceWithContext(resource.sourcedId, layoutData.unitData.id)
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

export async function fetchCourseChallengePage_TestData(params: {
	test: string
	course: string
	subject: string
}): Promise<CourseChallengePageData> {
	logger.info("fetchCourseChallengePage_TestData called", { params })

	const { resource, componentResource } = await findCourseChallenge(params)
	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
	const questions = await prepareUserQuestionSet({
		resourceSourcedId: resource.sourcedId,
		componentResourceSourcedId: componentResource.sourcedId,
		assessmentTest,
		resolvedQuestions
	})

	// Course Challenges require fetching some top-level course data.
	const { course } = await fetchCoursePageData(
		{ subject: params.subject, course: params.course },
		{ skip: { questions: true } }
	)

	const resourceMetadata = resource.metadata

	return {
		test: {
			id: resource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			onerosterCourseSourcedId: course.id,
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

export async function fetchCourseChallengePage_LayoutData(params: {
	course: string
	subject: string
}): Promise<CourseChallengeLayoutData> {
	// dynamic opt-in is handled at the page level

	const coursePageData = await fetchCoursePageData({ subject: params.subject, course: params.course })

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
