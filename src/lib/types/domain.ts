// src/lib/types/domain.ts
// REASON: This new file consolidates all core data models into a single, authoritative source of truth,
// eliminating fragmentation and improving type safety across the application.

/** Represents a single question in an assessment. */
export interface Question {
	id: string
}

/** Base interface for a node in the content hierarchy. */
export interface ContentNode {
	id: string
	slug: string
	title: string
	description: string
	path: string
	xp: number
}

// --- Content Types ---

export interface Video extends ContentNode {
	type: "Video"
	youtubeId: string
	duration?: number // in seconds
}

export interface Article extends ContentNode {
	type: "Article"
}

export interface Exercise extends ContentNode {
	type: "Exercise"
	totalQuestions: number
	questionsToPass: number
	questions: Question[] // Full exercise includes questions
}

/** A lighter version of Exercise for lists where question data is not needed. */
export type ExerciseInfo = Omit<Exercise, "questions">

// --- Assessment Types ---

export interface BaseAssessment extends ContentNode {
	questions: Question[]
}

export interface Quiz extends BaseAssessment {
	type: "Quiz"
}

export interface UnitTest extends BaseAssessment {
	type: "UnitTest"
}

export interface CourseChallenge extends BaseAssessment {
	type: "CourseChallenge"
}

// --- Structural Types ---

export type LessonChild = Video | Article | ExerciseInfo

export interface Lesson extends ContentNode {
	type: "Lesson"
	children: LessonChild[]
}

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
	challenges: CourseChallenge[]
}

// --- Profile & Subject Types ---

export interface ProfileCourse extends Pick<Course, "id" | "title" | "description" | "path" | "units"> {
	subject?: string
	courseSlug?: string
	earnedXP?: number
	totalXP?: number
}

export interface ProfileSubject {
	slug: string
	title: string
	courses: Pick<Course, "id" | "slug" | "title" | "path">[]
}
