import * as errors from "@superbuilders/errors"
import type { OneRoster } from "@superbuilders/oneroster"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

/**
 * Prettify is a utility type that properly formats the LSP definition of a type.
 */
export type Prettify<T> = {
	[K in keyof T]: T[K]
} & {}

// ------------------------------------------------------------
// Resource, Component, Course Types
// ------------------------------------------------------------

/**
 * LessonResourceTypeSchema is a schema for the type of a lesson resource.
 */
export const LessonResourceTypeSchema = z.enum(["article", "exercise", "video"] as const)
export type LessonResourceType = z.infer<typeof LessonResourceTypeSchema>

/**
 * UnitResourceTypeSchema is a schema for the type of a unit resource.
 */
export const UnitResourceTypeSchema = z.enum(["quiz", "unit_test"] as const)
export type UnitResourceType = z.infer<typeof UnitResourceTypeSchema>

/**
 * CourseResourceTypeSchema is a schema for the type of a course resource.
 */
export const CourseResourceTypeSchema = z.enum(["course_challenge"] as const)
export type CourseResourceType = z.infer<typeof CourseResourceTypeSchema>

/**
 * CourseComponentTypeSchema is a schema for the type of a course component.
 */
export const CourseComponentTypeSchema = z.enum(["lesson", "unit", "__course_challenge"] as const)
export type CourseComponentType = z.infer<typeof CourseComponentTypeSchema>

/**
 * CourseTypeSchema is a schema for the type of a course.
 */
export const CourseTypeSchema = z.enum(["course"] as const)
export type CourseType = z.infer<typeof CourseTypeSchema>

/**
 * SubjectTypeSchema is a schema for the type of a subject.
 */
export const SubjectTypeSchema = z.enum(["subject"] as const)
export type SubjectType = z.infer<typeof SubjectTypeSchema>

/**
 * ResourceTypeSchema is a schema for the types of all resources.
 */
export const ResourceTypeSchema = z
	.union([LessonResourceTypeSchema, UnitResourceTypeSchema, CourseResourceTypeSchema])
	.describe("The types of a resource.")
export type ResourceType = z.infer<typeof ResourceTypeSchema>

/**
 * ComponentTypeSchema is a schema for the types of all components.
 */
export const ComponentTypeSchema = z
	.union([CourseComponentTypeSchema, CourseTypeSchema, SubjectTypeSchema])
	.describe("The types of a component.")
export type ComponentType = z.infer<typeof ComponentTypeSchema>

/**
 * TypeSchema is a schema for the types of all resources and components.
 */
export const TypeSchema = z
	.union([ResourceTypeSchema, ComponentTypeSchema])
	.describe("The types of a resource or component.")
export type Type = z.infer<typeof TypeSchema>

// ------------------------------------------------------------
// Base Schemas
// ------------------------------------------------------------

/**
 * SourcedIdSchema is a schema for the sourcedId of all resources.
 */
export const SourcedIdSchema = z
	.string()
	.nonempty()
	.regex(/^nice:x[a-f0-9]+(?::[a-fx0-9]+)*$/)
	.describe(
		"The sourcedId of the resource, as stored in the TimeBack platform. Must be 'nice:x' followed by hex characters, optionally with colon-separated additional parts."
	)
export type SourcedId = z.infer<typeof SourcedIdSchema>

export const SlugSchema = z
	.string()
	.nonempty()
	.regex(/^[a-zA-Z0-9:_-]+$/)
	.describe(
		"The slug of the resource. This is used to identify the resource in the URL. Must be alphanumeric characters, colons, hyphens, and underscores only."
	)
export type Slug = z.infer<typeof SlugSchema>

export const QuestionsSchema = z
	.object({
		length: z.number().min(0).default(0).describe("The number of questions in the resource.")
	})
	.default({ length: 0 })
	.describe("The questions associated with the resource.")
export type Questions = z.infer<typeof QuestionsSchema>

/**
 * BaseMetaSchema is a base schema for the meta data of all resources.
 */
export const BaseMetaSchema = z.record(z.string(), z.unknown()).default({})
export type BaseMeta = z.infer<typeof BaseMetaSchema>

/**
 * BaseModelSchema is a base schema for all resources to extend from.
 */
export const BaseModelSchema = z.object({
	sourcedId: SourcedIdSchema,
	type: TypeSchema,
	meta: BaseMetaSchema.describe(
		"The meta data for the resource. This is used to store additional information about the item."
	),
	slug: SlugSchema,
	title: z.string().nonempty().describe("The title of the resource. This is used to display the resource in the UI."),
	order: z.number().default(0).describe("The sort order of the resource in the TimeBack platform."),
	description: z
		.string()
		.default("")
		.describe("The description of the resource. This is used to display the resource in the UI.")
})
export type BaseModel = z.infer<typeof BaseModelSchema>

/**
 * BaseResourceModelSchema is a base schema for all resources to extend from.
 */
export const BaseResourceModelSchema = BaseModelSchema.extend({
	meta: BaseMetaSchema.and(
		z.object({
			url: z
				.string()
				.url()
				.describe(
					"The URL of the resource. This is used to display the resource in the UI (e.g., YouTube video, QTI assessment renderer)."
				)
		})
	)
})
export type BaseResourceModel = z.infer<typeof BaseResourceModelSchema>

