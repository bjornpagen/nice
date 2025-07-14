import * as logger from "@superbuilders/slog"
import { redirect } from "next/navigation"

export default async function OverviewLessonPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string }>
}) {
	const { subject, course, unit, lesson } = await params
	logger.debug("overview lesson page: initializing lesson page", { subject, course, unit, lesson })

	const url = `/v2/${subject}/${course}/${unit}`
	logger.debug("overview lesson page: redirecting to unit page", { url })

	return redirect(url)
}
