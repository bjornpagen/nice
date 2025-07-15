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

export const ResourceMetadataSchema = z
	.object({
		khanId: z.string().min(1),
		khanSlug: z.string().min(1),
		khanTitle: z.string().min(1),
		path: z.string().min(1),
		description: z.string().default(""),
		type: z.enum(["video", "qti"]),
		subType: z.enum(["qti-stimulus", "qti-test"]).optional(),
		khanLessonType: z.enum(["unittest", "quiz"]).optional(),
		url: z.string().optional(),
		duration: z.number().optional()
	})
	.strict() // Enforce strict validation
export type ResourceMetadata = z.infer<typeof ResourceMetadataSchema>
