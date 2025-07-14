import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { LessonArticleContent } from "@/components/practice/lesson/article/lesson-article-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getCourseBlob, type LessonResource } from "@/lib/v2/types"

export default function PracticeArticlePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; article: string }>
}) {
	// Chain the promise properly to handle the error case
	const articlePromise = params.then(({ subject, course, unit, lesson, article }) => {
		logger.debug("initializing article page", { subject, course, unit, lesson, article })
		return getArticleData(subject, course, unit, lesson, article)
	})

	return (
		<div id="practice-article-page" className="h-full">
			<ErrorBoundary fallback={<PracticeArticlePageErrorFallback />}>
				<React.Suspense>
					<LessonArticleContent articlePromise={articlePromise} className="h-full bg-gray-50" />
				</React.Suspense>
			</ErrorBoundary>
		</div>
	)
}

function PracticeArticlePageErrorFallback({ className }: { className?: string }) {
	return (
		<Alert variant="destructive" className={className}>
			<AlertCircleIcon />
			<AlertTitle>Unable to retrieve article page content.</AlertTitle>
			<AlertDescription>Please try again later.</AlertDescription>
		</Alert>
	)
}

function getArticleData(
	subject: string,
	course: string,
	unit: string,
	lesson: string,
	article: string
): Extract<LessonResource, { type: "Article" }> | undefined {
	logger.debug("lesson article data: initializing lesson article data", { subject, course, unit, lesson, article })

	const blob = getCourseBlob(subject, course)
	logger.debug("lesson article data: blob", { blob })

	const unitData = _.find(blob.units, (u) => u.slug === unit)
	if (unitData == null) {
		logger.error("lesson article data: unit not found", { subject, course, unit })
		return undefined
	}

	const lessonData = _.find(unitData.lessons, (l) => l.slug === lesson)
	if (lessonData == null) {
		logger.debug("lesson article data: no lessons found for unit", { subject, course, unit })
		return undefined
	}

	const articleData = _.find(
		lessonData.resources,
		(r): r is Extract<LessonResource, { type: "Article" }> => r.type === "Article" && r.slug === article
	)
	if (articleData == null) {
		logger.debug("lesson article data: no articles found for lesson", { subject, course, unit, lesson })
		return undefined
	}

	return articleData
}
