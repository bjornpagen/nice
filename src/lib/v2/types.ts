import _ from "lodash"
import { z } from "zod"

/**
 * Prettify is a utility type that properly formats the LSP definition of a type.
 */
export type Prettify<T> = {
	[K in keyof T]: T[K]
} & {}

const BaseResourceSchema = z.object({
	slug: z.string(),
	path: z.string(),
	title: z.string()
})

/**
 * createPathValidator creates a path validation function for resource schemas.
 */
function createPathValidator(patterns: Record<string, string>) {
	return (data: { type: string; path: string }) => {
		const pattern = patterns[data.type]
		if (!pattern) {
			return false
		}

		return new RegExp(`^(\\/v2)?${pattern}$`).test(data.path)
	}
}

/**
 * BaseDataSchema is the common schema for all resource data with just a sourceId.
 */
export const BaseDataSchema = z.object({
	sourceId: z.string()
})
export type BaseData = z.infer<typeof BaseDataSchema>

/**
 * QuestionSchema is a unified schema for question data.
 */
export const QuestionSchema = BaseDataSchema
export type Question = z.infer<typeof QuestionSchema>

/**
 * QuestionsDataSchema extends BaseDataSchema with an array of questions.
 */
export const QuestionsDataSchema = QuestionSchema.extend({
	questions: z.array(QuestionSchema)
})
export type QuestionsData = z.infer<typeof QuestionsDataSchema>

/**
 * LessonResourceType is a type that represents a lesson resource type.
 */
export const LessonResourceTypeSchema = z.enum(["Article", "Exercise", "Video"])
export type LessonResourceType = z.infer<typeof LessonResourceTypeSchema>

/**
 * ArticleLessonResource is a type that represents an article lesson resource.
 */
export const ArticleLessonResourceSchema = z.object({
	type: z.literal(LessonResourceTypeSchema.enum.Article),
	data: BaseDataSchema
})
export type ArticleLessonResource = z.infer<typeof ArticleLessonResourceSchema>

/**
 * ExerciseLessonResource is a type that represents an exercise lesson resource.
 */
export const ExerciseLessonResourceSchema = z.object({
	type: z.literal(LessonResourceTypeSchema.enum.Exercise),
	data: QuestionsDataSchema
})
export type ExerciseLessonResource = z.infer<typeof ExerciseLessonResourceSchema>

/**
 * VideoLessonResource is a type that represents a video lesson resource.
 */
export const VideoLessonResourceSchema = z.object({
	type: z.literal(LessonResourceTypeSchema.enum.Video),
	data: BaseDataSchema
})
export type VideoLessonResource = z.infer<typeof VideoLessonResourceSchema>

/**
 * LessonResource is a type that represents a lesson resource.
 */
export const LessonResourceSchema = z
	.discriminatedUnion("type", [
		BaseResourceSchema.extend({
			type: z.literal(LessonResourceTypeSchema.enum.Article),
			data: ArticleLessonResourceSchema.shape.data
		}),
		BaseResourceSchema.extend({
			type: z.literal(LessonResourceTypeSchema.enum.Exercise),
			data: ExerciseLessonResourceSchema.shape.data
		}),
		BaseResourceSchema.extend({
			type: z.literal(LessonResourceTypeSchema.enum.Video),
			data: VideoLessonResourceSchema.shape.data
		})
	])
	.refine(
		createPathValidator({
			Article: "/[^/]+/[^/]+/[^/]+/[^/]+/a/[^/]+",
			Exercise: "/[^/]+/[^/]+/[^/]+/[^/]+/e/[^/]+",
			Video: "/[^/]+/[^/]+/[^/]+/[^/]+/v/[^/]+"
		}),
		{
			message:
				"path must match resource type pattern: articles=/[subject]/[course]/[unit]/[lesson]/a/[article], exercises=/[subject]/[course]/[unit]/[lesson]/e/[exercise], videos=/[subject]/[course]/[unit]/[lesson]/v/[video]",
			path: ["path"]
		}
	)
export type LessonResource = z.infer<typeof LessonResourceSchema>

/**
 * Lesson is a type that represents a lesson.
 */
export const LessonSchema = z.object({
	slug: z.string(),
	path: z.string(),
	type: z.literal("Lesson"),
	title: z.string(),
	resources: z.array(LessonResourceSchema)
})
export type Lesson = z.infer<typeof LessonSchema>

/**
 * UnitResourceType is a type that represents a unit resource type.
 */
