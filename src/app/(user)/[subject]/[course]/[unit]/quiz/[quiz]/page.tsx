import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound, redirect } from "next/navigation"
import { fetchQuizRedirectPath } from "@/lib/data/assessment"

export default async function QuizRedirectPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; quiz: string }>
}) {
	const resolvedParams = await params
	logger.info("quiz redirect page: fetching canonical path", { params: resolvedParams })

	const redirectPathResult = await errors.try(fetchQuizRedirectPath(resolvedParams))
	if (redirectPathResult.error) {
		logger.error("failed to determine quiz redirect path", {
			error: redirectPathResult.error,
			params: resolvedParams
		})
		// If the helper throws an error (e.g., unit not found), this will trigger a 404 page.
		// For other unexpected errors, a 500 will be triggered, which is appropriate.
		notFound()
	}

	redirect(redirectPathResult.data)
}
