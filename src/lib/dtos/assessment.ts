import { z } from "zod"
import { SUBJECT_SLUGS } from "@/lib/constants/subjects"
import type { Unit } from "@/lib/types/domain"

export const SaveAssessmentResultCommandSchema = z.object({
	clerkUserId: z.string(),
	correlationId: z.string().uuid(),
	onerosterResourceSourcedId: z.string(),
	onerosterComponentResourceSourcedId: z.string(),
	onerosterCourseSourcedId: z.string(),
	onerosterUserSourcedId: z.string(),
	sessionResults: z.array(
		z.object({ qtiItemId: z.string(), isCorrect: z.boolean().nullable(), isReported: z.boolean().optional() })
	),
	attemptNumber: z.number().int().min(1),
	durationInSeconds: z.number().optional(),
	expectedXp: z.number(),
	assessmentTitle: z.string(),
	assessmentPath: z.string(),
	unitData: z.custom<Unit>().optional(),
	userEmail: z.string().email(), // CHANGED: Made required for Caliper analytics
	contentType: z.enum(["Exercise", "Quiz", "Test", "CourseChallenge"]),
	score: z.number().int().min(0).max(100),
	correctAnswers: z.number().int(),
	totalQuestions: z.number().int(),
	isInteractiveAssessment: z.boolean(),
	subjectSlug: z.enum(SUBJECT_SLUGS),
	courseSlug: z.string(),
	userPublicMetadata: z.unknown().optional(),
	timeTrackingMethod: z.enum(["accumulated", "wall-clock-fallback"]).optional()
})

export type SaveAssessmentResultCommand = z.infer<typeof SaveAssessmentResultCommandSchema>
