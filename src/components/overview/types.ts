/**
 * Prettify is a utility type that properly formats the LSP definition of a type.
 */
export type Prettify<T> = {
	[K in keyof T]: T[K]
} & {}

/**
 * QuestionResourceData is a type that represents a lesson resource data.
 */
export type QuestionExerciseData = Prettify<{
	sourceId: string
}>

/**
 * ArticleLessonResource is a type that represents an article lesson resource.
 */
export type ArticleLessonResource = Prettify<{
	type: "Article"
	data: {
		sourceId: string
	}
}>

/**
 * ExerciseLessonResource is a type that represents an exercise lesson resource.
 */
export type ExerciseLessonResource = Prettify<{
	type: "Exercise"
	data: {
		sourceId: string
		questions: QuestionExerciseData[]
	}
}>

/**
 * VideoLessonResource is a type that represents a video lesson resource.
 */
export type VideoLessonResource = Prettify<{
	type: "Video"
	data: {
		sourceId: string
	}
}>

/**
 * LessonResource is a type that represents a lesson resource.
 */
export type LessonResource = Prettify<
	{
		slug: string
		path: string
		title: string
	} & (ArticleLessonResource | ExerciseLessonResource | VideoLessonResource)
>

/**
 * Lesson is a type that represents a lesson.
 */
export type Lesson = Prettify<{
	slug: string
	path: string
	title: string
	resources: LessonResource[]
}>

/**
 * QuizUnitResource is a type that represents a quiz unit resource.
 */
export type QuizUnitResource = Prettify<{
	type: "Quiz"
	data: {
		sourceId: string
	}
}>

/**
 * UnitTestUnitResource is a type that represents a unit test unit resource.
 */
export type UnitTestUnitResource = Prettify<{
	type: "UnitTest"
	data: {
		sourceId: string
	}
}>

/**
 * UnitResource is a type that represents a unit resource.
 */
export type UnitResource = Prettify<
	{
		slug: string
		path: string
		title: string
	} & (QuizUnitResource | UnitTestUnitResource)
>

/**
 * Unit is a type that represents a unit.
 */
export type Unit = Prettify<{
	slug: string
	path: string
	title: string
	description: string
	lessons: Lesson[]
	resources: UnitResource[]
}>

/**
 * CourseChallengeResource is a type that represents a course challenge resource.
 */
export type CourseChallengeResource = Prettify<{
	type: "CourseChallenge"
	data: {
		sourceId: string
	}
}>

/**
 * CourseResource is a type that represents a course resource.
 */
export type CourseResource = Prettify<
	{
		slug: string
		path: string
		title: string
	} & CourseChallengeResource
>

/**
 * Course is a type that represents a course.
 */
export type Course = Prettify<{
	slug: string
	path: string
	title: string
	description: string
	units: Unit[]
	resources: CourseResource[]
}>

/**
 * Temporary data blob.
 */
export function getCourseBlob(subject: string, course: string): Course {
	return {
		slug: course,
		path: `/v2/${subject}/${course}`,
		title: course,
		description: "Course Description",
		units: [
			{
				slug: "unit-1",
				path: `/v2/${subject}/${course}/unit-1`,
				title: "Unit 1 Title",
				description: "Unit 1 Description",
				lessons: [
					{
						slug: "lesson-1",
						path: `/v2/${subject}/${course}/unit-1/lesson-1`,
						title: "Lesson 1 Title",
						resources: [
							{
								slug: "exercise-1",
								path: `/v2/${subject}/${course}/unit-1/lesson-1/exercise-1`,
								title: "Exercise 1 Title",
								type: "Exercise",
								data: {
									sourceId: "1",
									questions: []
								}
							},
							{
								slug: "video-1",
								path: `/v2/${subject}/${course}/unit-1/lesson-1/video-1`,
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
						path: `/v2/${subject}/${course}/unit-1/lesson-2`,
						title: "Lesson 2 Title",
						resources: [
							{
								slug: "exercise-2",
								path: `/v2/${subject}/${course}/unit-1/lesson-2/exercise-2`,
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
						path: `/v2/${subject}/${course}/unit-1/lesson-2/quiz-1`,
						title: "Quiz 1 Title",
						type: "Quiz",
						data: {
							sourceId: "3"
						}
					}
				]
			},
			{
				slug: "unit-2",
				path: `/v2/${subject}/${course}/unit-2`,
				title: "Unit 2 Title",
				description: "Unit 2 Description",
				lessons: [
					{
						slug: "lesson-3",
						path: `/v2/${subject}/${course}/unit-1/lesson-3`,
						title: "Lesson 3 Title",
						resources: [
							{
								slug: "exercise-3",
								path: `/v2/${subject}/${course}/unit-1/lesson-3/exercise-3`,
								title: "Exercise 3 Title",
								type: "Exercise",
								data: {
									sourceId: "3",
									questions: []
								}
							},
							{
								slug: "exercise-4",
								path: `/v2/${subject}/${course}/unit-1/lesson-3/exercise-4`,
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
						path: `/v2/${subject}/${course}/unit-1/lesson-4`,
						title: "Lesson 4 Title",
						resources: [
							{
								slug: "article-1",
								path: `/v2/${subject}/${course}/unit-1/lesson-4/article-1`,
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
						path: `/v2/${subject}/${course}/unit-1/lesson-4/quiz-2`,
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
				path: `/v2/${subject}/${course}/unit-3`,
				title: "Unit 3 Title",
				description: "Unit 3 Description",
				lessons: [],
				resources: []
			},
			{
				slug: "unit-4",
				path: `/v2/${subject}/${course}/unit-4`,
				title: "Unit 4 Title",
				description: "Unit 4 Description",
				lessons: [],
				resources: []
			},
			{
				slug: "unit-5",
				path: `/v2/${subject}/${course}/unit-5`,
				title: "Unit 5 Title",
				description: "Unit 5 Description",
				lessons: [],
				resources: []
			},
			{
				slug: "unit-6",
				path: `/v2/${subject}/${course}/unit-6`,
				title: "Unit 6 Title",
				description: "Unit 6 Description",
				lessons: [],
				resources: []
			},
			{
				slug: "unit-7",
				path: `/v2/${subject}/${course}/unit-7`,
				title: "Unit 7 Title",
				description: "Unit 7 Description",
				lessons: [],
				resources: []
			},
			{
				slug: "unit-8",
				path: `/v2/${subject}/${course}/unit-8`,
				title: "Unit 8 Title",
				description: "Unit 8 Description",
				lessons: [],
				resources: []
			},
			{
				slug: "unit-9",
				path: `/v2/${subject}/${course}/unit-9`,
				title: "Unit 9 Title",
				description: "Unit 9 Description",
				lessons: [],
				resources: []
			},
			{
				slug: "unit-10",
				path: `/v2/${subject}/${course}/unit-10`,
				title: "Unit 10 Title",
				description: "Unit 10 Description",
				lessons: [],
				resources: []
			}
		],
		resources: [
			{
				slug: "challenge",
				path: `/v2/${subject}/${course}/challenge`,
				title: "Course Challenge",
				type: "CourseChallenge",
				data: {
					sourceId: "1"
				}
			}
		]
	}
}