export const UnitResourceTypeSchema = z.enum(["Quiz", "UnitTest"])
export type UnitResourceType = z.infer<typeof UnitResourceTypeSchema>

/**
 * QuizUnitResource is a type that represents a quiz unit resource.
 */
export const QuizUnitResourceSchema = z.object({
	type: z.literal(UnitResourceTypeSchema.enum.Quiz),
	data: BaseDataSchema
})
export type QuizUnitResource = z.infer<typeof QuizUnitResourceSchema>

/**
 * UnitTestUnitResource is a type that represents a unit test unit resource.
 */
export const UnitTestUnitResourceSchema = z.object({
	type: z.literal(UnitResourceTypeSchema.enum.UnitTest),
	data: BaseDataSchema
})
export type UnitTestUnitResource = z.infer<typeof UnitTestUnitResourceSchema>

/**
 * UnitResource is a type that represents a unit resource.
 */
export const UnitResourceSchema = z
	.discriminatedUnion("type", [
		BaseResourceSchema.extend({
			type: z.literal(UnitResourceTypeSchema.enum.Quiz),
			data: QuizUnitResourceSchema.shape.data
		}),
		BaseResourceSchema.extend({
			type: z.literal(UnitResourceTypeSchema.enum.UnitTest),
			data: UnitTestUnitResourceSchema.shape.data
		})
	])
	.refine(
		createPathValidator({
			Quiz: "/[^/]+/[^/]+/[^/]+/quiz/[^/]+",
			UnitTest: "/[^/]+/[^/]+/[^/]+/test/[^/]+"
		}),
		{
			message:
				"path must match resource type pattern: quizzes=/[subject]/[course]/[unit]/quiz/[quiz], unit-tests=/[subject]/[course]/[unit]/test/[test]",
			path: ["path"]
		}
	)
export type UnitResource = z.infer<typeof UnitResourceSchema>

/**
 * Unit is a type that represents a unit.
 */
export const UnitSchema = z.object({
	slug: z.string(),
	path: z.string(),
	type: z.literal("Unit"),
	title: z.string(),
	description: z.string(),
	lessons: z.array(LessonSchema),
	resources: z.array(UnitResourceSchema)
})
export type Unit = z.infer<typeof UnitSchema>

/**
 * CourseResourceType is a type that represents a course resource type.
 */
export const CourseResourceTypeSchema = z.enum(["CourseChallenge"])
export type CourseResourceType = z.infer<typeof CourseResourceTypeSchema>

/**
 * QuestionChallengeData is a type that represents a question challenge data.
 */
export const QuestionChallengeDataSchema = QuestionSchema
export type QuestionChallengeData = z.infer<typeof QuestionChallengeDataSchema>

/**
 * CourseChallengeResource is a type that represents a course challenge resource.
 */
export const CourseChallengeResourceSchema = z.object({
	type: z.literal(CourseResourceTypeSchema.enum.CourseChallenge),
	data: QuestionsDataSchema
})
export type CourseChallengeResource = z.infer<typeof CourseChallengeResourceSchema>

/**
 * CourseResource is a type that represents a course resource.
 */
export const CourseResourceSchema = z
	.discriminatedUnion("type", [
		BaseResourceSchema.extend({
			type: z.literal(CourseResourceTypeSchema.enum.CourseChallenge),
			data: CourseChallengeResourceSchema.shape.data
		})
	])
	.refine(
		createPathValidator({
			CourseChallenge: "/[^/]+/[^/]+/[^/]+"
		}),
		{
			message: "path must match resource type pattern: challenges=/[subject]/[course]/[challenge]",
			path: ["path"]
		}
	)
export type CourseResource = z.infer<typeof CourseResourceSchema>

/**
 * Course is a type that represents a course.
 */
export const CourseSchema = z.object({
	slug: z.string(),
	path: z.string(),
	type: z.literal("Course"),
	title: z.string(),
	description: z.string(),
	units: z.array(UnitSchema),
	resources: z.array(CourseResourceSchema)
})
export type Course = z.infer<typeof CourseSchema>

/**
 * CourseUnitMaterialSchema is a type that represents a course's unit material.
 */
