import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { connection } from "next/server"
import * as React from "react"
import { Footer } from "@/components/footer"
import { getOneRosterCoursesForExplore } from "@/lib/actions/courses"
import type { ProfileSubject } from "@/lib/types/domain"
import { assertNoEncodedColons, normalizeParams } from "@/lib/utils"
import { Content } from "./components/content"

async function fetchSubjectPageData(params: { subject: string }): Promise<ProfileSubject | undefined> {
	// Opt into dynamic rendering to ensure external fetches (e.g., OneRoster token) occur during request lifecycle
	await connection()
	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.subject, "fetchSubjectPageData subject parameter")

	logger.info("fetching subject page data from OneRoster", { subjectSlug: params.subject })

	const allSubjectsResult = await errors.try(getOneRosterCoursesForExplore())
	if (allSubjectsResult.error) {
		logger.error("failed to fetch all subjects for explore", { error: allSubjectsResult.error })
		throw errors.wrap(allSubjectsResult.error, "oneroster subjects fetch")
	}

	const targetSubject = allSubjectsResult.data.find((s) => s.slug === params.subject)

	if (!targetSubject) {
		logger.warn("subject not found in OneRoster data", { subjectSlug: params.subject })
		return undefined
	}

	logger.info("successfully fetched subject data", {
		subjectSlug: params.subject,
		courseCount: targetSubject.courses.length
	})

	return targetSubject
}

export default function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
	const normalizedParamsPromise = normalizeParams(params)
	const subjectPromise: Promise<ProfileSubject | undefined> = normalizedParamsPromise.then(fetchSubjectPageData)

	return (
		<div className="bg-gray-100">
			<React.Suspense>
				<Content subjectPromise={subjectPromise} />
			</React.Suspense>

			<Footer />
		</div>
	)
}
