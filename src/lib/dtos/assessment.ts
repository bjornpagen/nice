import { z } from "zod"
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
	userEmail: z.string().email().optional(),
	contentType: z.enum(["Exercise", "Quiz", "Test", "CourseChallenge"]),
	score: z.number().int().min(0).max(100),
	correctAnswers: z.number().int(),
	totalQuestions: z.number().int(),
	isInteractiveAssessment: z.boolean(),
	subjectSlug: z.string(),
	courseSlug: z.string(),
	userPublicMetadata: z.unknown().optional()
})

export type SaveAssessmentResultCommand = z.infer<typeof SaveAssessmentResultCommandSchema>
