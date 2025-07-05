import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

// #region SCHEMAS AND TYPES
// =================================================================================

// -----------------------------------------------------------------------------
// STRICT ENUM OF ALL GRAPHQL __typename VALUES WE HANDLE
// -----------------------------------------------------------------------------
export const ContentTypeSchema = z
	.enum([
		"Article",
		"Exercise",
		"Lesson",
		"LearnableCourseChallenge",
		"LearnableMasteryChallenge",
		"Topic",
		"TopicQuiz",
		"TopicUnitTest",
		"Unit",
		"Video"
	])
	.describe("All first‑class content types returned by content endpoints")

export type ContentType = z.infer<typeof ContentTypeSchema>

// Schema for a full Article payload from ContentForPath
const LearnableArticleSchema = z
	.object({
		__typename: z.literal("Article"),
		id: z.string(),
		slug: z.string(),
		contentKind: z.literal("Article"),
		translatedTitle: z.string(),
		translatedDescription: z.string(),
		translatedPerseusContent: z.string(), // This is the stringified JSON with the article's rich content
		articleClarificationsEnabled: z.boolean().optional()
	})
	.strict()
export type LearnableArticle = z.infer<typeof LearnableArticleSchema>

// Schema for video-related content
const VideoSubtitleSchema = z.object({
	__typename: z.literal("VideoSubtitle"),
	endTime: z.number(),
	startTime: z.number(),
	text: z.string(),
	kaIsValid: z.boolean()
})

const KeyMomentSchema = z.object({
	__typename: z.literal("KeyMoment"),
	label: z.string(),
	startOffset: z.number(),
	endOffset: z.number()
})

const ThumbnailUrlSchema = z.object({
	__typename: z.literal("ThumbnailUrl"),
	category: z.string(),
	url: z.string().url()
})

const VideoAuthorSchema = z.object({
	__typename: z.literal("Author"),
	name: z.string()
})

// This represents the `learnableContent` part of the response for a Video
const LearnableVideoSchema = z
	.object({
		__typename: z.literal("Video"),
		id: z.string(),
		augmentedTranscript: z.any().nullable(),
		educationalLevel: z.string().nullable(),
		learningResourceType: z.string().nullable(),
		keywords: z.string(),
		translatedCustomTitleTag: z.string(),
		authorNames: z.array(z.string()),
		contentKind: z.literal("Video"),
		dateAdded: z.string().datetime({ offset: true }),
		description: z.string(),
		descriptionHtml: z.string(),
		downloadUrls: z.string(), // This is a stringified JSON
		duration: z.number(),
		kaUrl: z.string().url(),
		keyMoments: z.array(KeyMomentSchema).nullable(),
		nodeSlug: z.string(),
		readableId: z.string(),
		slug: z.string(),
		subtitles: z.array(VideoSubtitleSchema),
		thumbnailUrls: z.array(ThumbnailUrlSchema),
		translatedTitle: z.string(),
		url: z.string().url().optional(),
		videoLicenseTitle: z.string().nullable().optional(),
		videoLicenseUrl: z.string().nullable().optional(),
		youtubeCcCaption: z.boolean().optional(),
		youtubeId: z.string(),
		translatedYoutubeId: z.string().optional(),
		videoAuthorList: z.array(VideoAuthorSchema).optional(),
		// New fields discovered in the error
		clarificationsEnabled: z.boolean().optional(),
		imageUrl: z.string().optional(),
		kaUserLicense: z.string().nullable().optional(),
		relativeUrl: z.string().optional(),
		sha: z.string().optional(),
		translatedDescription: z.string().optional(),
		translatedDescriptionHtml: z.string().optional(),
		translatedYoutubeLang: z.string().optional()
	})
	.strict()
export type LearnableVideo = z.infer<typeof LearnableVideoSchema>

// Schema for ContentForLearnableContent (for Videos) - now using the schemas defined above

const ContentForLearnableContentResponseSchema = z.object({
	data: z.object({
		learnableContent: LearnableVideoSchema,
		content: z.object({
			metadata: z.object({
				commitSha: z.string()
			})
		})
	})
})
export type ContentForLearnableContentResponse = z.infer<typeof ContentForLearnableContentResponseSchema>

