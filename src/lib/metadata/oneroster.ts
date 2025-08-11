import { z } from "zod"

export const CourseMetadataSchema = z.object({
	khanId: z.string().min(1),
	khanSlug: z.string().min(1),
	khanSubjectSlug: z.string().min(1),
	khanTitle: z.string().min(1),
	khanDescription: z.string().default("")
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
	xp: z.number().default(0)
})

// Schema for Interactive-specific metadata - this is now the only resource type
const InteractiveResourceMetadataSchema = BaseResourceMetadataSchema.extend({
	type: z.literal("interactive"),
	launchUrl: z.string().url(),
	toolProvider: z.string().optional(),
	activityType: z.enum(["Article", "Video", "Exercise", "Quiz", "UnitTest", "CourseChallenge"]),
	// Add khanYoutubeId to support videos being marked as interactive
	khanYoutubeId: z.string().optional()
})

// The resource metadata schema - only interactive resources now
export const ResourceMetadataSchema = InteractiveResourceMetadataSchema
export type ResourceMetadata = z.infer<typeof ResourceMetadataSchema>
export type ActivityType = z.infer<typeof InteractiveResourceMetadataSchema.shape.activityType>
