import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { Footer } from "@/components/footer"
import { getOneRosterCoursesForExplore } from "@/lib/actions/courses"
import type { ProfileSubject } from "@/lib/types/domain"
import { SubjectContent } from "./components/subject-content"

export default function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
	const subjectPromise: Promise<ProfileSubject | undefined> = params.then(fetchSubjectPageData)

	return (
		<div className="bg-gray-100">
			<React.Suspense fallback={<div>Loading subject...</div>}>
				<SubjectContent subjectPromise={subjectPromise} />
			</React.Suspense>

			<Footer />
		</div>
	)
}

async function fetchSubjectPageData(params: { subject: string }): Promise<ProfileSubject | undefined> {
	logger.info("fetching subject page data from OneRoster", { subjectSlug: params.subject })

	const allSubjectsResult = await errors.try(getOneRosterCoursesForExplore())
	if (allSubjectsResult.error) {
		logger.error("failed to fetch all subjects for explore", { error: allSubjectsResult.error })
		throw errors.wrap(allSubjectsResult.error, "oneroster subjects fetch")
	}

	// Find the specific subject matching the URL slug
	const targetSubject = allSubjectsResult.data.find((s) => s.slug === params.subject)

	if (!targetSubject) {
		logger.warn("subject not found in OneRoster data", { subjectSlug: params.subject })
		return undefined // Return undefined to indicate not found, which React.use can handle
	}

	logger.info("successfully fetched subject data", {
		subjectSlug: params.subject,
		courseCount: targetSubject.courses.length
	})

	return targetSubject
}
