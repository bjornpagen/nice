"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import type { Course } from "@/lib/v2/types"

type CourseContextValue = {
	course: Course
}

const CourseContext = React.createContext<CourseContextValue | undefined>(undefined)

export function CourseProvider({ children, promise }: { children: React.ReactNode; promise: Promise<Course> }) {
	const course = React.use(promise)

	return <CourseContext.Provider value={{ course }}>{children}</CourseContext.Provider>
}

export function useCourse() {
	const ctx = React.useContext(CourseContext)
	if (!ctx) {
		throw errors.new("useCourse must be used within a CourseProvider")
	}
	return ctx
}

export function useCourseSelector<T>(selector: (course: Course) => T): T {
	const { course } = useCourse()
	return React.useMemo(() => selector(course), [course, selector])
}
