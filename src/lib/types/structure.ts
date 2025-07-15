import type { CourseChallenge, Quiz, UnitTest } from "./assessment"
import type { Article, ContentNode, Exercise, Video } from "./content"

// Union type for all learnable child content
export type LessonChild = Video | Article | Exercise

export interface Lesson extends ContentNode {
	type: "Lesson"
	children: LessonChild[]
}

// Union type for all content that can be a direct child of a Unit
export type UnitChild = Lesson | Quiz | UnitTest

export interface Unit {
	id: string
	slug: string
	title: string
	description: string
	path: string
	ordering: number
	children: UnitChild[]
}

export interface Course {
	id: string
	slug: string
	title: string
	description: string
	path: string
	units: Unit[]
	challenges: CourseChallenge[] // Course-level challenges
}

export interface Subject {
	slug: string
	title: string
	courses: Pick<Course, "id" | "slug" | "title" | "path">[]
}
