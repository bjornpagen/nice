import * as React from "react"
import {
	fetchSubjectCoursesWithUnits,
	fetchSubjectPageData,
	type SubjectWithCourseUnitsHeader
} from "@/app/(user)/(subject-root)/[subject]/subject.queries"
import { TitleClient as SubjectTitle } from "@/app/(user)/(subject-root)/[subject]/title.client"
import { Content } from "@/app/(user)/[subject]/components/content"
import { Footer } from "@/components/footer"

export default function SubjectRootPage({ params }: { params: Promise<{ subject: string }> }) {
	const headerPromise: Promise<SubjectWithCourseUnitsHeader | undefined> = params.then((p) =>
		fetchSubjectPageData({ subject: p.subject })
	)
	const dataPromise = params.then((p) => fetchSubjectCoursesWithUnits({ subject: p.subject }))

	return (
		<div className="bg-gray-100">
			<React.Suspense fallback={<div className="w-full bg-blue-950 py-8" />}>
				<SubjectTitle headerPromise={headerPromise} />
			</React.Suspense>

			<React.Suspense fallback={<div className="w-full bg-gray-100 min-h-[600px]" />}>
				<Content subjectPromise={dataPromise} />
			</React.Suspense>

			<Footer />
		</div>
	)
}