/**
 * BaseCourseComponentModelSchema is a base schema for all course components to extend from.
 */
export const BaseCourseComponentModelSchema = BaseModelSchema.extend({
	meta: BaseMetaSchema.and(
		z.object({
			courseSourcedId: SourcedIdSchema.describe("The sourcedId of the course component's course."),
			parentSourcedId: SourcedIdSchema.describe("The sourcedId of the parent component.").optional()
		})
	)
})
export type BaseCourseComponentModel = z.infer<typeof BaseCourseComponentModelSchema>

// ------------------------------------------------------------
// Resource Schemas
// ------------------------------------------------------------

/**
 * ArticleResourceSchema is a schema for an article resource.
 */
export const ArticleResourceSchema = BaseResourceModelSchema.extend({
	type: z.literal(LessonResourceTypeSchema.enum.article)
})
export type ArticleResource = z.infer<typeof ArticleResourceSchema>

/**
 * ExerciseResourceSchema is a schema for an exercise resource.
 */
export const ExerciseResourceSchema = BaseResourceModelSchema.extend({
	type: z.literal(LessonResourceTypeSchema.enum.exercise),
	questions: QuestionsSchema
})
export type ExerciseResource = z.infer<typeof ExerciseResourceSchema>

/**
 * VideoResourceSchema is a schema for a video resource.
 */
export const VideoResourceSchema = BaseResourceModelSchema.extend({
	type: z.literal(LessonResourceTypeSchema.enum.video)
})
export type VideoResource = z.infer<typeof VideoResourceSchema>

/**
 * LessonResourceSchema is a schema for a lesson resource.
 */
export const LessonResourceSchema = z.discriminatedUnion("type", [
	ArticleResourceSchema,
	ExerciseResourceSchema,
	VideoResourceSchema
])
export type LessonResource = z.infer<typeof LessonResourceSchema>

/**
 * QuizResourceSchema is a schema for a quiz resource.
 */
export const QuizResourceSchema = BaseModelSchema.extend({
	type: z.literal(UnitResourceTypeSchema.enum.quiz),
	questions: QuestionsSchema
})
export type QuizResource = z.infer<typeof QuizResourceSchema>

/**
 * UnitTestResourceSchema is a schema for a unit test resource.
 */
export const UnitTestResourceSchema = BaseModelSchema.extend({
	type: z.literal(UnitResourceTypeSchema.enum.unit_test),
	questions: QuestionsSchema
})
export type UnitTestResource = z.infer<typeof UnitTestResourceSchema>

/**
 * UnitResourceSchema is a schema for a unit resource.
 */
export const UnitResourceSchema = z.discriminatedUnion("type", [QuizResourceSchema, UnitTestResourceSchema])
export type UnitResource = z.infer<typeof UnitResourceSchema>

/**
 * CourseChallengeResourceSchema is a schema for a course challenge resource.
 */
export const CourseChallengeResourceSchema = BaseModelSchema.extend({
	type: z.literal(CourseResourceTypeSchema.enum.course_challenge),
	questions: QuestionsSchema
})
export type CourseChallengeResource = z.infer<typeof CourseChallengeResourceSchema>

/**
 * CourseResourceSchema is a schema for a course resource.
 */
export const CourseResourceSchema = z.discriminatedUnion("type", [CourseChallengeResourceSchema])
export type CourseResource = z.infer<typeof CourseResourceSchema>

/**
 * ResourceSchema is a schema for a resource.
 */
export const ResourceSchema = z.discriminatedUnion("type", [
	...LessonResourceSchema.options,
	...UnitResourceSchema.options,
	...CourseResourceSchema.options
])
export type Resource = z.infer<typeof ResourceSchema>

// ------------------------------------------------------------
// Course Component Schemas
// ------------------------------------------------------------

/**
 * LessonSchema is a schema for a lesson component.
 */
export const LessonComponentSchema = BaseCourseComponentModelSchema.extend({
	type: z.literal(CourseComponentTypeSchema.enum.lesson),
	resources: z.record(SourcedIdSchema, LessonResourceSchema).default({}).describe("The resources for the lesson.")
})
export type LessonComponent = z.infer<typeof LessonComponentSchema>

/**
 * UnitComponentSchema is a schema for a unit component.
 */
export const UnitComponentSchema = BaseCourseComponentModelSchema.extend({
	type: z.literal(CourseComponentTypeSchema.enum.unit),
	children: z.record(SourcedIdSchema, LessonComponentSchema).default({}).describe("The children of the unit."),
	resources: z.record(SourcedIdSchema, UnitResourceSchema).default({}).describe("The resources for the unit.")
})
export type UnitComponent = z.infer<typeof UnitComponentSchema>

/**
 * CourseChallengeComponentSchema is a schema for a course challenge component.
 */
export const CourseChallengeComponentSchema = BaseCourseComponentModelSchema.extend({
	type: z.literal(CourseComponentTypeSchema.enum.__course_challenge),
	resources: z
		.record(SourcedIdSchema, CourseResourceSchema)
		.default({})
		.describe("The resources for the course challenge.")
})
export type CourseChallengeComponent = z.infer<typeof CourseChallengeComponentSchema>

