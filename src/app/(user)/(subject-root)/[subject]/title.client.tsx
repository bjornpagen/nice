"use client"

import * as React from "react"
import type { SubjectWithCourseUnitsHeader } from "@/app/(user)/(subject-root)/[subject]/subject.queries"

export function TitleClient({ headerPromise }: { headerPromise: Promise<SubjectWithCourseUnitsHeader | undefined> }) {
	const header = React.use(headerPromise)
	return (
		<div className="w-full bg-blue-950 py-8">
			<div className="px-6 max-w-6xl mx-auto flex items-center">
				<h1 className="text-3xl font-medium text-white tracking-tight capitalize">
					{header ? header.title : "Subject not found"}
				</h1>
			</div>
		</div>
	)
}
