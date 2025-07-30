import * as errors from "@superbuilders/errors"
import { redirect } from "next/navigation"
import { findResourcePath } from "@/lib/data/resource-redirect"
import { normalizeString } from "@/lib/utils"

export default async function ArticleRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params
	// Normalize the slug to handle encoded colons
	const normalizedSlug = normalizeString(slug)
	const path = await findResourcePath(normalizedSlug, "article")

	if (!path) {
		throw errors.new("Article not found")
	}

	redirect(path)
}
