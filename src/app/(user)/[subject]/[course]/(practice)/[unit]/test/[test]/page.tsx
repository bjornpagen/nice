import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound, redirect } from "next/navigation"
import { fetchTestRedirectPath } from "@/lib/data/assessment"

export default async function TestRedirectPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; test: string }>
}) {
	const resolvedParams = await params
	logger.info("test redirect page: fetching canonical path", { params: resolvedParams })

	const redirectPathResult = await errors.try(fetchTestRedirectPath(resolvedParams))
	if (redirectPathResult.error) {
		logger.error("failed to determine test redirect path", {
			error: redirectPathResult.error,
			params: resolvedParams
		})
		// If the helper throws an error (e.g., unit not found), this will trigger a 404 page.
		// For other unexpected errors, a 500 will be triggered, which is appropriate.
		notFound()
	}

	redirect(redirectPathResult.data)
}
