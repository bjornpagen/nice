import * as logger from "@superbuilders/slog"
import { redirect } from "next/navigation"

/*
 * Khan Academy uses the '/[subject]/[course]/[unit]/[lesson]/test/[test]' path for unit tests,
 * despite the unit tests' data specifying a url with the format of '/[subject]/[course]/[unit]/test/[test]'.
 *
 * This page is a redirect to the correct path.
 */
export default async function UnitTestPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; test: string }>
}) {
	const { subject, course, unit, lesson, test } = await params
	logger.debug("initializing unit test page", { subject, course, unit, lesson, test })

	const url = `/v2/${subject}/${course}/${unit}/test/${test}`
	logger.debug("redirecting to", { url })

	redirect(url)
}
