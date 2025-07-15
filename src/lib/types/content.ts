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
