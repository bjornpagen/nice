import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { redirect } from "next/navigation"
import { oneroster } from "@/lib/clients"

export default async function TestRedirectPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; test: string }>
}) {
	const resolvedParams = await params
	const decodedTest = decodeURIComponent(resolvedParams.test)
	const decodedUnit = decodeURIComponent(resolvedParams.unit)

	const unitSourcedId = `nice:${decodedUnit}`

	// Get child components (lessons) of the unit
	const lessonsResult = await errors.try(oneroster.getCourseComponents(`parent.sourcedId='${unitSourcedId}'`))

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
	const firstLessonSlug = firstLesson.sourcedId.split(":")[1] || firstLesson.sourcedId

	// Redirect to the canonical 4-slug URL
	const canonicalUrl = `/${resolvedParams.subject}/${resolvedParams.course}/${decodedUnit}/${firstLessonSlug}/test/${decodedTest}`
	redirect(canonicalUrl)
}