/**
 * CourseComponentSchema is a schema for a course component.
 * It can be a lesson or a unit.
 */
export const CourseComponentSchema = z.discriminatedUnion("type", [
	LessonComponentSchema,
	UnitComponentSchema,
	CourseChallengeComponentSchema
])
export type CourseComponent = z.infer<typeof CourseComponentSchema>

// ------------------------------------------------------------
// Course & Subject Schemas
// ------------------------------------------------------------

/**
 * CourseSchema is a schema for a course (e.g., AP Microeconomics).
 */
export const CourseSchema = BaseModelSchema.extend({
	type: z.literal(CourseTypeSchema.enum.course),
	children: z.record(SourcedIdSchema, UnitComponentSchema).default({}).describe("The children of the course."),
	resources: z.record(SourcedIdSchema, CourseResourceSchema).default({}).describe("The resources for the course.")
})
export type Course = z.infer<typeof CourseSchema>

/**
 * SubjectSchema is a schema for a subject (e.g., AP Microeconomics).
 */
export const SubjectSchema = BaseModelSchema.extend({
	type: z.literal(SubjectTypeSchema.enum.subject),
	children: z.record(SourcedIdSchema, CourseSchema).default({}).describe("The children of the subject.")
})
export type Subject = z.infer<typeof SubjectSchema>

// ------------------------------------------------------------
// Model Schemas
// ------------------------------------------------------------

/**
 * ModelSchema is a schema for a model.
 */
export const ModelSchema = z.discriminatedUnion("type", [
	...ResourceSchema.options,
	...CourseComponentSchema.options,
	CourseSchema
])
export type Model = z.infer<typeof ModelSchema>

// ------------------------------------------------------------
// OneRoster Schemas
// ------------------------------------------------------------

/**
 * OneRosterResource is a schema for a resource from the OneRoster API.
 */
type OneRosterResource = Awaited<ReturnType<typeof OneRoster.prototype.resourcesManagement.getResource>>["resource"]

/**
 * OneRosterComponentResource is a schema for a component resource from the OneRoster API.
 */
type OneRosterComponentResource = Awaited<
	ReturnType<typeof OneRoster.prototype.courseComponentResourcesManagement.getComponentResource>
>["componentResource"]

/**
 * OneRosterCourseComponent is a schema for a course component from the OneRoster API.
 */
type OneRosterCourseComponent = Awaited<
	ReturnType<typeof OneRoster.prototype.courseComponentsManagement.getCourseComponent>
>["courseComponent"]

/**
 * OneRosterCourse is a schema for a course from the OneRoster API.
 */
type OneRosterCourse = Awaited<ReturnType<typeof OneRoster.prototype.coursesManagement.getCourse>>["course"]

// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------

/**
 * A list of all the types.
 */
export const typenames: Type[] = [
	...TypeSchema.options.flatMap((option) => option.options.flatMap((option) => Object.values(option.enum)))
] as const

/**
 * A map of types to the regex patterns for their pathnames.
 */
export const pathnames: Record<Type, RegExp> = {
	// ------------------------------------------------------------
	// Resources
	// ------------------------------------------------------------

	// Article: /[subject]/[course]/[unit]/[lesson]/a/[article]
	article: /^\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/a\/([^/]+)$/,
	// Exercise: /[subject]/[course]/[unit]/[lesson]/e/[exercise]
	exercise: /^\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/e\/([^/]+)$/,
	// Video: /[subject]/[course]/[unit]/[lesson]/v/[video]
	video: /^\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/v\/([^/]+)$/,
	// Quiz: /[subject]/[course]/[unit]/quiz/[quiz] OR /[subject]/[course]/[unit]/[lesson]/quiz/[quiz]
	quiz: /^\/([^/]+)\/([^/]+)\/([^/]+)(?:\/([^/]+))?\/quiz\/([^/]+)$/,
	// Unit Test: /[subject]/[course]/[unit]/test/[test]
	unit_test: /^\/([^/]+)\/([^/]+)\/([^/]+)\/test\/([^/]+)$/,
	// Course Challenge: /[subject]/[course]/test/[test]
	course_challenge: /^\/([^/]+)\/([^/]+)\/test\/([^/]+)$/,

	// ------------------------------------------------------------
	// Components
	// ------------------------------------------------------------

	// Lesson: /[subject]/[course]/[unit]/[lesson]
	lesson: /^\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/,
	// Unit: /[subject]/[course]/[unit]
	unit: /^\/([^/]+)\/([^/]+)\/([^/]+)$/,
	// Course Challenge Component: /[subject]/[course]/test/[test]
	__course_challenge: /^\/([^/]+)\/([^/]+)\/test\/([^/]+)$/,
	// Course: /[subject]/[course]
	course: /^\/([^/]+)\/([^/]+)$/,
	// Subject: /[subject]
	subject: /^\/([^/]+)$/
} as const

// ------------------------------------------------------------
// Utility Functions
// ------------------------------------------------------------

/**
 * Attaches a resource to a course component.
 * @param course - The course to attach the resource to
 * @param courseComponent - The course component to attach the resource to
 * @param resource - The resource to attach to the course component
 */
