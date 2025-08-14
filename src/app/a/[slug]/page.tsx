import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { findResourcePath } from "@/lib/data/resource-redirect"
import { normalizeString } from "@/lib/utils"

export default async function ArticleRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
	// Opt into dynamic rendering to ensure external fetches (e.g., OneRoster token) occur during request lifecycle
	await connection()
	const { slug } = await params
	// Normalize the slug to handle encoded colons
	const normalizedSlug = normalizeString(slug)
	const path = await findResourcePath(normalizedSlug, "article")

	if (!path) {
		logger.error("Article not found", { slug: normalizedSlug })
		throw errors.new("Article not found")
	}

	redirect(path)
}
