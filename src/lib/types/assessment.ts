import type { Question } from "./content"

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
