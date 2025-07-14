import * as logger from "@superbuilders/slog"
import { redirect } from "next/navigation"

/*
 * Khan Academy uses the '/[subject]/[course]/[unit]/[lesson]/quiz/[quiz]' path for quizzes,
 * despite the quizzes' data specifying a url with the format of '/[subject]/[course]/[unit]/quiz/[quiz]'.
 *
 * This page is a redirect to the correct path.
 */
export default async function QuizPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; quiz: string }>
}) {
	const { subject, course, unit, lesson, quiz } = await params
	logger.debug("initializing quiz page", { subject, course, unit, lesson, quiz })

	const url = `/v2/${subject}/${course}/${unit}/quiz/${quiz}`
	logger.debug("redirecting to", { url })

	redirect(url)
}
