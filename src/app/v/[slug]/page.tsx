import * as errors from "@superbuilders/errors"
import { redirect } from "next/navigation"
import { findResourcePath } from "@/lib/data/resource-redirect"

export default async function VideoRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params
	const path = await findResourcePath(slug, "video")

	if (!path) {
		throw errors.new("Video not found")
	}

	redirect(path)
}
