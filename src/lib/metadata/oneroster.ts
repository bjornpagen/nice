import { z } from "zod"

export const CourseMetadataSchema = z
	.object({
		khanId: z.string().min(1),
		khanSlug: z.string().min(1),
		khanTitle: z.string().min(1),
		path: z.string().min(1),
		description: z.string().default("")
	})
	.strict() // Enforce strict validation
export type CourseMetadata = z.infer<typeof CourseMetadataSchema>

export const ComponentMetadataSchema = z
	.object({
		khanId: z.string().min(1),
		khanSlug: z.string().min(1),
		khanTitle: z.string().min(1),
		path: z.string().min(1),
		description: z.string().default("")
	})
	.strict() // Enforce strict validation
export type ComponentMetadata = z.infer<typeof ComponentMetadataSchema>

// Base schema for common resource properties
const BaseResourceMetadataSchema = z.object({
	khanId: z.string().min(1),
	khanSlug: z.string().min(1),
	khanTitle: z.string().min(1),
	path: z.string().min(1),
	description: z.string().default("")
})

// Schema for Video-specific metadata
const VideoResourceMetadataSchema = BaseResourceMetadataSchema.extend({
	type: z.literal("video"),
	url: z.string().url(),
	duration: z.number().optional()
}).strict()

// Schema for QTI-specific metadata, with its own discriminated union
const QtiResourceMetadataSchema = BaseResourceMetadataSchema.extend({
	type: z.literal("qti"),
	subType: z.enum(["qti-stimulus", "qti-test"]),
	khanLessonType: z.enum(["unittest", "quiz"]).optional()
}).strict()

// The final discriminated union schema for all resources
export const ResourceMetadataSchema = z.discriminatedUnion("type", [
	VideoResourceMetadataSchema,
	QtiResourceMetadataSchema
])
export type ResourceMetadata = z.infer<typeof ResourceMetadataSchema>