function attachResource(course: Course, courseComponent: CourseComponent, resource: Resource): void {
	if (isResourceVariant<CourseChallengeResource>("course", resource)) {
		logger.debug("building oneroster course: found course resource", {
			courseSourcedId: course.sourcedId,
			resourceSourcedId: resource.sourcedId
		})
		course.resources[resource.sourcedId] = resource
	}
	logger.debug("building oneroster course: found resource", {
		courseSourcedId: course.sourcedId,
		resourceSourcedId: resource.sourcedId
	})

	switch (courseComponent.type) {
		case "lesson": {
			if (isResourceVariant<LessonResource>("lesson", resource)) {
				logger.debug("building oneroster course: adding resource to lesson", {
					courseSourcedId: course.sourcedId,
					courseComponentSourcedId: courseComponent.sourcedId,
					resourceSourcedId: resource.sourcedId
				})
				courseComponent.resources[resource.sourcedId] = resource

				break
			}

			logger.error("building oneroster course: incompatible resource type for lesson", {
				courseSourcedId: course.sourcedId,
				courseComponentSourcedId: courseComponent.sourcedId,
				resourceSourcedId: resource.sourcedId
			})
			throw errors.new(`incompatible resource type ${resource.type} for lesson component: ${courseComponent.sourcedId}`)
		}
		case "unit": {
			if (isResourceVariant<UnitResource>("unit", resource)) {
				logger.debug("building oneroster course: adding resource to unit", {
					courseSourcedId: course.sourcedId,
					courseComponentSourcedId: courseComponent.sourcedId,
					resourceSourcedId: resource.sourcedId
				})
				courseComponent.resources[resource.sourcedId] = resource

				break
			}

			logger.error("building oneroster course: incompatible resource type for unit", {
				courseSourcedId: course.sourcedId,
				courseComponentSourcedId: courseComponent.sourcedId,
				resourceSourcedId: resource.sourcedId
			})
			throw errors.new(`incompatible resource type ${resource.type} for unit component: ${courseComponent.sourcedId}`)
		}
	}
}

/**
 * Checks if a resource is a variant of a given type, satisfying the compiler's type inference.
 * @param type - The type to check against
 * @param resource - The resource to check
 * @returns True if the resource is a variant of the given type, false otherwise
 */
export function isResourceVariant<T extends Resource>(type: ComponentType, resource: Resource): resource is T {
	switch (type) {
		case "lesson": {
			return resource.type === "article" || resource.type === "exercise" || resource.type === "video"
		}
		case "unit": {
			return resource.type === "quiz" || resource.type === "unit_test"
		}
		case "course": {
			return resource.type === "course_challenge"
		}
		default: {
			return false
		}
	}
}

/**
 * Determines the resource type from a pathname using the pathname regex patterns.
 * @param pathname - The pathname to analyze
 * @returns The resource type or null if no match is found
 */
export function getTypeFromPathname(pathname: string): Type | undefined {
	return typenames.find((type) => pathnames[type].test(pathname))
}

/**
 * Generates a pathname from a type and slugs.
 * @param type - The type to generate a pathname for
 * @param slugs - The slugs to use in the pathname
 * @returns The pathname
 */
export function getPathnameFromType(type: Type, ...slugs: Slug[]): string {
	if (slugs.some((slug) => SlugSchema.safeParse(slug).success === false)) {
		throw errors.new(
			`invalid slugs: slugs must be alphanumeric characters, colons, hyphens, and underscores only: [${slugs.join(", ")}]`
		)
	}

	switch (type) {
		case "subject": {
			if (slugs.length === 1) {
				const [subject] = slugs
				return `/${subject}`
			}
			throw errors.new(`invalid slugs: expected 1 slug for subject, got ${slugs.length}`)
		}
		case "course": {
			if (slugs.length === 2) {
				const [subject, course] = slugs
				return `/${subject}/${course}`
			}
			throw errors.new(`invalid slugs: expected 2 slugs for course, got ${slugs.length}`)
		}
		case "unit": {
			if (slugs.length === 3) {
				const [subject, course, unit] = slugs
				return `/${subject}/${course}/${unit}`
			}
			throw errors.new(`invalid slugs: expected 3 slugs for unit, got ${slugs.length}`)
		}
		case "lesson": {
			if (slugs.length === 4) {
				const [subject, course, unit, lesson] = slugs
				return `/${subject}/${course}/${unit}/${lesson}`
			}
			throw errors.new(`invalid slugs: expected 4 slugs for lesson, got ${slugs.length}`)
		}
		case "article": {
			if (slugs.length === 5) {
				const [subject, course, unit, lesson, article] = slugs
				return `/${subject}/${course}/${unit}/${lesson}/a/${article}`
			}
			throw errors.new(`invalid slugs: expected 5 slugs for article, got ${slugs.length}`)
		}
		case "exercise": {
			if (slugs.length === 5) {
				const [subject, course, unit, lesson, exercise] = slugs
				return `/${subject}/${course}/${unit}/${lesson}/e/${exercise}`
			}
			throw errors.new(`invalid slugs: expected 5 slugs for exercise, got ${slugs.length}`)
		}
		case "video": {
			if (slugs.length === 5) {
				const [subject, course, unit, lesson, video] = slugs
				return `/${subject}/${course}/${unit}/${lesson}/v/${video}`
			}
			throw errors.new(`invalid slugs: expected 5 slugs for video, got ${slugs.length}`)
		}
		case "quiz": {
			if (slugs.length === 4) {
				const [subject, course, unit, quiz] = slugs
				return `/${subject}/${course}/${unit}/quiz/${quiz}`
			}
			if (slugs.length === 5) {
				const [subject, course, unit, lesson, quiz] = slugs
				return `/${subject}/${course}/${unit}/${lesson}/quiz/${quiz}`
			}
			throw errors.new(`invalid slugs: expected 4 or 5 slugs for quiz, got ${slugs.length}`)
		}
		case "unit_test": {
			if (slugs.length === 4) {
				const [subject, course, unit, unitTest] = slugs
				return `/${subject}/${course}/${unit}/test/${unitTest}`
			}
			throw errors.new(`invalid slugs: expected 4 slugs for unit_test, got ${slugs.length}`)
		}
		case "course_challenge": {
			if (slugs.length === 3) {
				const [subject, course, courseChallenge] = slugs
				return `/${subject}/${course}/test/${courseChallenge}`
			}
			throw errors.new(`invalid slugs: expected 3 slugs for course_challenge, got ${slugs.length}`)
		}
		case "__course_challenge": {
			if (slugs.length === 3) {
				const [subject, course, courseChallenge] = slugs
				return `/${subject}/${course}/test/${courseChallenge}`
			}
			throw errors.new(`invalid slugs: expected 3 slugs for __course_challenge, got ${slugs.length}`)
		}
		default: {
			throw errors.new(`invalid pathname: unknown type: ${type}`)
		}
	}
}

