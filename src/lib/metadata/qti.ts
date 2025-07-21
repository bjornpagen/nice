import { z } from "zod"

export const QtiItemMetadataSchema = z
	.object({
		khanId: z.string(),
		khanExerciseId: z.string(),
		khanExerciseSlug: z.string(),
		khanExerciseTitle: z.string()
	})
	.strict()
export type QtiItemMetadata = z.infer<typeof QtiItemMetadataSchema>

export const QtiStimulusMetadataSchema = z
	.object({
		khanId: z.string(),
		khanSlug: z.string(),
		khanTitle: z.string()
	})
	.strict()
export type QtiStimulusMetadata = z.infer<typeof QtiStimulusMetadataSchema>

export const QtiTestMetadataSchema = z
	.object({
		khanId: z.string(),
		khanSlug: z.string(),
		khanTitle: z.string(),
		khanDescription: z.string().nullable().default(""),
		khanAssessmentType: z.enum(["Exercise", "Quiz", "UnitTest", "CourseChallenge"])
	})
	.strict()
export type QtiTestMetadata = z.infer<typeof QtiTestMetadataSchema>
