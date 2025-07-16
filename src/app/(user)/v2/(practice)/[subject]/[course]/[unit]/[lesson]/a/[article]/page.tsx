import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { LessonArticleContent } from "@/components/practice/course/unit/lesson/article/lesson-article-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type CourseMaterial, getCourseBlob, getCourseMaterials, type LessonResource } from "@/lib/v2/types"

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
): Extract<CourseMaterial, { type: "Article" }> | undefined {
	logger.info("lesson article data: initializing lesson article data", { subject, course, unit, lesson, article })

	const blob = getCourseBlob(subject, course)
	logger.info("lesson article data: blob retrieved", { subject, course, unit, lesson, article, blobKeys: _.keys(blob) })

	const materials = getCourseMaterials(blob)
	logger.info("lesson article data: materials extracted", {
		subject,
		course,
		unit,
		lesson,
		article,
		materialCount: materials.length
	})

	const articleIndex = materials.findIndex(
		(u): u is Extract<CourseMaterial, { type: "Article" }> => u.type === "Article" && u.slug === article
	)
	if (articleIndex === -1) {
		logger.error("lesson article data: article not found", { subject, course, unit, lesson, article })
		return undefined
	}
	logger.info("lesson article data: article index found", { subject, course, unit, lesson, article, articleIndex })

	const articleData = materials[articleIndex]
	if (articleData == null || articleData.type !== "Article") {
		logger.error("lesson article data: article data not found", { subject, course, unit, lesson, article })
		return undefined
	}
	logger.info("lesson article data: article data retrieved", {
		subject,
		course,
		unit,
		lesson,
		article,
		articleDataKeys: _.keys(articleData)
	})

	// Stupid typescript fuckery to get the compiler to understand that the meta object is valid.
	const enhancedArticleData: Extract<CourseMaterial, { type: "Article" }> = {
		...articleData,
		meta: {
			...articleData.meta,
			unit: articleData.meta.unit
		}
	}

	let nextMaterial:
		| { type: CourseMaterial["type"]; path: string; title: string; resources?: LessonResource[] }
		| undefined = materials[articleIndex + 1]
	if (nextMaterial != null && nextMaterial.type === "Lesson") {
		const nextFromLesson = nextMaterial.resources?.find(
			(r): r is Extract<CourseMaterial, { type: "Article" | "Exercise" | "Video" }> => r != null
		)
		if (nextFromLesson != null) {
			nextMaterial = { type: nextFromLesson.type, path: nextFromLesson.path, title: nextFromLesson.title }
		}
	}
	logger.info("lesson article data: next material identified", {
		subject,
		course,
		unit,
		lesson,
		article,
		nextMaterial
	})

	if (nextMaterial != null) {
		enhancedArticleData.meta = {
			...enhancedArticleData.meta,
			next: { type: nextMaterial.type, path: nextMaterial.path, title: nextMaterial.title }
		}
		logger.info("lesson article data: article data enhanced with next material", {
			subject,
			course,
			unit,
			lesson,
			article,
			nextMaterial
		})
	}

	return enhancedArticleData
}
