import { z } from "zod"

export const QtiItemMetadataSchema = z
	.object({
		khanId: z.string(),
		khanExerciseId: z.string(),
		khanExerciseSlug: z.string(),
		khanExercisePath: z.string(),
		khanExerciseTitle: z.string()
	})
	.strict()
	.transform(({ khanExercisePath, ...rest }) => rest)
export type QtiItemMetadata = z.infer<typeof QtiItemMetadataSchema>

export const QtiStimulusMetadataSchema = z
	.object({
		khanId: z.string(),
		khanSlug: z.string(),
		khanPath: z.string(),
		khanTitle: z.string()
	})
	.strict()
	.transform(({ khanPath, ...rest }) => rest)
export type QtiStimulusMetadata = z.infer<typeof QtiStimulusMetadataSchema>

export const QtiTestMetadataSchema = z
	.object({
		khanId: z.string(),
		khanSlug: z.string(),
		khanPath: z.string(),
		khanTitle: z.string(),
		khanDescription: z.string().nullable().default(""),
		khanAssessmentType: z.enum(["Exercise", "Quiz", "UnitTest", "CourseChallenge"])
	})
	.strict()
	.transform(({ khanPath, ...rest }) => rest)
export type QtiTestMetadata = z.infer<typeof QtiTestMetadataSchema>