/**
 * Extracts the slugs from a pathname using the pathname regex patterns.
 * @param pathname - The pathname to analyze
 * @param type - The type to use for the pathname
 * @returns The slugs
 */
export function getSlugsFromPathname(pathname: string, type?: Type): Slug[] {
	const pathType = type ?? getTypeFromPathname(pathname)
	if (pathType == null) {
		throw errors.new(`invalid pathname: cannot determine slugs from pathname: ${pathname}`)
	}

	const match = pathnames[pathType].exec(pathname)
	if (match == null) {
		throw errors.new(`invalid pathname: cannot determine slugs from pathname: ${pathname}`)
	}

	return match.slice(1).filter((slug): slug is Slug => slug !== undefined && SlugSchema.safeParse(slug).success)
}

/**
 * Parses a OneRoster resource into a Resource.
 * @param oneRosterResource - The OneRoster resource to parse
 * @returns The parsed Resource
 */
export function parseOneRosterResource(oneRosterResource: Partial<OneRosterResource>): Resource {
	const sourcedId = oneRosterResource.sourcedId
	if (sourcedId == null) {
		logger.error("parsing oneroster resource: invalid resource data: sourcedId is missing")
		throw errors.new("invalid resource data: sourcedId is missing")
	}
	logger.debug("parsing oneroster resource", { sourcedId })

	const khanMeta = oneRosterResource.metadata
	if (khanMeta == null) {
		logger.error("parsing oneroster resource: invalid resource data: khan meta is missing", { sourcedId })
		throw errors.new(`invalid resource data: khan meta is missing: ${sourcedId}`)
	}
	logger.debug("parsing oneroster resource: khan meta", { sourcedId, khanMeta })

	const khanSlug = khanMeta.khanSlug
	if (khanSlug == null) {
		logger.error("parsing oneroster resource: invalid resource data: khan slug is missing", { sourcedId })
		throw errors.new(`invalid resource data: khan slug is missing: ${sourcedId}`)
	}
	logger.debug("parsing oneroster resource: khan slug", { sourcedId, khanSlug })

	const khanPath = khanMeta.path
	if (khanPath == null) {
		logger.error("parsing oneroster resource: invalid resource data: khan path is missing", { sourcedId })
		throw errors.new(`invalid resource data: khan path is missing: ${sourcedId}`)
	}
	logger.debug("parsing oneroster resource: khan path", { sourcedId, khanPath })

	const khanType = getTypeFromPathname(khanPath)
	if (khanType == null) {
		logger.error("parsing oneroster resource: invalid resource data: cannot determine type from path", { sourcedId })
		throw errors.new(`invalid resource data: cannot determine type from path: ${sourcedId}`)
	}
	logger.debug("parsing oneroster resource: khan type", { sourcedId, khanType })

	const url = khanMeta.url
	if (url == null) {
		logger.error("parsing oneroster resource: invalid resource data: khan meta is missing url", { sourcedId })
		throw errors.new(`invalid resource data: khan meta is missing url: ${sourcedId}`)
	}
	logger.debug("parsing oneroster resource: khan url", { sourcedId, url })

	const khanTitle = khanMeta.khanTitle
	if (khanTitle == null) {
		logger.error("parsing oneroster resource: invalid resource data: khan title is missing", { sourcedId })
		throw errors.new(`invalid resource data: khan title is missing: ${sourcedId}`)
	}
	logger.debug("parsing oneroster resource: khan title", { sourcedId, khanTitle })

	const khanDesc = khanMeta.khanDescription
	logger.debug("parsing oneroster resource: khan description", { sourcedId, khanDesc })

	const parsed = ResourceSchema.safeParse({
		sourcedId,
		type: khanType,
		meta: { url },
		slug: khanSlug,
		title: khanTitle,
		description: khanDesc
	})
	if (!parsed.success) {
		logger.error("parsing oneroster resource: invalid resource data: failed to parse", {
			sourcedId,
			error: parsed.error
		})
		throw errors.wrap(parsed.error, `invalid resource data: failed to parse: ${sourcedId}`)
	}
	logger.debug("parsing oneroster resource: parsed", { sourcedId })

	return parsed.data
}

