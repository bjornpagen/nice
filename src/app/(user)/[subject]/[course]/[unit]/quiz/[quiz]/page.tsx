import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { redirect } from "next/navigation"
import { oneroster } from "@/lib/clients"

export default async function QuizRedirectPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; quiz: string }>
}) {
	const resolvedParams = await params
	const decodedQuiz = decodeURIComponent(resolvedParams.quiz)
	const decodedUnit = decodeURIComponent(resolvedParams.unit)

	// Look up the unit by its slug to get its sourcedId
	const filter = `metadata.khanSlug='${decodedUnit}'`
	const unitResult = await errors.try(oneroster.getCourseComponents({ filter }))
	if (unitResult.error) {
		logger.error("failed to fetch unit by slug", { error: unitResult.error, slug: decodedUnit })
		throw errors.wrap(unitResult.error, "failed to fetch unit by slug")
	}
	const unit = unitResult.data[0]
	if (!unit) {
		return <div>Could not find the unit.</div>
	}
	const unitSourcedId = unit.sourcedId

	// Fetch all lessons for this unit to find quiz sibling
	const lessonsResult = await errors.try(
		oneroster.getCourseComponents({
			filter: `parent.sourcedId='${unitSourcedId}'`
		})
	)

	if (lessonsResult.error) {
		logger.error("failed to get lessons for unit", { unitSourcedId, error: lessonsResult.error })
		// Fallback or error page
		return <div>Could not find lessons for this unit.</div>
	}

	const lessons = lessonsResult.data
	if (lessons.length === 0) {
		// No lessons in unit - this shouldn't happen but handle gracefully
		logger.warn("no lessons found in unit for redirect", { unitSourcedId })
		return <div>No lessons found in unit.</div>
	}

	// Sort by ordering and get the first lesson's slug
	lessons.sort((a, b) => a.sortOrder - b.sortOrder)
	const firstLesson = lessons[0]
	if (!firstLesson) {
		logger.warn("could not determine first lesson", { unitSourcedId })
		return <div>Could not determine the first lesson.</div>
	}

	// ✅ NEW: Use lesson's khanSlug metadata instead of extracting from sourcedId
	const firstLessonSlug = typeof firstLesson.metadata?.khanSlug === "string" ? firstLesson.metadata.khanSlug : null
	if (!firstLessonSlug) {
		logger.error("first lesson missing khanSlug", { lessonId: firstLesson.sourcedId })
		return <div>Could not determine the lesson path.</div>
	}

	// Redirect to the canonical 4-slug URL
	const canonicalUrl = `/${resolvedParams.subject}/${resolvedParams.course}/${decodedUnit}/${firstLessonSlug}/quiz/${decodedQuiz}`
	redirect(canonicalUrl)
}
