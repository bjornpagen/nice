import * as React from "react"
import "server-only"
import * as logger from "@superbuilders/slog"
import {
	fetchCourseChallengePage_LayoutDataBase,
	fetchCourseChallengePage_TestDataBase,
	fetchQuizPageDataBase,
	fetchUnitTestPageDataBase
} from "@/lib/course-bundle/assessment-loaders"
import { findAssessmentRedirectPathBase } from "@/lib/course-bundle/assessment-redirect"

export const getCachedQuizPageData = React.cache(
	async (subject: string, course: string, unit: string, lesson: string, quiz: string) => {
		logger.debug("quiz page cache invoked", { subject, course, unit, lesson, quiz })
		return fetchQuizPageDataBase({ subject, course, unit, lesson, quiz })
	}
)

export const getCachedUnitTestPageData = React.cache(
	async (subject: string, course: string, unit: string, lesson: string, test: string) => {
		logger.debug("unit test page cache invoked", { subject, course, unit, lesson, test })
		return fetchUnitTestPageDataBase({ subject, course, unit, lesson, test })
	}
)

export const getCachedCourseChallengeTestData = React.cache(
	async (subject: string, course: string, test: string) => {
		logger.debug("course challenge test cache invoked", { subject, course, test })
		return fetchCourseChallengePage_TestDataBase({ subject, course, test })
	}
)

export const getCachedCourseChallengeLayoutData = React.cache(async (subject: string, course: string) => {
	logger.debug("course challenge layout cache invoked", { subject, course })
	return fetchCourseChallengePage_LayoutDataBase({ subject, course })
})

export const getCachedQuizRedirectPath = React.cache(async (subject: string, course: string, unit: string, quiz: string) => {
	logger.debug("quiz redirect cache invoked", { subject, course, unit, quiz })
	return findAssessmentRedirectPathBase({
		subject,
		course,
		unit,
		assessment: quiz,
		assessmentType: "quiz"
	})
})

export const getCachedTestRedirectPath = React.cache(async (subject: string, course: string, unit: string, test: string) => {
	logger.debug("test redirect cache invoked", { subject, course, unit, test })
	return findAssessmentRedirectPathBase({
		subject,
		course,
		unit,
		assessment: test,
		assessmentType: "unittest"
	})
})