export const CourseLessonResourceMaterialSchema = z.discriminatedUnion("type", [
	BaseResourceSchema.extend({
		type: z.literal(LessonResourceTypeSchema.enum.Article),
		data: ArticleLessonResourceSchema.shape.data,
		meta: z.object({
			unit: z.object({
				path: z.string(),
				title: z.string(),
				index: z.number()
			})
		})
	}),
	BaseResourceSchema.extend({
		type: z.literal(LessonResourceTypeSchema.enum.Exercise),
		data: ExerciseLessonResourceSchema.shape.data,
		meta: z.object({
			unit: z.object({
				path: z.string(),
				title: z.string(),
				index: z.number()
			})
		})
	}),
	BaseResourceSchema.extend({
		type: z.literal(LessonResourceTypeSchema.enum.Video),
		data: VideoLessonResourceSchema.shape.data,
		meta: z.object({
			unit: z.object({
				path: z.string(),
				title: z.string(),
				index: z.number()
			})
		})
	})
])
export type CourseLessonResourceMaterial = z.infer<typeof CourseLessonResourceMaterialSchema>

/**
 * CourseLessonMaterialSchema is a type that represents a course's lesson material.
 */
export const CourseLessonMaterialSchema = LessonSchema.extend({
	meta: z.object({
		unit: z.object({
			path: z.string(),
			title: z.string(),
			index: z.number()
		})
	})
})
export type CourseLessonMaterial = z.infer<typeof CourseLessonMaterialSchema>

/**
 * CourseUnitMaterialSchema is a type that represents a course's unit material.
 */
export const CourseUnitMaterialSchema = z.discriminatedUnion("type", [
	BaseResourceSchema.extend({
		type: z.literal(UnitResourceTypeSchema.enum.Quiz),
		data: QuizUnitResourceSchema.shape.data,
		meta: z.object({
			unit: z.object({
				path: z.string(),
				title: z.string(),
				index: z.number()
			})
		})
	}),
	BaseResourceSchema.extend({
		type: z.literal(UnitResourceTypeSchema.enum.UnitTest),
		data: UnitTestUnitResourceSchema.shape.data,
		meta: z.object({
			unit: z.object({
				path: z.string(),
				title: z.string(),
				index: z.number()
			})
		})
	})
])
export type CourseUnitMaterial = z.infer<typeof CourseUnitMaterialSchema>

/**
 * CourseMaterial is a type that represents a course's flattened material.
 */
export const CourseMaterialSchema = z.discriminatedUnion("type", [
	CourseLessonMaterialSchema,
	...CourseLessonResourceMaterialSchema.options,
	...CourseUnitMaterialSchema.options,
	...CourseResourceSchema._def.schema.options
])
export type CourseMaterial = z.infer<typeof CourseMaterialSchema>

/**
 * getCourseMaterials retrieves a flattened array of a course's units' lessons, quizzes, unit tests, and the course's course challenges in their appropriate order.
 * @param course - The course to retrieve the materials of.
 * @returns A flattened array of a course's units' lessons, quizzes, unit tests, and the course's course challenges in their appropriate order.
 */
export function getCourseMaterials(course: Course): CourseMaterial[] {
	return _.concat<CourseMaterial>(
		_.flatMap(course.units, (unit, index) => [
			..._.map(unit.lessons, (lesson) => ({
				...lesson,
				meta: { unit: { path: unit.path, title: unit.title, index: index } }
			})),
			..._.map(unit.resources, (resource) => ({
				...resource,
				meta: { unit: { path: unit.path, title: unit.title, index: index } }
			}))
		]),
		course.resources
	)
}

/**
 * Temporary data blob.
 */
