import { z } from "zod"

export const CourseMetadataSchema = z
	.object({
		khanId: z.string().min(1),
		khanSlug: z.string().min(1),
		khanTitle: z.string().min(1),
		path: z.string().min(1),
		khanDescription: z.string().default("")
	})
	.strict() // Enforce strict validation
	.transform(({ path, ...rest }) => rest) // Drop the path field
export type CourseMetadata = z.infer<typeof CourseMetadataSchema>

export const ComponentMetadataSchema = z
	.object({
		khanId: z.string().min(1),
		khanSlug: z.string().min(1),
		khanTitle: z.string().min(1),
		path: z.string().min(1),
		khanDescription: z.string().default("")
	})
	.strict() // Enforce strict validation
	.transform(({ path, ...rest }) => rest) // Drop the path field
export type ComponentMetadata = z.infer<typeof ComponentMetadataSchema>

// Base schema for common resource properties
const BaseResourceMetadataSchema = z.object({
	khanId: z.string().min(1),
	khanSlug: z.string().min(1),
	khanTitle: z.string().min(1),
	path: z.string().min(1),
	khanDescription: z.string().default("")
})

// Schema for Video-specific metadata
const VideoResourceMetadataSchema = BaseResourceMetadataSchema.extend({
	type: z.literal("video"),
	url: z.string().url(),
	duration: z.number().optional(),
	format: z.string(),
	tenantId: z.string().optional(),
	clientAppId: z.string().optional(),
	sourcedId: z.string().optional()
}).strict()

// Schema for QTI-specific metadata, with its own discriminated union
const QtiResourceMetadataSchema = BaseResourceMetadataSchema.extend({
	type: z.literal("qti"),
	subType: z.enum(["qti-stimulus", "qti-test"]),
	khanLessonType: z.enum(["unittest", "quiz", "coursechallenge"]).optional(),
	version: z.string(),
	language: z.string(),
	url: z.string().url(),
	questionType: z.string().optional(),
	tenantId: z.string().optional(),
	clientAppId: z.string().optional(),
	sourcedId: z.string().optional()
}).strict()

// The final discriminated union schema for all resources
export const ResourceMetadataSchema = z
	.discriminatedUnion("type", [VideoResourceMetadataSchema, QtiResourceMetadataSchema])
	.transform(({ path, ...rest }) => rest) // Drop the path field from the union result
export type ResourceMetadata = z.infer<typeof ResourceMetadataSchema>