// UPDATED: All info interfaces now include a `path`.
// NEW: Define the union of all possible leaf/content node types.
export type LessonChild = VideoInfo | ArticleInfo | ExerciseInfo
// NEW: Define the union of all possible unit-level container types.
export type UnitChild = LessonInfo | QuizInfo | UnitTestInfo
// NEW: Define the union of all possible course-level container types.
export type CourseChild = UnitInfo | CourseChallengeInfo | MasteryChallengeInfo

// -----------------------------------------------------------------------------
// MODIFIED: Update the primary Info interfaces for the new data structure
// -----------------------------------------------------------------------------

// NEW: A type for the top-level question map.
export type CourseQuestionsMap = {
	[exerciseId: string]: QuestionInfo[]
}

// MODIFIED: All Info interfaces are updated.
export interface CourseInfo {
	type: "Course"
	id: string
	slug: string
	title: string
	description: string
	path: string
	// ADDED: A top-level map to store all questions, keyed by exercise ID.
	questions: CourseQuestionsMap
	children: CourseChild[]
	masterableExerciseIds: string[]
}

export interface UnitInfo {
	type: "Unit"
	id: string
	slug: string
	title: string
	description: string
	path: string
	children: UnitChild[]
}

// A new type representing a fully-fetched and parsed question.
// Omit 'itemData' as it's redundant after being parsed.
export interface QuestionInfo extends Omit<AssessmentItem, "itemData"> {
	parsedData: unknown
}

// MODIFIED: Course/Mastery challenges no longer store questions directly.
// The consumer will use `course.masterableExerciseIds` to find questions.
export interface CourseChallengeInfo {
	type: "CourseChallenge"
	id: string
	slug: string
	title: string
	description: string
	path: string
}

// MODIFIED: Course/Mastery challenges no longer store questions directly.
export interface MasteryChallengeInfo {
	type: "MasteryChallenge"
	id: string
	slug: string
	title: string
	description: string
	path: string
}

// A new type representing a fully-fetched video.
export interface VideoInfo extends Partial<LearnableVideo> {
	type: "Video"
	id: string
	slug: string
	title: string
	path: string
}

// A new type representing a fully-fetched article.
export interface ArticleInfo extends Partial<LearnableArticle> {
	type: "Article"
	id: string
	slug: string
	title: string
	description: string
	path: string
}

// MODIFIED: Quizzes now reference exercises by ID.
export interface QuizInfo {
	type: "Quiz"
	id: string
	slug: string
	title: string
	description: string
	path: string
	exerciseIds: string[]
}

// MODIFIED: Unit Tests now reference exercises by ID.
export interface UnitTestInfo {
	type: "UnitTest"
	id: string
	slug: string
	title: string
	description: string
	path: string
	exerciseIds: string[]
}

export interface LessonInfo {
	type: "Lesson"
	id: string
	slug: string
	title: string
	description: string
	path: string
	children: LessonChild[]
}

// MODIFIED: Exercises no longer store their own questions.
export interface ExerciseInfo {
	type: "Exercise"
	id: string
	slug: string
	title: string
	description: string
	path: string
}

// Schema for GetOrCreatePracticeTask
export const PracticeTaskSchema = z.object({
	id: z.string(),
	key: z.string(), // Renamed from taskKey for accuracy, and added
	contentKey: z.string().nullable(), // Corrected from taskContentKey and made nullable
	exerciseLength: z.number(),
	reservedItems: z.array(z.string()).nullable(), // Made nullable to handle cases when Khan Academy returns null
	taskAttemptHistory: z.array(
		z.object({
			correct: z.boolean(),
			itemId: z.string()
		})
	)
})
export type PracticeTask = z.infer<typeof PracticeTaskSchema>

const UserExerciseSchema = z.object({
	exerciseModel: z.object({
		id: z.string(),
		displayName: z.string(),
		problemTypes: z.array(
			z.object({
				items: z.array(z.object({ id: z.string(), sha: z.string() }))
			})
		)
	})
})
export type UserExercise = z.infer<typeof UserExerciseSchema>

