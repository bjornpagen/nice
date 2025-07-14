import * as logger from "@superbuilders/slog"
import { redirect } from "next/navigation"

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
