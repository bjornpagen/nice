import * as logger from "@superbuilders/slog"
import { fetchProfileCoursesData } from "@/lib/data/profile"
import type { ProfileCoursesPageData } from "@/lib/types/page"
import { Content } from "./components/content"

export default function ProfileCoursesPage() {
	logger.info("profile courses page: received request, rendering layout immediately")

	const coursesPromise: Promise<ProfileCoursesPageData> = fetchProfileCoursesData()

	// Pass the promise directly without Suspense wrapper
	return <Content coursesPromise={coursesPromise} />
}
