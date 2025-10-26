import * as React from "react"
import "server-only"
import * as logger from "@superbuilders/slog"
import {
	fetchArticlePageDataBase,
	fetchExercisePageDataBase,
	fetchVideoPageDataBase
} from "@/lib/course-bundle/content-loaders"

export const getCachedArticlePageData = React.cache(
	async (subject: string, course: string, unit: string, lesson: string, article: string) => {
		logger.debug("article page cache invoked", { subject, course, unit, lesson, article })
		return fetchArticlePageDataBase({ subject, course, unit, lesson, article })
	}
)

export const getCachedExercisePageData = React.cache(
	async (subject: string, course: string, unit: string, lesson: string, exercise: string) => {
		logger.debug("exercise page cache invoked", { subject, course, unit, lesson, exercise })
		return fetchExercisePageDataBase({ subject, course, unit, lesson, exercise })
	}
)

export const getCachedVideoPageData = React.cache(
	async (subject: string, course: string, unit: string, lesson: string, video: string) => {
		logger.debug("video page cache invoked", { subject, course, unit, lesson, video })
		return fetchVideoPageDataBase({ subject, course, unit, lesson, video })
	}
)
