import * as errors from "@superbuilders/errors"
import { redirect } from "next/navigation"
import { findResourcePath } from "@/lib/data/resource-redirect"
import { normalizeString } from "@/lib/utils"

export default async function ExerciseRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params
	// Normalize the slug to handle encoded colons
	const normalizedSlug = normalizeString(slug)
	const path = await findResourcePath(normalizedSlug, "exercise")

	if (!path) {
		throw errors.new("Exercise not found")
	}

	redirect(path)
}