export const GetOrCreatePracticeTaskResponseSchema = z.object({
	data: z.object({
		getOrCreatePracticeTask: z.object({
			result: z.object({
				error: z.union([z.object({ code: z.string() }).passthrough(), z.null()]),
				userTask: z
					.object({
						task: PracticeTaskSchema,
						userExercises: z.array(UserExerciseSchema)
					})
					.nullable()
			})
		})
	})
})
export type GetOrCreatePracticeTaskResponse = z.infer<typeof GetOrCreatePracticeTaskResponseSchema>

// Schema for GetAssessmentItem
export const AssessmentItemSchema = z.object({
	id: z.string(),
	sha: z.string(),
	problemType: z.string(),
	itemData: z.string(), // This is a stringified JSON
	isContextInaccessible: z.boolean().optional()
})
export type AssessmentItem = z.infer<typeof AssessmentItemSchema>

// ADDED: A schema for the error object returned upon completion.
const AssessmentErrorSchema = z
	.object({
		code: z.string(),
		debugMessage: z.string().nullable().optional()
	})
	.passthrough()

// ADDED: Input type for the getAssessmentItem GraphQL query
export type AssessmentItemInput =
	| {
			exerciseId: string
			itemId: string
	  }
	| {
			exerciseId: string
			problemNumber: number
			quizProblemNumber?: null
			previousItemIds?: string[]
			ancestorIds?: string[]
	  }

// MODIFIED: The main response schema is now more flexible.
export const GetAssessmentItemResponseSchema = z.object({
	data: z.object({
		assessmentItem: z.object({
			__typename: z.literal("AssessmentItemOrError"),
			error: AssessmentErrorSchema.nullable(),
			item: AssessmentItemSchema.nullable()
		})
	})
})
export type GetAssessmentItemResponse = z.infer<typeof GetAssessmentItemResponseSchema>

// Schema for learnMenuTopicsQuery
export const TopicBrowserLinkSchema = z.object({
	__typename: z.literal("TopicBrowserLink"),
	href: z.string(),
	slug: z.string(),
	translatedTitle: z.string(),
	isNew: z.boolean(),
	courseId: z.string().nullable()
})
export type TopicBrowserLink = z.infer<typeof TopicBrowserLinkSchema>

export const TopicBrowserCategorySchema = z.object({
	__typename: z.literal("TopicBrowserCategory"),
	href: z.string(),
	slug: z.string(),
	translatedTitle: z.string(),
	isNew: z.boolean(),
	domainId: z.string(),
	icon: z.string().url(),
	children: z.array(TopicBrowserLinkSchema)
})
export type TopicBrowserCategory = z.infer<typeof TopicBrowserCategorySchema>

export const LearnMenuTopicsResponseSchema = z.object({
	data: z.object({
		learnMenuTopics: z.array(TopicBrowserCategorySchema)
	})
})
export type LearnMenuTopicsResponse = z.infer<typeof LearnMenuTopicsResponseSchema>

// NEW: A type alias for the de-duplication cache maps. This provides a
// clean interface for the calling function to manage state.
export type ContentCaches = {
	allDiscoveredExercises: Map<string, ExerciseInfo>
	allDiscoveredVideos: Map<string, VideoInfo>
	allDiscoveredArticles: Map<string, ArticleInfo>
}

/**
 * @internal
 * A tiny helper so we can replace lines like
 * `const validation = SomeSchema.safeParse(blob)` with
 * `const data = assertSchema(SomeSchema, blob)`
 * and get typed `data` immediately.
 */
export function assertSchema<T>(schema: z.ZodType<T>, raw: unknown): T {
	const result = schema.safeParse(raw)
	if (!result.success) {
		logger.error("Zod validation failed", { error: result.error })
		throw errors.wrap(result.error, "khan-api: schema validation failed")
	}
	return result.data
}

// =================================================================================
// #endregion

// #region ZOD SCHEMAS FOR INFO TYPES
// =================================================================================
// These schemas provide the single source of truth for our data model validation.
// They use z.lazy() to handle recursive types gracefully.

