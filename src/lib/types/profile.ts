import type { Course } from "./structure"

export interface ProfileCourse extends Pick<Course, "id" | "title" | "description" | "path" | "units"> {
	subject?: string
	courseSlug?: string
	metadata?: Record<string, unknown>
}

export interface ProfileSubject {
	slug: string
	title: string
	courses: Pick<Course, "id" | "slug" | "title" | "path">[]
}
