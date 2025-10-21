import { z } from "zod"

export const CourseMetadataSchema = z.object({
	khanId: z.string().min(1),
	khanSlug: z.string().min(1),
	khanSubjectSlug: z.string().min(1),
	khanTitle: z.string().min(1),
	khanDescription: z.string().default(""),
	// Optional flag to hide a course from user-facing selectors and explore menus
	custom: z.boolean().optional()
})
export type CourseMetadata = z.infer<typeof CourseMetadataSchema>

export const ComponentMetadataSchema = z.object({
	khanId: z.string().min(1),
	khanSlug: z.string().min(1),
	khanTitle: z.string().min(1),
	khanDescription: z.string().default("")
})
export type ComponentMetadata = z.infer<typeof ComponentMetadataSchema>

// Base schema for common resource properties
const BaseResourceMetadataSchema = z.object({
	khanId: z.string().min(1),
	khanSlug: z.string().min(1),
	khanTitle: z.string().min(1),
	khanDescription: z.string().default(""),
	xp: z.number().default(0),
	// Optional shared convenience field used by our frontend for videos
	khanYoutubeId: z.string().optional(),
	// REQUIRED: Nice-controlled activity type used across the app
	khanActivityType: z.enum(["Article", "Video", "Exercise", "Quiz", "UnitTest", "CourseChallenge"])
})

// Schema for Interactive-specific metadata
const InteractiveResourceMetadataSchema = BaseResourceMetadataSchema.extend({
	type: z.literal("interactive"),
	launchUrl: z.string().url(),
	url: z.string().url().optional(),
	toolProvider: z.string().optional()
})

// Schema for QTI-specific metadata (used for exercises and assessment tests)
const QtiResourceMetadataSchema = BaseResourceMetadataSchema.extend({
	type: z.literal("qti"),
	subType: z.enum(["qti-test", "qti-stimulus", "qti-question", "qti-test-bank"]).default("qti-test"),
	url: z.string().url(),
	version: z.string().default("3.0"),
	language: z.string().default("en-US"),
	questionType: z.string().optional()
})

// The resource metadata schema supports both interactive and qti resources
export const ResourceMetadataSchema = z.discriminatedUnion("type", [
	InteractiveResourceMetadataSchema,
	QtiResourceMetadataSchema
])
export type ResourceMetadata = z.infer<typeof ResourceMetadataSchema>
export type KhanActivityType = z.infer<typeof BaseResourceMetadataSchema.shape.khanActivityType>
