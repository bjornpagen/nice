import * as errors from "@superbuilders/errors"
import { redirect } from "next/navigation"
import { findResourcePath } from "@/lib/data/resource-redirect"

export default async function ExerciseRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params
	const path = await findResourcePath(slug, "exercise")

	if (!path) {
		throw errors.new("Exercise not found")
	}

	redirect(path)
}
