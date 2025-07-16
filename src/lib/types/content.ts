export interface Question {
	id: string
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
	duration?: number // in seconds (optional)
}

export interface Article extends ContentNode {
	type: "Article"
}

// Exercise type for display purposes (no questions array needed)
export interface ExerciseInfo extends ContentNode {
	type: "Exercise"
	totalQuestions: number
	questionsToPass: number
}

// Full Exercise type when questions are actually needed
export interface Exercise extends ExerciseInfo {
	questions: Question[]
}