/**
 * Parses a OneRoster course component into a CourseComponent.
 * @param oneRosterCourseComponent - The OneRoster course component to parse
 * @returns The parsed CourseComponent
 */
export function parseOneRosterCourseComponent(
	oneRosterCourseComponent: Partial<OneRosterCourseComponent>
): CourseComponent {
	const sourcedId = oneRosterCourseComponent.sourcedId
	if (sourcedId == null) {
		logger.error("parsing oneroster course component: invalid component data: sourcedId is missing")
		throw errors.new("invalid component data: sourcedId is missing")
	}
	logger.debug("parsing oneroster course component", { sourcedId })

	const courseSourcedId = oneRosterCourseComponent.course?.sourcedId
	if (courseSourcedId == null) {
		logger.error("parsing oneroster course component: invalid component data: course sourcedId is missing", {
			sourcedId
		})
		throw errors.new(`invalid component data: course sourcedId is missing: ${sourcedId}`)
	}
	logger.debug("parsing oneroster course component: course sourcedId", { sourcedId, courseSourcedId })

	const khanMeta = oneRosterCourseComponent.metadata
	if (khanMeta == null) {
		logger.error("parsing oneroster course component: invalid component data: khan meta is missing", { sourcedId })
		throw errors.new(`invalid component data: khan meta is missing: ${sourcedId}`)
	}
	logger.debug("parsing oneroster course component: khan meta", { sourcedId, khanMeta })

	const khanSlug = khanMeta.khanSlug
	if (khanSlug == null) {
		logger.error("parsing oneroster course component: invalid component data: khan slug is missing", { sourcedId })
		throw errors.new(`invalid component data: khan slug is missing: ${sourcedId}`)
	}
	logger.debug("parsing oneroster course component: khan slug", { sourcedId, khanSlug })

	const khanPath = khanMeta.path
	if (khanPath == null && sourcedId !== courseSourcedId) {
		logger.error("parsing oneroster course component: invalid component data: khan path is missing", { sourcedId })
		throw errors.new(`invalid component data: khan path is missing: ${sourcedId}`)
	}
	logger.debug("parsing oneroster course component: khan path", { sourcedId, khanPath })

	let khanType = getTypeFromPathname(khanPath)
	if (khanType == null) {
		// Edge case to deal with because of poor data fetching.
		if (sourcedId !== courseSourcedId) {
			logger.error("parsing oneroster course component: invalid component data: cannot determine type from path", {
				sourcedId
			})
			throw errors.new(`invalid component data: cannot determine type from path: ${sourcedId}`)
		}

		khanType = "__course_challenge"
	}
	logger.debug("parsing oneroster course component: khan type", { sourcedId, khanType })

	const khanTitle = khanMeta.khanTitle
	if (khanTitle == null) {
		logger.error("parsing oneroster course component: invalid component data: khan title is missing", { sourcedId })
		throw errors.new(`invalid component data: khan title is missing: ${sourcedId}`)
	}
	logger.debug("parsing oneroster course component: khan title", { sourcedId, khanTitle })

	const khanOrder = oneRosterCourseComponent.sortOrder
	if (khanOrder == null) {
		logger.error("parsing oneroster course component: invalid component data: khan order is missing", { sourcedId })
		throw errors.new(`invalid component data: khan order is missing: ${sourcedId}`)
	}
	logger.debug("parsing oneroster course component: khan order", { sourcedId, khanOrder })

	const parentSourcedId = oneRosterCourseComponent.parent?.sourcedId
	logger.debug("parsing oneroster course component: parent sourcedId", { sourcedId, parentSourcedId })

	const khanDesc = khanMeta.khanDescription
	logger.debug("parsing oneroster course component: khan description", { sourcedId, khanDesc })

	const parsed = CourseComponentSchema.safeParse({
		sourcedId,
		type: khanType,
		meta: { courseSourcedId, parentSourcedId },
		slug: khanSlug,
		title: khanTitle,
		order: khanOrder,
		description: khanDesc,
		resources: {}
	})
	if (!parsed.success) {
		logger.error("parsing oneroster course component: invalid component data: failed to parse", {
			sourcedId,
			error: parsed.error
		})
		throw errors.wrap(parsed.error, `invalid component data: failed to parse: ${sourcedId}`)
	}
	logger.debug("parsing oneroster course component: parsed", { sourcedId })

	return parsed.data
}

/**
 * Parses a OneRoster course into a Course.
 * @param oneRosterCourse - The OneRoster course to parse
 * @returns The parsed Course
 */
