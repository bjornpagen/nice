import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchProfileCoursesData } from "@/lib/data-fetching"
import type { ProfileCoursesPageData } from "@/lib/types"
import { Content } from "./content"

export default function ProfileCoursesPage() {
	logger.info("profile courses page: received request, rendering layout immediately")

	const coursesPromise: Promise<ProfileCoursesPageData> = fetchProfileCoursesData()

	return (
		<React.Suspense fallback={<div className="p-8">Loading courses...</div>}>
			<Content coursesPromise={coursesPromise} />
		</React.Suspense>
	)
}
