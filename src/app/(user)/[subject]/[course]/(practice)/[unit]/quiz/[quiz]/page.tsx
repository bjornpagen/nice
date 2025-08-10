import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound, redirect } from "next/navigation"
import { connection } from "next/server"
import { fetchQuizRedirectPath } from "@/lib/data/assessment"
import { normalizeParamsSync } from "@/lib/utils"

export default async function QuizRedirectPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; quiz: string }>
}) {
	// Opt into dynamic rendering to ensure external fetches (e.g., OneRoster token) occur during request lifecycle
	await connection()
	const resolvedParams = await params
	// Normalize params to handle encoded characters
	const normalizedParams = normalizeParamsSync(resolvedParams)
	logger.info("quiz redirect page: fetching canonical path", { params: normalizedParams })

	const redirectPathResult = await errors.try(fetchQuizRedirectPath(normalizedParams))
	if (redirectPathResult.error) {
		logger.error("failed to determine quiz redirect path", {
			error: redirectPathResult.error,
			params: normalizedParams
		})
		// If the helper throws an error (e.g., unit not found), this will trigger a 404 page.
		// For other unexpected errors, a 500 will be triggered, which is appropriate.
		notFound()
	}

	redirect(redirectPathResult.data)
}
