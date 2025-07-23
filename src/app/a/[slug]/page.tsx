import * as errors from "@superbuilders/errors"
import { redirect } from "next/navigation"
import { findResourcePath } from "@/lib/data/resource-redirect"

export default async function ArticleRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params
	const path = await findResourcePath(slug, "article")

	if (!path) {
		throw errors.new("Article not found")
	}

	redirect(path)
}
