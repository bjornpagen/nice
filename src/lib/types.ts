/**
 * This file contains the canonical, shared types for all data entities used across the application.
 * It serves as the single source of truth for data shapes returned by our data fetchers.
 */

// --- Core Content & Structure Types ---

export interface Question {
	id: string
	exerciseId: string // The exercise this question belongs to
	qtiIdentifier: string // The identifier for the QTI system
}

// Base type for any piece of learnable content (Video, Article, Exercise)
export interface ContentNode {
	id: string
	slug: string
	title: string
	description: string
	path: string
}

export interface Video extends ContentNode {
	type: "Video"
	youtubeId: string
	duration: number // in seconds
}

export interface Article extends ContentNode {
	type: "Article"
	// For stimulus rendering via QTI
	qtiIdentifier: string
}

export interface Exercise extends ContentNode {
	type: "Exercise"
	questions: Question[]
}

// --- Assessment Types ---
// Base type for assessments like Quizzes and Unit Tests
export interface BaseAssessment {
	id: string
	slug: string
	title: string
	description: string
	path: string
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

// Union type for all learnable child content
export type LessonChild = Video | Article | Exercise

// --- Container Types ---

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

// --- Page-Specific Data Payloads ---
// These types represent the complete data needed for a specific page,
// as returned by the primary data fetcher for that page.

// Data for the main /<subject>/<course> page
export interface CoursePageData {
	params: { subject: string; course: string }
	course: Course
	lessonCount: number // Aggregate count for the sidebar
}

// Data for the /<subject>/<course>/<unit> page
export interface UnitPageData {
	params: { subject: string; course: string; unit: string }
	course: Pick<Course, "id" | "title" | "path" | "description">
	allUnits: Unit[] // All units in the course for the sidebar
	unit: Unit // The specific unit being viewed
	lessonCount: number
	challenges: CourseChallenge[]
}

// Data for the /.../[lesson] layout
export interface LessonLayoutData {
	subject: string
	courseData: Pick<Course, "title" | "path">
	unitData: Unit // All data for the current unit, including all its lessons
	lessonData: Lesson // The specific lesson being viewed
}

// Data for the /.../a/[article] page
export interface ArticlePageData {
	id: string
	title: string
	identifier: string // QTI stimulus identifier
}

// Data for the /.../v/[video] page
export interface VideoPageData {
	id: string
	title: string
	description: string
	youtubeId: string
}

// Data for the /.../e/[exercise] page
export interface ExercisePageData {
	exercise: Pick<Exercise, "id" | "title"> & { type: "Exercise" }
	questions: Question[]
}

// Data for the /.../quiz/[quiz] page
export interface QuizPageData {
	quiz: Pick<Quiz, "id" | "title" | "description"> & { type: "Quiz" }
	questions: Question[]
}

// Data for the /.../test/[test] page (Unit Test)
export interface UnitTestPageData {
	test: Pick<UnitTest, "id" | "title" | "description"> & { type: "UnitTest" }
	questions: Question[]
}

// Data for the /.../test/[test] page (Course Challenge)
export interface CourseChallengePageData {
	test: Pick<CourseChallenge, "id" | "title" | "description" | "slug"> & { type: "CourseChallenge" }
	questions: Question[]
}

export interface CourseChallengeLayoutData {
	course: Pick<Course, "id" | "title" | "description" | "path" | "units">
	lessonCount: number
	challenges: CourseChallenge[]
}

// Data for the /profile/me/courses page
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

export interface ProfileCoursesPageData {
	subjects: ProfileSubject[]
	userCourses: ProfileCourse[]
}