export function parseOneRosterCourse(oneRosterCourse: Partial<OneRosterCourse>): Course {
	const sourcedId = oneRosterCourse.sourcedId
	if (sourcedId == null) {
		logger.error("parsing oneroster course: invalid course data: sourcedId is missing")
		throw errors.new("invalid course data: sourcedId is missing")
	}
	logger.debug("parsing oneroster course", { sourcedId })

	const khanMeta = oneRosterCourse.metadata
	if (khanMeta == null) {
		logger.error("parsing oneroster course: invalid course data: khan meta is missing", { sourcedId })
		throw errors.new(`invalid course data: khan meta is missing: ${sourcedId}`)
	}
	logger.debug("parsing oneroster course: khan meta", { sourcedId, khanMeta })

	const khanSlug = khanMeta.khanSlug
	if (khanSlug == null) {
		logger.error("parsing oneroster course: invalid course data: khan slug is missing", { sourcedId })
		throw errors.new(`invalid course data: khan slug is missing: ${sourcedId}`)
	}
	logger.debug("parsing oneroster course: khan slug", { sourcedId, khanSlug })

	const khanPath = khanMeta.path
	if (khanPath == null) {
		logger.error("parsing oneroster course: invalid course data: khan path is missing", { sourcedId })
		throw errors.new(`invalid course data: khan path is missing: ${sourcedId}`)
	}
	logger.debug("parsing oneroster course: khan path", { sourcedId, khanPath })

	const khanType = getTypeFromPathname(khanPath)
	if (khanType == null) {
		logger.error("parsing oneroster course: invalid course data: cannot determine type from path", { sourcedId })
		throw errors.new(`invalid course data: cannot determine type from path: ${sourcedId}`)
	}
	if (khanType !== "course") {
		logger.error("parsing oneroster course: invalid course data: khan type is not course", { sourcedId })
		throw errors.new(`invalid course data: khan type is not course: ${sourcedId}`)
	}
	logger.debug("parsing oneroster course: khan type", { sourcedId, khanType })

	const khanTitle = khanMeta.khanTitle
	if (khanTitle == null) {
		logger.error("parsing oneroster course: invalid course data: khan title is missing", { sourcedId })
		throw errors.new(`invalid course data: khan title is missing: ${sourcedId}`)
	}
	logger.debug("parsing oneroster course: khan title", { sourcedId, khanTitle })

	const khanDesc = khanMeta.khanDescription
	logger.debug("parsing oneroster course: khan description", { sourcedId, khanDesc })

	const parsed = CourseSchema.safeParse({
		sourcedId,
		type: khanType,
		slug: khanSlug,
		title: khanTitle,
		description: khanDesc,
		resources: {}
	})
	if (!parsed.success) {
		logger.error("parsing oneroster course: invalid course data: failed to parse", { sourcedId, error: parsed.error })
		throw errors.new(`invalid course data: failed to parse: ${sourcedId}`)
	}
	logger.debug("parsing oneroster course: parsed", { sourcedId })

	return parsed.data
}

/**
 * Builds a Course from a OneRoster course, course components, and component resources.
 * @param oneRosterCourse - The OneRoster course to build
 * @param oneRosterCourseComponents - The OneRoster course components to build
 * @param oneRosterComponentResources - The OneRoster component resources to build
 * @returns The built Course
 */
