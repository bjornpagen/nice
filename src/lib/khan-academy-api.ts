import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

// #region UTILITY AND CONSTANTS
// =================================================================================

// --- EXPORTED ERROR CONSTANTS ---
export const ErrNoListedPathData = errors.new("no listedPathData in content response")
export const ErrNoCourseData = errors.new("no course data in content response")

const API_BASE_URL = "https://www.khanacademy.org/api/internal/graphql"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	options: { retries: number; initialDelay: number }
): Promise<{ data: T | null; error: Error | null }> {
	let lastError: Error | null = null

	for (let i = 0; i < options.retries; i++) {
		const result = await errors.try(fn())
		if (result.error) {
			lastError = result.error
			const delay = options.initialDelay * 2 ** i
			logger.warn("operation failed, retrying after delay", {
				attempt: i + 1,
				maxRetries: options.retries,
				delayMs: delay,
				error: lastError
			})
			await sleep(delay)
		} else {
			return { data: result.data, error: null }
		}
	}

	return { data: null, error: lastError }
}
// =================================================================================
// #endregion

// #region SCHEMAS AND TYPES
// =================================================================================

// -----------------------------------------------------------------------------
// STRICT ENUM OF ALL GRAPHQL __typename VALUES WE HANDLE
// -----------------------------------------------------------------------------
export const ContentTypeSchema = z
	.enum([
		"Article",
		"Exercise",
		"Interactive",
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

const TypenameSchema = z.object({ __typename: z.string() }).passthrough()

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

// ADD: A schema to represent the nested exercise structure within coveredTutorials
// UPDATE: Use a flexible schema with the new enum for content within covered tutorials.
const CoveredTutorialContentSchema = z.object({
	__typename: ContentTypeSchema,
	id: z.string()
})

const CoveredTutorialSchema = z.object({
	__typename: z.literal("Topic"),
	allLearnableContent: z.array(CoveredTutorialContentSchema)
})

// UPDATE: Modify PathQuizSchema to use the ContentType enum.
const PathQuizSchema = z
	.object({
		__typename: z.literal("TopicQuiz"),
		id: z.string(),
		slug: z.string(),
		translatedTitle: z.string().min(1),
		translatedDescription: z.string().optional(),
		contentKind: z.string(),
		// REMOVED: coveredTutorials is NOT present on TopicQuiz objects.
		coveredTutorials: z.array(CoveredTutorialSchema).optional(),
		exerciseLength: z.number().optional(),
		index: z.number().optional(),
		timeEstimate: z
			.object({
				__typename: z.string().optional(),
				lowerBound: z.number(),
				upperBound: z.number()
			})
			.optional()
	})
	.strict()

// UPDATE: Modify PathUnitTestSchema to use the ContentType enum.
const PathUnitTestSchema = z
	.object({
		__typename: z.literal("TopicUnitTest"),
		id: z.string(),
		slug: z.string(),
		translatedTitle: z.string().min(1),
		contentKind: z.string(),
		// This field is present for Unit Tests and contains the exercise list.
		coveredTutorials: z.array(CoveredTutorialSchema).optional(),
		exerciseLength: z.number().optional(),
		index: z.number().optional(),
		timeEstimate: z
			.object({
				__typename: z.string().optional(),
				lowerBound: z.number(),
				upperBound: z.number()
			})
			.optional()
	})
	.strict()

// ADD: New schema for LearnableCourseChallenge
const LearnableCourseChallengeSchema = z.object({
	__typename: z.literal("LearnableCourseChallenge"),
	id: z.string(),
	slug: z.string(),
	translatedTitle: z.string().optional()
})

// ADD: New schema for LearnableMasteryChallenge
const LearnableMasteryChallengeSchema = z.object({
	__typename: z.literal("LearnableMasteryChallenge"),
	id: z.string(),
	slug: z.string(),
	translatedTitle: z.string().optional()
})

// Schema for GetContentForPath - Corrected for flexibility and accuracy
const ContentForPathResponseSchema = z.object({
	data: z.object({
		contentRoute: z.object({
			listedPathData: z
				.object({
					content: z
						.union([
							z
								.object({
									__typename: z.literal("Exercise"),
									id: z.string(),
									slug: z.string(),
									translatedTitle: z.string()
								})
								.strict(),
							LearnableArticleSchema, // Articles can appear here when fetching their direct path
							LearnableVideoSchema, // ADDED: Allow full video objects to be returned for a path
							// ADD: Include schemas for container assessments
							PathQuizSchema,
							PathUnitTestSchema
						])
						.nullable(),
					course: z
						.object({
							__typename: z.literal("Course"),
							id: z.string(),
							parent: z.object({
								id: z.string()
							}),
							slug: z.string(),
							translatedTitle: z.string(),
							translatedDescription: z.string().optional(),
							// Correctly nested under `course`
							unitChildren: z.array(z.record(z.unknown())).optional(),
							// ADD: masterableExercises for Course Challenges
							masterableExercises: z
								.array(
									z.object({
										__typename: z.literal("Exercise"),
										id: z.string()
									})
								)
								.nullable()
								.optional(),
							// Challenges might be either a string (course ID) or an object
							courseChallenge: LearnableCourseChallengeSchema.nullable().optional(),
							masteryChallenge: LearnableMasteryChallengeSchema.nullable().optional()
						})
						.nullable(),
					lesson: z
						.object({
							__typename: z.literal("Lesson"),
							id: z.string(),
							translatedTitle: z.string().optional(),
							curatedChildren: z.array(z.record(z.unknown())).optional()
						})
						.nullable()
				})
				.nullable()
		})
	})
})
type ContentForPathResponse = z.infer<typeof ContentForPathResponseSchema>

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

// UPDATED: Schemas now include optional translatedDescription.
const ExerciseSchema = z
	.object({
		__typename: z.literal("Exercise"),
		id: z.string(),
		slug: z.string(),
		translatedTitle: z.string().min(1),
		translatedDescription: z.string().optional(),
		canonicalUrl: z.string().optional(),
		contentDescriptor: z.string().optional(),
		contentKind: z.string().optional(),
		exerciseLength: z.number().optional(),
		isSkillCheck: z.boolean().optional(),
		progressKey: z.string().optional(),
		sponsored: z.boolean().optional(),
		thumbnailUrl: z.string().optional(),
		timeEstimate: z
			.object({
				__typename: z.string().optional(),
				lowerBound: z.number(),
				upperBound: z.number()
			})
			.optional(),
		translatedCustomTitleTag: z.string().optional(),
		urlWithinCurationNode: z.string().optional(),
		parentTopic: z.object({
			id: z.string(),
			parent: z
				.object({
					id: z.string(),
					masteryEnabled: z.boolean().optional()
				})
				.optional()
		})
	})
	.strict()

// This schema is used to identify video stubs in a lesson's children list.
// It assumes a structure similar to ExerciseSchema for contextual ID retrieval.
const VideoStubSchema = z
	.object({
		__typename: z.literal("Video"),
		id: z.string(),
		slug: z.string(),
		translatedTitle: z.string().min(1),
		canonicalUrl: z.string().optional(),
		contentDescriptor: z.string().optional(),
		contentKind: z.string().optional(),
		progressKey: z.string().optional(),
		translatedCustomTitleTag: z.string().optional(),
		translatedDescription: z.string().optional(),
		urlWithinCurationNode: z.string().optional(),
		parentTopic: z.object({
			id: z.string(),
			parent: z
				.object({
					id: z.string(),
					masteryEnabled: z.boolean().optional()
				})
				.optional()
		})
	})
	.strict()

// Schema to identify article stubs during content discovery
const ArticleStubSchema = z
	.object({
		__typename: z.literal("Article"),
		id: z.string(),
		slug: z.string(),
		translatedTitle: z.string().min(1),
		translatedDescription: z.string().optional(),
		urlWithinCurationNode: z.string(),
		canonicalUrl: z.string().optional(),
		contentDescriptor: z.string().optional(),
		contentKind: z.string().optional(),
		progressKey: z.string().optional(),
		translatedCustomTitleTag: z.string().optional(),
		parentTopic: z.object({
			id: z.string(),
			parent: z
				.object({
					id: z.string(),
					masteryEnabled: z.boolean().optional()
				})
				.optional()
		})
	})
	.strict()

const LessonSchema = z
	.object({
		__typename: z.literal("Lesson"),
		id: z.string(),
		slug: z.string(),
		key: z.string().optional(),
		translatedTitle: z.string().min(1),
		translatedDescription: z.string().optional(),
		curatedChildren: z.array(z.record(z.string(), z.unknown())).optional(),
		iconPath: z.string().optional(),
		isListedForLearners: z.boolean().optional(),
		masteryEnabled: z.boolean().optional(),
		relativeUrl: z.string().optional(),
		translatedCustomTitleTag: z.string().optional(),
		unlistedAncestorIds: z.array(z.string()).nullable().optional()
	})
	.strict()

// ADD: New schema for TopicQuiz
const TopicQuizSchema = z
	.object({
		__typename: z.literal("TopicQuiz"),
		id: z.string(),
		slug: z.string(),
		translatedTitle: z.string().min(1),
		translatedDescription: z.string().optional(),
		canonicalUrl: z.string().optional(),
		contentDescriptor: z.string().optional(),
		contentKind: z.string().optional(),
		exerciseLength: z.number().optional(),
		index: z.number().optional(),
		parentTopic: z
			.object({
				id: z.string(),
				parent: z
					.object({
						id: z.string(),
						masteryEnabled: z.boolean().optional()
					})
					.optional()
			})
			.optional(),
		progressKey: z.string().optional(),
		timeEstimate: z
			.object({
				__typename: z.string().optional(),
				lowerBound: z.number(),
				upperBound: z.number()
			})
			.optional(),
		translatedCustomTitleTag: z.string().optional(),
		urlWithinCurationNode: z.string().optional()
	})
	.strict()

// ADD: New schema for TopicUnitTest
const TopicUnitTestSchema = z
	.object({
		__typename: z.literal("TopicUnitTest"),
		id: z.string(),
		slug: z.string(),
		translatedTitle: z.string().min(1),
		translatedDescription: z.string().optional(),
		canonicalUrl: z.string().optional(),
		contentDescriptor: z.string().optional(),
		contentKind: z.string().optional(),
		exerciseLength: z.number().optional(),
		parentTopic: z
			.object({
				id: z.string(),
				parent: z
					.object({
						id: z.string(),
						masteryEnabled: z.boolean().optional()
					})
					.optional()
			})
			.optional(),
		progressKey: z.string().optional(),
		timeEstimate: z
			.object({
				__typename: z.string().optional(),
				lowerBound: z.number(),
				upperBound: z.number()
			})
			.optional(),
		translatedCustomTitleTag: z.string().optional(),
		urlWithinCurationNode: z.string().optional()
	})
	.strict()

const UnitSchema = z
	.object({
		__typename: z.literal("Unit"),
		id: z.string(),
		slug: z.string(),
		translatedTitle: z.string().min(1),
		translatedDescription: z.string().optional(),
		allOrderedChildren: z.array(z.record(z.string(), z.unknown())).optional(),
		iconPath: z.string().optional(),
		isListedForLearners: z.boolean().optional(),
		masteryEnabled: z.boolean().optional(),
		relativeUrl: z.string().optional(),
		translatedCustomTitleTag: z.string().optional(),
		unlistedAncestorIds: z.array(z.string()).nullable().optional()
	})
	.strict()

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

// #region KHANACADEMY CLIENT CLASS
// =================================================================================

/**
 * A client for interacting with the internal Khan Academy GraphQL API.
 * An instance of this client is tied to a specific user's session.
 */
export class KhanAcademyClient {
	#cookie: string
	#headers: HeadersInit

	/**
	 * Creates a new API client instance.
	 * @param cookie - The user's session cookie string, required for all authenticated requests.
	 */
	constructor(cookie: string) {
		this.#cookie = cookie
		this.#headers = {
			accept: "*/*",
			"accept-language": "en-US,en;q=0.9",
			"cache-control": "no-cache",
			"content-type": "application/json",
			origin: "https://www.khanacademy.org",
			pragma: "no-cache",
			priority: "u=1, i",
			"sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": '"macOS"',
			"sec-fetch-dest": "empty",
			"sec-fetch-mode": "cors",
			"sec-fetch-site": "same-origin",
			"user-agent":
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
			"x-ka-fkey": "1",
			cookie: this.#cookie
		}
	}

	/**
	 * Fetches the list of all course topics for the main navigation menu.
	 * @param region - The region code, e.g., "US-TX", "US".
	 * @returns A promise that resolves with the list of course categories.
	 */
	async getLearnMenuTopics(region: string): Promise<LearnMenuTopicsResponse> {
		logger.info("fetching learn menu topics", { region })
		const operation = async () => {
			const variables = { region }
			const url = new URL(`${API_BASE_URL}/learnMenuTopicsQuery`)
			url.searchParams.set("fastly_cacheable", "persist_until_publish")
			url.searchParams.set("pcv", "9ed3f55d2fd4ec42bdde5c316b9bda8ae329817c")
			url.searchParams.set("hash", "365090232")
			url.searchParams.set("variables", JSON.stringify(variables))
			url.searchParams.set("lang", "en")
			url.searchParams.set("app", "khanacademy")

			const fetchResult = await errors.try(fetch(url.toString(), { method: "GET", headers: this.#headers }))

			if (fetchResult.error) {
				logger.error("network request failed", { url: url.toString(), error: fetchResult.error })
				throw errors.wrap(fetchResult.error, "khan-api: network request failed")
			}

			const response = fetchResult.data
			if (!response.ok) {
				const errorText = await response.text()
				logger.error("api request returned non-ok status", {
					status: response.status,
					url: url.toString(),
					body: errorText
				})
				throw errors.new(`khan-api: request failed with status ${response.status}`)
			}

			const jsonResult = await errors.try(response.json())
			if (jsonResult.error) {
				logger.error("failed to parse json response", { error: jsonResult.error })
				throw errors.wrap(jsonResult.error, "khan-api: failed to parse json response")
			}
			const rawJson = jsonResult.data
			logger.debug("received raw json from learnMenuTopicsQuery", { body: rawJson })

			const data = assertSchema(LearnMenuTopicsResponseSchema, rawJson)
			return data
		}

		const result = await retryWithBackoff(operation, { retries: 3, initialDelay: 1000 })
		if (result.error || !result.data) {
			throw result.error || errors.new("khan-api: unexpected null result from getLearnMenuTopics")
		}
		return result.data
	}

	/**
	 * Creates or retrieves a practice task for a given exercise.
	 * @param exerciseId - The ID of the exercise to practice.
	 * @param ancestorIds - The hierarchical path of topic IDs leading to this exercise.
	 * @returns A promise that resolves with the new task data.
	 */
	async getOrCreatePracticeTask(exerciseId: string, ancestorIds: string[]): Promise<GetOrCreatePracticeTaskResponse> {
		logger.info("creating practice task", { exerciseId })
		const operation = async () => {
			const url = `${API_BASE_URL}/getOrCreatePracticeTask`
			const body = {
				operationName: "getOrCreatePracticeTask",
				variables: {
					input: { exerciseId, stopCardPersist: false, canReserveItems: true },
					ancestorIds
				},
				query:
					"mutation getOrCreatePracticeTask($input: GetOrCreatePracticeTaskInput!, $ancestorIds: [String!]!) {\n  getOrCreatePracticeTask(input: $input) {\n    result {\n      error {\n        code\n        debugMessage\n        __typename\n      }\n      userTask {\n        cards {\n          ...problemCardFields\n          __typename\n        }\n        task {\n          ...practiceTaskFields\n          __typename\n        }\n        userExercises {\n          ...userExerciseFields\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment practiceTaskFields on PracticeTask {\n  id\n  key\n  bonusReservedItems\n  bonusReservedItemsCompleted\n  bonusTaskAttemptHistory {\n    ...taskAttemptHistoryFields\n    __typename\n  }\n  canRestart\n  completionCriteria {\n    name\n    __typename\n  }\n  contentKey\n  exerciseLength\n  isCompleted\n  pointBounty\n  pointsEarned\n  promotionCriteria {\n    ...promotionCriteriaFields\n    __typename\n  }\n  reservedItems\n  reservedItemsCompleted\n  slug\n  taskAttemptHistory {\n    ...taskAttemptHistoryFields\n    __typename\n  }\n  taskType\n  timeEstimate {\n    lowerBound\n    upperBound\n    __typename\n  }\n  __typename\n}\n\nfragment problemCardFields on ProblemCard {\n  cardType\n  done\n  exerciseName\n  problemType\n  __typename\n}\n\nfragment problemTypeFields on ProblemType {\n  items {\n    id\n    live\n    sha\n    __typename\n  }\n  name\n  relatedVideos\n  __typename\n}\n\nfragment promotionCriteriaFields on PromotionCriteria {\n  name\n  value\n  __typename\n}\n\nfragment taskAttemptHistoryFields on TaskProblemAttempt {\n  correct\n  timeDone\n  seenHint\n  itemId\n  __typename\n}\n\nfragment userExerciseFields on UserExercise {\n  exerciseModel: exercise {\n    id\n    assessmentItemCount: numAssessmentItems\n    displayName\n    isQuiz\n    isSkillCheck\n    name\n    nodeSlug\n    progressKey\n    translatedDisplayName\n    relatedContent {\n      id\n      contentKind\n      kind\n      thumbnailUrl\n      translatedTitle\n      urlWithinCurationNode\n      urlWithinClosestAncestor(ancestorIds: $ancestorIds)\n      topicPaths {\n        path {\n          id\n          kind\n          slug\n          __typename\n        }\n        __typename\n      }\n      ... on Article {\n        kaUrl\n        nodeSlug\n        relativeUrl\n        slug\n        __typename\n      }\n      ... on Video {\n        duration\n        imageUrl\n        kaUrl\n        nodeSlug\n        relativeUrl\n        slug\n        translatedYoutubeId\n        __typename\n      }\n      __typename\n    }\n    relatedVideos {\n      contentKind\n      duration\n      id\n      imageUrl\n      kaUrl\n      kind\n      nodeSlug\n      progressKey\n      relativeUrl\n      slug\n      thumbnailUrl\n      translatedDescription\n      translatedTitle\n      translatedYoutubeId\n      __typename\n    }\n    problemTypes {\n      ...problemTypeFields\n      __typename\n    }\n    translatedProblemTypes {\n      ...problemTypeFields\n      __typename\n    }\n    __typename\n  }\n  exercise: exerciseName\n  fpmMasteryLevel\n  lastAttemptNumber\n  lastCountHints\n  lastDone\n  lastMasteryUpdate\n  longestStreak\n  maximumExerciseProgressDt: maximumExerciseProgressDate\n  streak\n  totalCorrect\n  totalDone\n  __typename\n}"
			}

			const fetchResult = await errors.try(
				fetch(url, { method: "POST", headers: this.#headers, body: JSON.stringify(body) })
			)

			if (fetchResult.error) {
				throw errors.wrap(fetchResult.error, "khan-api: network request failed")
			}

			const response = fetchResult.data
			if (!response.ok) {
				throw errors.new(`khan-api: request failed with status ${response.status}`)
			}

			const jsonResult = await errors.try(response.json())
			if (jsonResult.error) {
				throw errors.wrap(jsonResult.error, "khan-api: failed to parse json response")
			}
			const rawJson = jsonResult.data
			logger.debug("received raw json from getOrCreatePracticeTask", { body: rawJson })

			const data = assertSchema(GetOrCreatePracticeTaskResponseSchema, rawJson)
			return data
		}
		const result = await retryWithBackoff(operation, { retries: 3, initialDelay: 1000 })
		if (result.error || !result.data) {
			throw result.error || errors.new("khan-api: unexpected null result from getOrCreatePracticeTask")
		}
		return result.data
	}

	/**
	 * Fetches the content for a single assessment item (a question).
	 * This method supports both direct item lookup (via `itemId`) and
	 * sequential fetching for assessments (via `problemNumber`).
	 * @param input - The input variables for the GraphQL query.
	 * @returns A promise that resolves with the question data.
	 */
	async getAssessmentItem(input: AssessmentItemInput): Promise<GetAssessmentItemResponse> {
		logger.info("fetching assessment item", { input })
		const operation = async () => {
			const url = `${API_BASE_URL}/getAssessmentItem`
			const body = {
				operationName: "getAssessmentItem",
				variables: { input }, // MODIFIED: Use the flexible input object directly
				query:
					"query getAssessmentItem($input: AssessmentItemInput!) {\n  assessmentItem(input: $input) {\n    item {\n      id\n      sha\n      problemType\n      itemData\n      isContextInaccessible\n      __typename\n    }\n    error {\n      code\n      debugMessage\n      __typename\n    }\n    __typename\n  }\n}"
			}

			const fetchResult = await errors.try(
				fetch(url, { method: "POST", headers: this.#headers, body: JSON.stringify(body) })
			)

			if (fetchResult.error) {
				throw errors.wrap(fetchResult.error, "khan-api: network request failed")
			}

			const response = fetchResult.data
			if (!response.ok) {
				throw errors.new(`khan-api: request failed with status ${response.status}`)
			}

			const jsonResult = await errors.try(response.json())
			if (jsonResult.error) {
				throw errors.wrap(jsonResult.error, "khan-api: failed to parse json response")
			}
			const rawJson = jsonResult.data
			logger.debug("received raw json from getAssessmentItem", { body: rawJson })

			const data = assertSchema(GetAssessmentItemResponseSchema, rawJson)
			return data
		}
		const result = await retryWithBackoff(operation, { retries: 3, initialDelay: 1000 })
		if (result.error || !result.data) {
			throw result.error || errors.new("khan-api: unexpected null result from getAssessmentItem")
		}
		return result.data
	}

	/**
	 * Fetches the static content for a given Khan Academy page path.
	 * This is now an instance method to ensure it uses authenticated headers.
	 * @param path - The URL path of the content.
	 * @returns A promise that resolves with the content data.
	 */
	async getContentForPath(path: string): Promise<ContentForPathResponse> {
		logger.info("fetching content for path", { path })
		const operation = async () => {
			const variables = { path, countryCode: "US" }
			const url = new URL(`${API_BASE_URL}/ContentForPath`)
			url.searchParams.set("fastly_cacheable", "persist_until_publish")
			url.searchParams.set("pcv", "b7ff9cfeced5c9a127899a140cdfdd2bbc41165a")
			url.searchParams.set("hash", "45296627")
			url.searchParams.set("variables", JSON.stringify(variables))
			url.searchParams.set("lang", "en")
			url.searchParams.set("app", "khanacademy")

			const fetchResult = await errors.try(
				fetch(url.toString(), {
					method: "GET",
					headers: this.#headers // Uses instance headers, including the cookie.
				})
			)

			if (fetchResult.error) {
				logger.error("network request failed", { url: url.toString(), error: fetchResult.error })
				throw errors.wrap(fetchResult.error, "khan-api: network request failed")
			}

			const response = fetchResult.data
			if (!response.ok) {
				const errorText = await response.text()
				logger.error("api request returned non-ok status", {
					status: response.status,
					url: url.toString(),
					body: errorText
				})
				throw errors.new(`khan-api: request failed with status ${response.status}`)
			}

			const jsonResult = await errors.try(response.json())
			if (jsonResult.error) {
				logger.error("failed to parse json response", { error: jsonResult.error })
				throw errors.wrap(jsonResult.error, "khan-api: failed to parse json response")
			}
			const rawJson = jsonResult.data
			logger.debug("received raw json from ContentForPath", { body: rawJson })

			const data = assertSchema(ContentForPathResponseSchema, rawJson)
			return data
		}
		const result = await retryWithBackoff(operation, { retries: 3, initialDelay: 1000 })
		if (result.error || !result.data) {
			throw result.error || errors.new("khan-api: unexpected null result from getContentForPath")
		}
		return result.data
	}

	/**
	 * Fetches detailed content for a "learnable" item like a video or article.
	 * @param id - The ID of the learnable content (e.g., "x7d5effb1").
	 * @param kind - The kind of content, e.g., "Video".
	 * @returns A promise that resolves with the detailed content data.
	 */
	async getContentForLearnableContent(
		id: string,
		kind: "Video" | "Article" | string
	): Promise<ContentForLearnableContentResponse> {
		logger.info("fetching content for learnable", { id, kind })
		const operation = async () => {
			const variables = { id, kind }
			const url = new URL(`${API_BASE_URL}/ContentForLearnableContent`)
			url.searchParams.set("fastly_cacheable", "persist_until_publish")
			url.searchParams.set("pcv", "0ea262f0c9e300a076ed2f6f0df7bcca4d13cb53")
			url.searchParams.set("hash", "2300666574")
			url.searchParams.set("variables", JSON.stringify(variables))
			url.searchParams.set("lang", "en")
			url.searchParams.set("app", "khanacademy")

			const fetchResult = await errors.try(
				fetch(url.toString(), {
					method: "GET",
					headers: this.#headers
				})
			)

			if (fetchResult.error) {
				logger.error("network request failed", { url: url.toString(), error: fetchResult.error })
				throw errors.wrap(fetchResult.error, "khan-api: network request failed")
			}

			const response = fetchResult.data
			if (!response.ok) {
				const errorText = await response.text()
				logger.error("api request returned non-ok status", {
					status: response.status,
					url: url.toString(),
					body: errorText
				})
				throw errors.new(`khan-api: request failed with status ${response.status}`)
			}

			const jsonResult = await errors.try(response.json())
			if (jsonResult.error) {
				logger.error("failed to parse json response", { error: jsonResult.error })
				throw errors.wrap(jsonResult.error, "khan-api: failed to parse json response")
			}
			const rawJson = jsonResult.data
			logger.debug("received raw json from ContentForLearnableContent", { body: rawJson })

			const data = assertSchema(ContentForLearnableContentResponseSchema, rawJson)
			return data
		}

		const result = await retryWithBackoff(operation, { retries: 3, initialDelay: 1000 })
		if (result.error || !result.data) {
			throw result.error || errors.new("khan-api: unexpected null result from getContentForLearnableContent")
		}
		return result.data
	}

	/**
	 * Helper function to process lesson children and de-duplicate content.
	 * Extracts exercises, videos, and articles from lesson children while maintaining
	 * a single canonical object instance for each unique content ID.
	 */
	private processLessonChildren(
		lessonInfo: LessonInfo,
		children: unknown[],
		allDiscoveredExercises: Map<string, ExerciseInfo>,
		allDiscoveredVideos: Map<string, VideoInfo>,
		allDiscoveredArticles: Map<string, ArticleInfo>
	): string[] {
		const exerciseIds: string[] = []
		for (const lessonChild of children) {
			const exerciseResult = ExerciseSchema.safeParse(lessonChild)
			if (exerciseResult.success) {
				const exerciseData = exerciseResult.data
				const exercisePath = `${lessonInfo.path}/e/${exerciseData.slug}`

				if (!allDiscoveredExercises.has(exerciseData.id)) {
					logger.info("found new exercise", {
						id: exerciseData.id,
						slug: exerciseData.slug,
						path: exercisePath
					})
					allDiscoveredExercises.set(exerciseData.id, {
						type: "Exercise",
						id: exerciseData.id,
						slug: exerciseData.slug,
						title: exerciseData.translatedTitle,
						description: exerciseData.translatedDescription ?? "",
						path: exercisePath
					})
				}
				const existingExercise = allDiscoveredExercises.get(exerciseData.id)
				if (existingExercise) {
					lessonInfo.children.push(existingExercise)
				}
				exerciseIds.push(exerciseData.id)
				continue
			}

			const videoStubResult = VideoStubSchema.safeParse(lessonChild)
			if (videoStubResult.success) {
				const videoStub = videoStubResult.data
				const videoPath = `${lessonInfo.path}/v/${videoStub.slug}`

				if (!allDiscoveredVideos.has(videoStub.id)) {
					logger.info("found new video stub", { id: videoStub.id, slug: videoStub.slug, path: videoPath })
					allDiscoveredVideos.set(videoStub.id, {
						type: "Video",
						id: videoStub.id,
						slug: videoStub.slug,
						title: videoStub.translatedTitle,
						path: videoPath
					})
				}
				const existingVideo = allDiscoveredVideos.get(videoStub.id)
				if (existingVideo) {
					lessonInfo.children.push(existingVideo)
				}
				continue
			}

			const articleStubResult = ArticleStubSchema.safeParse(lessonChild)
			if (articleStubResult.success) {
				const articleStub = articleStubResult.data
				const articlePath = `${lessonInfo.path}/a/${articleStub.slug}`

				if (!allDiscoveredArticles.has(articleStub.id)) {
					logger.info("found new article stub", { id: articleStub.id, slug: articleStub.slug, path: articlePath })
					allDiscoveredArticles.set(articleStub.id, {
						type: "Article",
						id: articleStub.id,
						slug: articleStub.slug,
						title: articleStub.translatedTitle,
						description: articleStub.translatedDescription ?? "",
						path: articlePath
					})
				}
				const existingArticle = allDiscoveredArticles.get(articleStub.id)
				if (existingArticle) {
					lessonInfo.children.push(existingArticle)
				}
			}
		}
		return exerciseIds
	}

	/**
	 * REPLACES `findAllExercises`.
	 * Builds a full, structured map of a course's content for a given path,
	 * including units, lessons, and exercises with their full context.
	 * @param path - The URL path of the course content to traverse.
	 * @param caches - The de-duplication caches managed by the caller.
	 * @returns A promise that resolves with a rich CourseInfo object.
	 */
	async getFullContentMap(path: string, caches: ContentCaches): Promise<CourseInfo> {
		logger.info("building full content map for path", { path })
		const contentData = await this.getContentForPath(path)

		const pathData = contentData.data.contentRoute.listedPathData
		if (!pathData) {
			logger.error("parser invariant violation: no listedPathData in content response", { path })
			throw errors.wrap(ErrNoListedPathData, `path: ${path}`)
		}

		const course = pathData.course
		if (!course) {
			logger.error("parser invariant violation: no course data in content response (likely a subject page)", { path })
			throw errors.wrap(ErrNoCourseData, `path: ${path}`)
		}
		// REMOVED: Local map declarations are gone. We now use the maps passed in via `caches`.
		const { allDiscoveredExercises, allDiscoveredVideos, allDiscoveredArticles } = caches

		// MODIFIED: Only extract the IDs. The validation and stub creation is moved to the end.
		const masterableExerciseIds = (course.masterableExercises ?? []).map((e) => e.id)

		const courseInfo: CourseInfo = {
			type: "Course",
			id: course.id,
			// Extract the last part of the path as the slug.
			slug: path.split("/").filter(Boolean).pop() ?? course.id,
			title: course.translatedTitle,
			description: course.translatedDescription ?? "",
			path,
			children: [],
			masterableExerciseIds, // Store the IDs on the course object.
			questions: {}
		}
		logger.info("found course", {
			id: courseInfo.id,
			slug: courseInfo.slug, // Log the new slug
			title: courseInfo.title,
			path: courseInfo.path,
			masterableExercises: masterableExerciseIds.length
		})

		const unitsData = course.unitChildren
		if (!unitsData) {
			logger.error("parser invariant violation: course has no unitChildren array", { courseId: course.id })
			throw errors.new("course response missing unitChildren")
		}
		const unitsResult = z.array(UnitSchema).safeParse(unitsData)
		if (!unitsResult.success) {
			logger.error("parser invariant violation: failed to parse units from course content", {
				path,
				error: unitsResult.error
			})
			throw errors.wrap(unitsResult.error, "unit parsing failed")
		}

		for (const unit of unitsResult.data) {
			const unitPath = `${courseInfo.path}/${unit.slug}`
			logger.info("processing unit", { id: unit.id, title: unit.translatedTitle, path: unitPath })
			const unitInfo: UnitInfo = {
				type: "Unit",
				id: unit.id,
				slug: unit.slug,
				title: unit.translatedTitle,
				description: unit.translatedDescription ?? "",
				path: unitPath,
				children: []
			}

			if (!unit.allOrderedChildren) {
				logger.warn("unit has no children, skipping", { unitId: unit.id, unitTitle: unit.translatedTitle })
				continue
			}

			// State variables for tracking context within a unit
			const allUnitExerciseIds: string[] = []

			logger.info("processing unit children", { unitId: unit.id, childrenCount: unit.allOrderedChildren.length })

			for (const child of unit.allOrderedChildren) {
				const typenameCheck = TypenameSchema.safeParse(child)
				const childTypeName = typenameCheck.success ? typenameCheck.data.__typename : "unknown"
				logger.info("processing unit child", { unitId: unit.id, type: childTypeName })

				// Handle Lessons
				const lessonResult = LessonSchema.safeParse(child)
				if (lessonResult.success) {
					const lesson = lessonResult.data
					if (!lesson.id || !lesson.slug) {
						logger.error("parser invariant violation: lesson missing required id or slug", {
							unitId: unit.id,
							lesson: JSON.stringify(lesson, null, 2)
						})
						throw errors.new("lesson missing required id or slug fields")
					}
					if (!lesson.translatedTitle) {
						logger.error("parser invariant violation: lesson missing title", {
							unitId: unit.id,
							lessonId: lesson.id
						})
						throw errors.new("lesson missing required translatedTitle field")
					}
					const lessonPath = `${unitInfo.path}/${lesson.slug}`
					logger.info("processing lesson", { id: lesson.id, title: lesson.translatedTitle, path: lessonPath })
					const lessonInfo: LessonInfo = {
						type: "Lesson",
						id: lesson.id,
						slug: lesson.slug,
						title: lesson.translatedTitle,
						description: lesson.translatedDescription ?? "",
						path: lessonPath,
						children: []
					}

					// Debug logging
					logger.info("checking lesson curated children", {
						lessonId: lesson.id,
						hasCuratedChildren: !!lesson.curatedChildren,
						curatedChildrenType: typeof lesson.curatedChildren,
						curatedChildrenLength: Array.isArray(lesson.curatedChildren)
							? lesson.curatedChildren.length
							: "not an array",
						curatedChildrenValue: lesson.curatedChildren
					})

					const lessonChildrenResult = z.array(z.unknown()).safeParse(lesson.curatedChildren)
					if (!lessonChildrenResult.success || !lessonChildrenResult.data || lessonChildrenResult.data.length === 0) {
						// Lesson doesn't have curatedChildren at this level, need to fetch its content
						logger.info("lesson has no curated children, fetching detailed content", {
							lessonId: lesson.id,
							lessonPath: lessonPath
						})

						const lessonContentResult = await errors.try(this.getContentForPath(lessonPath))
						if (lessonContentResult.error) {
							logger.error("failed to fetch lesson content", {
								lessonId: lesson.id,
								lessonPath,
								error: lessonContentResult.error
							})
							// Continue processing other lessons even if this one fails
						} else {
							const lessonContent = lessonContentResult.data
							const lessonPathData = lessonContent.data.contentRoute.listedPathData

							if (lessonPathData?.lesson?.curatedChildren) {
								const detailedLessonChildren = z.array(z.unknown()).safeParse(lessonPathData.lesson.curatedChildren)
								if (detailedLessonChildren.success) {
									// Process the fetched children
									const exerciseIds = this.processLessonChildren(
										lessonInfo,
										detailedLessonChildren.data,
										allDiscoveredExercises,
										allDiscoveredVideos,
										allDiscoveredArticles
									)
									allUnitExerciseIds.push(...exerciseIds)
								}
							}
						}
					} else {
						// Process the existing curatedChildren
						const exerciseIds = this.processLessonChildren(
							lessonInfo,
							lessonChildrenResult.data,
							allDiscoveredExercises,
							allDiscoveredVideos,
							allDiscoveredArticles
						)
						allUnitExerciseIds.push(...exerciseIds)
					}

					unitInfo.children.push(lessonInfo)
					continue
				}

				// Handle Quizzes
				const quizResult = TopicQuizSchema.safeParse(child)
				if (quizResult.success) {
					const quizData = quizResult.data
					const quizPath = `${unitInfo.path}/quiz/${quizData.slug}`
					logger.info("found quiz", { id: quizData.id, path: quizPath })
					const quizInfo: QuizInfo = {
						type: "Quiz",
						id: quizData.id,
						slug: quizData.slug,
						title: quizData.translatedTitle,
						description: quizData.translatedDescription ?? "",
						path: quizPath,
						exerciseIds: []
					}
					unitInfo.children.push(quizInfo)
					continue
				}

				// Handle Unit Tests
				const unitTestResult = TopicUnitTestSchema.safeParse(child)
				if (unitTestResult.success) {
					const unitTestData = unitTestResult.data
					const unitTestPath = `${unitInfo.path}/test/${unitTestData.slug}`
					logger.info("found unit test", { id: unitTestData.id, path: unitTestPath })
					const unitTestInfo: UnitTestInfo = {
						type: "UnitTest",
						id: unitTestData.id,
						slug: unitTestData.slug,
						title: unitTestData.translatedTitle,
						description: unitTestData.translatedDescription ?? "",
						path: unitTestPath,
						exerciseIds: []
					}
					unitInfo.children.push(unitTestInfo)
					continue
				}

				const typenameResult = TypenameSchema.safeParse(child)
				const childType = typenameResult.success ? typenameResult.data.__typename : "unknown"
				logger.error("parser invariant violation: unable to parse unit child", {
					unitId: unit.id,
					childType,
					child: JSON.stringify(child, null, 2)
				})
				throw errors.new(`unable to parse unit child of type: ${childType}`)
			}

			if (unitInfo.children.length > 0) {
				courseInfo.children.push(unitInfo)
			} else {
				logger.warn("unit was processed but yielded no lessons or assessments", {
					unitId: unit.id,
					unitTitle: unit.translatedTitle
				})
			}
		}

		// Add course-level challenges if they exist
		if (course.courseChallenge && typeof course.courseChallenge === "object") {
			const courseChallengeResult = LearnableCourseChallengeSchema.safeParse(course.courseChallenge)
			if (courseChallengeResult.success) {
				const challengeData = courseChallengeResult.data
				const challengePath = `${courseInfo.path}/test/${challengeData.slug}`
				logger.info("found course challenge", { id: challengeData.id, path: challengePath })
				const courseChallengeInfo: CourseChallengeInfo = {
					type: "CourseChallenge",
					id: challengeData.id,
					slug: challengeData.slug,
					title: challengeData.translatedTitle || "Course Challenge",
					description: "",
					path: challengePath
				}
				courseInfo.children.push(courseChallengeInfo)
			} else {
				logger.error("parser invariant violation: course challenge has invalid structure", {
					courseId: course.id,
					error: courseChallengeResult.error
				})
				throw errors.wrap(courseChallengeResult.error, "course challenge parse failed")
			}
		}

		if (course.masteryChallenge && typeof course.masteryChallenge === "object") {
			const masteryChallengeResult = LearnableMasteryChallengeSchema.safeParse(course.masteryChallenge)
			if (masteryChallengeResult.success) {
				const challengeData = masteryChallengeResult.data
				const challengePath = `${courseInfo.path}/test/${challengeData.slug}`
				logger.info("found mastery challenge", { id: challengeData.id, path: challengePath })
				const masteryChallengeInfo: MasteryChallengeInfo = {
					type: "MasteryChallenge",
					id: challengeData.id,
					slug: challengeData.slug,
					title: challengeData.translatedTitle || "Mastery Challenge",
					description: "",
					path: challengePath
				}
				courseInfo.children.push(masteryChallengeInfo)
			} else {
				logger.error("parser invariant violation: mastery challenge has invalid structure", {
					courseId: course.id,
					error: masteryChallengeResult.error
				})
				throw errors.wrap(masteryChallengeResult.error, "mastery challenge parse failed")
			}
		}

		// NEW: Add a strict validation check for masterable exercises at the end.
		// This ensures all lessons have been parsed and `allDiscoveredExercises` is fully populated.
		for (const exerciseId of masterableExerciseIds) {
			if (!allDiscoveredExercises.has(exerciseId)) {
				// This is now an unrecoverable data integrity error for this course.
				const errorMessage = `Invariant violation: Exercise ID '${exerciseId}' is listed as masterable but was not found in any lesson for course '${courseInfo.title}' (Path: ${path}).`
				logger.error("invariant violation: masterable exercise not found in course lessons", {
					exerciseId,
					courseTitle: courseInfo.title,
					coursePath: path
				})
				throw errors.new(errorMessage)
			}
		}

		logger.info("finished building content map", {
			path,
			unitCount: courseInfo.children.filter((c) => c.type === "Unit").length,
			totalUniqueExercises: allDiscoveredExercises.size,
			totalUniqueVideos: allDiscoveredVideos.size,
			totalUniqueArticles: allDiscoveredArticles.size
		})
		return courseInfo
	}
}

// =================================================================================
// #endregion
