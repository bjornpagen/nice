import { z } from "zod"

/**
 * Defines the canonical structure for metadata stored with an assessment result in the gradebook.
 * This schema is the single source of truth for validating and creating result metadata.
 * Required fields have no defaults to enforce explicit calculation.
 */
export const AssessmentResultMetadataSchema = z
	.object({
		masteredUnits: z.number().int(),
		totalQuestions: z.number().int(),
		correctQuestions: z.number().int(),
		accuracy: z.number().int().min(0).max(100),
		xp: z.number().int(),
		multiplier: z.number(),
		attempt: z.number().int().optional(),
		startedAt: z.string().datetime().optional(),
		completedAt: z.string().datetime(),
		// Optional per-content metadata
		// nice_timeSpent captures watched seconds for passive content (e.g., video)
		nice_timeSpent: z.number().int().optional(),
		lessonType: z.string().optional(),
		courseSourcedId: z.string(),
		durationInSeconds: z.number().optional(),
		penaltyApplied: z.boolean(),
		xpReason: z.string(),
		// Indicates how time was tracked: "accumulated" (new heartbeat method) or "wall-clock-fallback" (legacy)
		timeTrackingMethod: z.enum(["accumulated", "wall-clock-fallback"]).optional()
	})
	.refine((data) => !(data.penaltyApplied && !data.xpReason), {
		message: "xpReason must be provided when a penalty is applied."
	})

export type AssessmentResultMetadata = z.infer<typeof AssessmentResultMetadataSchema>