export function buildOneRosterCourse(
	oneRosterCourse: Partial<OneRosterCourse>,
	oneRosterCourseComponents: Partial<OneRosterCourseComponent>[],
	oneRosterComponentResources: Partial<OneRosterComponentResource>[],
	oneRosterResources: Partial<OneRosterResource>[]
): Course {
	const courseResult = errors.trySync(() => parseOneRosterCourse(oneRosterCourse))
	if (courseResult.error != null) {
		logger.error("building oneroster course: failed to parse course", { error: courseResult.error })
		throw errors.wrap(courseResult.error, "failed to parse course")
	}

	const course: Course = courseResult.data
	logger.debug("building oneroster course: parsed course", { sourcedId: course.sourcedId })

	const courseComponents = new Map<SourcedId, CourseComponent>()
	for (const oneRosterCourseComponent of oneRosterCourseComponents) {
		const courseComponent = errors.trySync(() => parseOneRosterCourseComponent(oneRosterCourseComponent))
		if (courseComponent.error != null) {
			logger.error("building oneroster course: failed to parse course component", { error: courseComponent.error })
			throw errors.wrap(courseComponent.error, "failed to parse course component")
		}

		logger.debug("building oneroster course: parsed course component", { sourcedId: courseComponent.data.sourcedId })
		courseComponents.set(courseComponent.data.sourcedId, courseComponent.data)
	}
	logger.debug("building oneroster course: parsed course components", {
		sourcedId: course.sourcedId,
		count: courseComponents.size
	})

	const resources = new Map<SourcedId, Resource>()
	for (const oneRosterResource of oneRosterResources) {
		const resource = errors.trySync(() => parseOneRosterResource(oneRosterResource))
		if (resource.error != null) {
			logger.error("building oneroster course: failed to parse resource", { error: resource.error })
			throw errors.wrap(resource.error, "failed to parse resource")
		}

		logger.debug("building oneroster course: parsed resource", { sourcedId: resource.data.sourcedId })
		resources.set(resource.data.sourcedId, resource.data)
	}
	logger.debug("building oneroster course: parsed component resources", {
		sourcedId: course.sourcedId,
		count: resources.size
	})

	for (const oneRosterComponentResource of oneRosterComponentResources) {
		if (oneRosterComponentResource.courseComponent == null) {
			logger.error("building oneroster course: invalid component resource data: course component is missing", {
				courseSourcedId: course.sourcedId,
				oneRosterComponentResourceSourcedId: oneRosterComponentResource.sourcedId
			})
			throw errors.new(`invalid component resource data: course component is missing: ${course.sourcedId}`)
		}
		logger.debug("building oneroster course: found oneroster component resource's course component", {
			courseSourcedId: course.sourcedId,
			oneRosterComponentResourceSourcedId: oneRosterComponentResource.sourcedId
		})

		if (oneRosterComponentResource.resource == null) {
			logger.error("building oneroster course: invalid component resource data: resource is missing", {
				courseSourcedId: course.sourcedId,
				oneRosterComponentResourceSourcedId: oneRosterComponentResource.sourcedId
			})
			throw errors.new(`invalid component resource data: resource is missing: ${course.sourcedId}`)
		}
		logger.debug("building oneroster course: found oneroster component resource's resource", {
			courseSourcedId: course.sourcedId,
			oneRosterComponentResourceSourcedId: oneRosterComponentResource.sourcedId
		})

		const courseComponent = courseComponents.get(oneRosterComponentResource.courseComponent.sourcedId)
		if (courseComponent == null) {
			logger.error("building oneroster course: invalid component resource data: course component not found", {
				courseComponentSourcedId: oneRosterComponentResource.courseComponent.sourcedId
			})
			throw errors.new(
				`invalid component resource data: course component not found: ${oneRosterComponentResource.courseComponent.sourcedId}`
			)
		}
		logger.debug("building oneroster course: found course component", {
			courseSourcedId: course.sourcedId,
			courseComponentSourcedId: courseComponent.sourcedId
		})

		const resource = resources.get(oneRosterComponentResource.resource.sourcedId)
		if (resource == null) {
			logger.error("building oneroster course: invalid component resource data: resource not found", {
				courseSourcedId: course.sourcedId,
				resourceSourcedId: oneRosterComponentResource.resource.sourcedId
			})
			throw errors.new(
				`invalid component resource data: resource not found: ${oneRosterComponentResource.resource.sourcedId}`
			)
		}
		logger.debug("building oneroster course: found resource", {
			courseSourcedId: course.sourcedId,
			resourceSourcedId: resource.sourcedId
		})

		attachResource(course, courseComponent, resource)
		logger.debug("building oneroster course: attached resource to course component", {
			courseSourcedId: course.sourcedId,
			courseComponentSourcedId: courseComponent.sourcedId,
			resourceSourcedId: resource.sourcedId
		})
	}
	logger.debug("building oneroster course: parsed component resources", {
		sourcedId: course.sourcedId,
		count: resources.size
	})

	for (const courseComponent of courseComponents.values()) {
		const parentSourcedId = courseComponent.meta.parentSourcedId
		if (parentSourcedId != null) {
			const parent = courseComponents.get(parentSourcedId)
			if (parent == null) {
				logger.error("building oneroster course: invalid course component data: parent not found", {
					courseComponentSourcedId: courseComponent.sourcedId,
					parentSourcedId
				})
				throw errors.new(`invalid course component data: parent not found: ${parentSourcedId}`)
			}
			logger.debug("building oneroster course: found parent", {
				courseComponentSourcedId: courseComponent.sourcedId,
				parentSourcedId,
				parentType: parent.type
			})

			if (parent.type === "unit" && courseComponent.type === "lesson") {
				logger.debug("building oneroster course: found parent", {
					courseComponentSourcedId: courseComponent.sourcedId,
					parentSourcedId,
					parentType: parent.type
				})
				parent.children[courseComponent.sourcedId] = courseComponent
			}

			logger.error(
				"building oneroster course: invalid course component data: parent is not a variant of the course component",
				{ courseComponentSourcedId: courseComponent.sourcedId, parentSourcedId }
			)
			throw errors.new(
				`invalid course component data: parent is not a variant of the course component: ${courseComponent.sourcedId}`
			)
		}

		const courseSourcedId = courseComponent.meta.courseSourcedId
		if (course.sourcedId !== courseSourcedId) {
			logger.error("building oneroster course: invalid course component data: course sourcedId does not match", {
				courseComponentSourcedId: courseComponent.sourcedId,
				courseSourcedId
			})
			throw errors.new(`invalid course component data: course sourcedId does not match: ${courseSourcedId}`)
		}
		logger.debug("building oneroster course: found course", {
			courseComponentSourcedId: courseComponent.sourcedId,
			courseSourcedId,
			courseType: course.type
		})

		if (course.type === "course" && courseComponent.type === "unit") {
			logger.debug("building oneroster course: found course", {
				courseComponentSourcedId: courseComponent.sourcedId,
				courseSourcedId,
				courseType: course.type
			})
			course.children[courseComponent.sourcedId] = courseComponent
		}

		logger.error(
			"building oneroster course: invalid course component data: course is not a variant of the course component",
			{ courseComponentSourcedId: courseComponent.sourcedId, courseSourcedId }
		)
		throw errors.new(
			`invalid course component data: course is not a variant of the course component: ${courseComponent.sourcedId}`
		)
	}

	return course
}