// Use z.lazy to handle recursive types gracefully.
export const VideoInfoSchema: z.ZodType<VideoInfo> = z.lazy(() =>
	LearnableVideoSchema.partial().extend({
		type: z.literal("Video"),
		id: z.string().min(1),
		slug: z.string(),
		title: z.string().min(1),
		path: z.string().min(1)
	})
)

export const ArticleInfoSchema: z.ZodType<ArticleInfo> = z.lazy(() =>
	LearnableArticleSchema.partial().extend({
		type: z.literal("Article"),
		id: z.string().min(1),
		slug: z.string(),
		title: z.string().min(1),
		description: z.string(),
		path: z.string().min(1)
	})
)

export const ExerciseInfoSchema: z.ZodType<ExerciseInfo> = z.lazy(() =>
	z.object({
		type: z.literal("Exercise"),
		id: z.string().min(1),
		slug: z.string(),
		title: z.string().min(1),
		description: z.string(),
		path: z.string().min(1)
	})
)

export const LessonInfoSchema: z.ZodType<LessonInfo> = z.lazy(() =>
	z.object({
		type: z.literal("Lesson"),
		id: z.string().min(1),
		slug: z.string().min(1), // Add slug schema validation
		title: z.string().min(1),
		description: z.string(),
		path: z.string().min(1),
		children: z.array(z.union([VideoInfoSchema, ArticleInfoSchema, ExerciseInfoSchema]))
	})
)

// Define schemas for all Assessment types (Quiz, UnitTest, etc.)
// These schemas are where we can enforce that questions are not empty.
export const QuizInfoSchema: z.ZodType<QuizInfo> = z.lazy(() =>
	z.object({
		type: z.literal("Quiz"),
		id: z.string().min(1),
		slug: z.string(),
		title: z.string().min(1),
		description: z.string(),
		path: z.string().min(1),
		exerciseIds: z.array(z.string())
	})
)

export const UnitTestInfoSchema: z.ZodType<UnitTestInfo> = z.lazy(() =>
	z.object({
		type: z.literal("UnitTest"),
		id: z.string().min(1),
		slug: z.string(),
		title: z.string().min(1),
		description: z.string(),
		path: z.string().min(1),
		exerciseIds: z.array(z.string()).min(1, { message: "Unit Test must cover at least one exercise." })
	})
)

// For Course/Mastery Challenges, a title is optional as the API may not provide it.
export const CourseChallengeInfoSchema: z.ZodType<CourseChallengeInfo> = z.lazy(() =>
	z.object({
		type: z.literal("CourseChallenge"),
		id: z.string().min(1),
		slug: z.string(),
		title: z.string(), // Allow empty string from API, but it must exist
		description: z.string(),
		path: z.string().min(1)
	})
)

export const MasteryChallengeInfoSchema: z.ZodType<MasteryChallengeInfo> = z.lazy(() =>
	z.object({
		type: z.literal("MasteryChallenge"),
		id: z.string().min(1),
		slug: z.string(),
		title: z.string(), // Allow empty string from API, but it must exist
		description: z.string(),
		path: z.string().min(1)
	})
)

export const UnitInfoSchema: z.ZodType<UnitInfo> = z.lazy(() =>
	z.object({
		type: z.literal("Unit"),
		id: z.string().min(1),
		slug: z.string().min(1), // Add slug schema validation
		title: z.string().min(1),
		description: z.string(),
		path: z.string().min(1),
		children: z.array(z.union([LessonInfoSchema, QuizInfoSchema, UnitTestInfoSchema]))
	})
)

// This is the master schema for the entire file.
export const CourseInfoSchema: z.ZodType<CourseInfo> = z.lazy(() =>
	z.object({
		type: z.literal("Course"),
		id: z.string().min(1),
		slug: z.string().min(1),
		title: z.string().min(1),
		description: z.string(),
		path: z.string().min(1),
		questions: z.record(z.string(), z.array(z.any())),
		children: z.array(z.union([UnitInfoSchema, CourseChallengeInfoSchema, MasteryChallengeInfoSchema])),
		masterableExerciseIds: z.array(z.string())
	})
)
// =================================================================================
// #endregion
