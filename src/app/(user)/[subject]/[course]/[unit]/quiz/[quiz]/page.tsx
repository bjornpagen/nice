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

	// ✅ NEW: Look up unit by slug with namespace filter
	const filter = `sourcedId~'nice:' AND metadata.khanSlug='${decodedUnit}'`
	const unitResult = await errors.try(oneroster.getCourseComponents(filter))
	if (unitResult.error || !unitResult.data[0]) {
		logger.error("failed to get unit for redirect", { unitSlug: decodedUnit, error: unitResult.error })
		return <div>Could not find the unit.</div>
	}
	const unitSourcedId = unitResult.data[0].sourcedId

	// Get child components (lessons) of the unit, including namespace filter
	const lessonsResult = await errors.try(
		oneroster.getCourseComponents(`sourcedId~'nice:' AND parent.sourcedId='${unitSourcedId}'`)
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