export function getCourseBlob(subject: string, course: string): Course {
	const base = `/v2/${subject}/${course}`
	return {
		slug: course,
		path: base,
		type: "Course",
		title: course,
		description: "Course Description",
		units: [
			{
				slug: "unit-1",
				path: `${base}/unit-1`,
				type: "Unit",
				title: "Unit 1 Title",
				description: "Unit 1 Description",
				lessons: [
					{
						slug: "lesson-1",
						path: `${base}/unit-1/lesson-1`,
						type: "Lesson",
						title: "Lesson 1 Title",
						resources: [
							{
								slug: "exercise-1",
								path: `${base}/unit-1/lesson-1/e/exercise-1`,
								title: "Exercise 1 Title",
								type: "Exercise",
								data: {
									sourceId: "1",
									questions: []
								}
							},
							{
								slug: "video-1",
								path: `${base}/unit-1/lesson-1/v/video-1`,
								title: "Video 1 Title",
								type: "Video",
								data: {
									sourceId: "1"
								}
							}
						]
					},
					{
						slug: "lesson-2",
						path: `${base}/unit-1/lesson-2`,
						type: "Lesson",
						title: "Lesson 2 Title",
						resources: [
							{
								slug: "exercise-2",
								path: `${base}/unit-1/lesson-2/e/exercise-2`,
								title: "Exercise 2 Title",
								type: "Exercise",
								data: {
									sourceId: "2",
									questions: []
								}
							}
						]
					}
				],
				resources: [
					{
						slug: "quiz-1",
						path: `${base}/unit-1/quiz/quiz-1`,
						title: "Quiz 1 Title",
						type: "Quiz",
						data: {
							sourceId: "3"
						}
					},
					{
						slug: "unit-test-1",
						path: `${base}/unit-1/test/unit-test-1`,
						title: "Unit Test 1 Title",
						type: "UnitTest",
						data: {
							sourceId: "4"
						}
					}
				]
			},
			{
				slug: "unit-2",
				path: `${base}/unit-2`,
				type: "Unit",
				title: "Unit 2 Title",
				description: "Unit 2 Description",
				lessons: [
					{
						slug: "lesson-3",
						path: `${base}/unit-2/lesson-3`,
						type: "Lesson",
						title: "Lesson 3 Title",
						resources: [
							{
								slug: "exercise-3",
								path: `${base}/unit-2/lesson-3/e/exercise-3`,
								title: "Exercise 3 Title",
								type: "Exercise",
								data: {
									sourceId: "3",
									questions: []
								}
							},
							{
								slug: "exercise-4",
								path: `${base}/unit-2/lesson-3/e/exercise-4`,
								title: "Exercise 4 Title",
								type: "Exercise",
								data: {
									sourceId: "4",
									questions: [
										{
											sourceId: "1"
										},
										{
											sourceId: "2"
										},
										{
											sourceId: "3"
										}
									]
								}
							}
						]
					},
					{
						slug: "lesson-4",
						path: `${base}/unit-2/lesson-4`,
						type: "Lesson",
						title: "Lesson 4 Title",
						resources: [
							{
								slug: "article-1",
								path: `${base}/unit-2/lesson-4/a/article-1`,
								title: "Article 1 Title",
								type: "Article",
								data: {
									sourceId: "4"
								}
							}
						]
					}
				],
				resources: [
					{
						slug: "quiz-2",
						path: `${base}/unit-2/quiz/quiz-2`,
						title: "Quiz 2 Title",
						type: "Quiz",
						data: {
							sourceId: "4"
						}
					}
				]
			},
			{
				slug: "unit-3",
				path: `${base}/unit-3`,
				type: "Unit",
				title: "Unit 3 Title",
				description: "Unit 3 Description",
				lessons: [],
				resources: []
			},
			{
				slug: "unit-4",
				path: `${base}/unit-4`,
				type: "Unit",
				title: "Unit 4 Title",
				description: "Unit 4 Description",
				lessons: [],
				resources: []
			},
			{
				slug: "unit-5",
				path: `${base}/unit-5`,
				type: "Unit",
				title: "Unit 5 Title",
				description: "Unit 5 Description",
				lessons: [],
				resources: []
			},
			{
				slug: "unit-6",
				path: `${base}/unit-6`,
				type: "Unit",
				title: "Unit 6 Title",
				description: "Unit 6 Description",
				lessons: [],
				resources: []
			},
			{
				slug: "unit-7",
				path: `${base}/unit-7`,
				type: "Unit",
				title: "Unit 7 Title",
				description: "Unit 7 Description",
				lessons: [],
				resources: []
			},
			{
				slug: "unit-8",
				path: `${base}/unit-8`,
				type: "Unit",
				title: "Unit 8 Title",
				description: "Unit 8 Description",
				lessons: [],
				resources: []
			},
			{
				slug: "unit-9",
				path: `${base}/unit-9`,
				type: "Unit",
				title: "Unit 9 Title",
				description: "Unit 9 Description",
				lessons: [],
				resources: []
			},
			{
				slug: "unit-10",
				path: `${base}/unit-10`,
				type: "Unit",
				title: "Unit 10 Title",
				description: "Unit 10 Description",
				lessons: [],
				resources: []
			}
		],
		resources: [
			{
				slug: "challenge",
				path: `${base}/test/challenge`,
				title: "Course Challenge",
				type: "CourseChallenge",
				data: {
					sourceId: "1",
					questions: [
						{
							sourceId: "1"
						},
						{
							sourceId: "2"
						},
						{
							sourceId: "3"
						},
						{
							sourceId: "4"
						},
						{
							sourceId: "5"
						},
						{
							sourceId: "6"
						},
						{
							sourceId: "7"
						},
						{
							sourceId: "8"
						},
						{
							sourceId: "9"
						},
						{
							sourceId: "10"
						}
					]
				}
			}
		]
	}
}
