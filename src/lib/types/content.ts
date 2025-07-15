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

export interface Exercise extends ContentNode {
	type: "Exercise"
	questions: Question[]
}
