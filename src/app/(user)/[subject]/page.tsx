import * as React from "react"
import { Footer } from "@/components/footer"
import { SubjectContent } from "./components/subject-content"

// TODO: This is ONLY A TEMPORARY FUCKING FIX. DO NOT FUCKING USE THIS.
export interface DONOTUSETHIS_Subject {
	title: string
	courses: Array<{
		path: string
		title: string
		units: Array<{
			path: string
			title: string
		}>
	}>
}

export default function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
	const subjectPromise = params.then((params) => fetchSubjectPageData(params.subject))

	return (
		<div className="bg-gray-100">
			<React.Suspense fallback={<div>Loading subject...</div>}>
				<SubjectContent subjectPromise={subjectPromise} />
			</React.Suspense>

			<Footer />
		</div>
	)
}

async function fetchSubjectPageData(subject: string): Promise<DONOTUSETHIS_Subject | undefined> {
	return {
		title: subject,
		courses: [
			{
				path: "/math/course/1",
				title: "Algebra",
				units: [
					{
						path: "/math/course/1/unit/1",
						title: "Algebra 1"
					}
				]
			},
			{
				path: "/math/course/2",
				title: "Geometry",
				units: [
					{
						path: "/math/course/2/unit/1",
						title: "Geometry 1"
					}
				]
			}
		]
	}
}
