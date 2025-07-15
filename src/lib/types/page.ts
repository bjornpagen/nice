import type { CourseChallenge, Quiz, UnitTest } from "./assessment"
import type { Exercise, Question } from "./content"
import type { ProfileCourse, ProfileSubject } from "./profile"
import type { Course, Lesson, Unit } from "./structure"

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
export interface ProfileCoursesPageData {
	subjects: ProfileSubject[]
	userCourses: ProfileCourse[]
}
