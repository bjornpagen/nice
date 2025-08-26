import type { Course, Lesson, ProfileCourse, ProfileSubject, Question, Unit } from "./domain"

// Data for the main /<subject>/<course> page
export interface CoursePageData {
	params: { subject: string; course: string }
	course: Course
	lessonCount: number // Aggregate count for the sidebar
	totalXP: number // Total XP available in the course
}

// Data for the /<subject>/<course>/<unit> page
export interface UnitPageData {
	params: { subject: string; course: string; unit: string }
	course: Course // Return the full course object
	allUnits: Unit[] // All units in the course for the sidebar
	unit: Unit // The specific unit being viewed
	lessonCount: number
	challenges: Course["challenges"]
	totalXP: number // Total XP available in the unit
}

// Data for the /.../[lesson] layout
export interface LessonLayoutData {
	subject: string
	courseData: Pick<Course, "id" | "title" | "path">
	unitData: Unit // All data for the current unit, including all its lessons
	lessonData: Lesson // The specific lesson being viewed
}

// Data for the /.../a/[article] page
export interface ArticlePageData {
	id: string
	componentResourceSourcedId: string
	title: string
	xp: number
}

// Data for the /.../v/[video] page
export interface VideoPageData {
	id: string
	componentResourceSourcedId: string
	title: string
	description: string
	youtubeId: string
	xp: number
}

// Data for the /.../e/[exercise] page
export interface ExercisePageData {
	exercise: {
		id: string // This is the Resource sourcedId
		componentResourceSourcedId: string // This is the ID needed for XP farming prevention
		onerosterCourseSourcedId: string // The ID of the parent course for cache invalidation
		title: string
		path: string
		type: "Exercise"
		expectedXp: number
	}
	questions: Question[]
	layoutData: LessonLayoutData
}

// Data for the /.../quiz/[quiz] page
export interface QuizPageData {
	quiz: {
		id: string // This is the Resource sourcedId
		componentResourceSourcedId: string // This is the ID PowerPath needs
		onerosterCourseSourcedId: string // The ID of the parent course for cache invalidation
		title: string
		path: string
		description: string
		type: "Quiz"
		expectedXp: number
	}
	questions: Question[]
	layoutData: LessonLayoutData
}

// Data for the /.../test/[test] page (Unit Test)
export interface UnitTestPageData {
	test: {
		id: string // This is the Resource sourcedId
		componentResourceSourcedId: string // This is the ID PowerPath needs
		onerosterCourseSourcedId: string // The ID of the parent course for cache invalidation
		title: string
		path: string
		description: string
		type: "UnitTest"
		expectedXp: number
	}
	questions: Question[]
	layoutData: LessonLayoutData
}

// Data for the /.../test/[test] page (Course Challenge)
export interface CourseChallengePageData {
	test: {
		id: string // This is the Resource sourcedId
		componentResourceSourcedId: string // This is the ID PowerPath needs
		onerosterCourseSourcedId: string // The ID of the parent course for cache invalidation
		title: string
		path: string
		description: string
		slug: string
		type: "CourseChallenge"
		expectedXp: number
	}
	questions: Question[]
}

export interface CourseChallengeLayoutData {
	course: Pick<Course, "id" | "title" | "description" | "path" | "units">
	lessonCount: number
	challenges: Course["challenges"]
}

// Data for the /profile/me/courses page
export interface ProfileCoursesPageData {
	subjects: ProfileSubject[]
	userCourses: ProfileCourse[]
	needsSync?: boolean // True if user doesn't have sourceId yet
}
