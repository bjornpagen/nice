"use client"

import * as React from "react"
import type { Course as CourseV2 } from "@/lib/types/sidebar"

const PracticeCourseContext = React.createContext<CourseV2 | undefined>(undefined)

export function PracticeCourseProvider({
	coursePromise,
	children
}: {
	coursePromise: Promise<CourseV2 | undefined>
	children: React.ReactNode
}) {
	const course = React.use(coursePromise)
	return <PracticeCourseContext.Provider value={course}>{children}</PracticeCourseContext.Provider>
}

export function usePracticeCourse(): CourseV2 | undefined {
	return React.useContext(PracticeCourseContext)
}
