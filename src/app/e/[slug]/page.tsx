import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { findResourcePath } from "@/lib/data/resource-redirect"
import { normalizeString } from "@/lib/utils"

export default async function ExerciseRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
	// Opt into dynamic rendering to ensure external fetches (e.g., OneRoster token) occur during request lifecycle
	await connection()
	const { slug } = await params
	// Normalize the slug to handle encoded colons
	const normalizedSlug = normalizeString(slug)
	const path = await findResourcePath(normalizedSlug, "exercise")

	if (!path) {
		logger.error("Exercise not found", { slug: normalizedSlug })
		throw errors.new("Exercise not found")
	}

	redirect(path)
}
