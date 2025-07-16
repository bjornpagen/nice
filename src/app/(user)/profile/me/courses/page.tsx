import { fetchProfileCoursesData } from "@/lib/data/profile"
import type { ProfileCoursesPageData } from "@/lib/types/page"
import { Content } from "./components/content"

export default function ProfileCoursesPage() {
	const coursesPromise: Promise<ProfileCoursesPageData> = fetchProfileCoursesData()

	// Pass the promise directly without Suspense wrapper
	return <Content coursesPromise={coursesPromise} />
}
