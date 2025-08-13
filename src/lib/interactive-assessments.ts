//
import { getNextAttemptNumber } from "@/lib/actions/assessment"
import type { AssessmentTest, TestQuestionsResponse } from "@/lib/qti"
import { applyQtiSelectionAndOrdering } from "@/lib/qti-selection"
import type { Question } from "@/lib/types/domain"

export type RotationMode = "deterministic" | "random"

interface PrepareOptions {
	userSourceId: string
	resourceSourcedId: string
	componentResourceSourcedId: string
	assessmentTest: AssessmentTest
	resolvedQuestions: TestQuestionsResponse["questions"]
	rotationMode: RotationMode
}

export async function prepareInteractiveAssessment(options: PrepareOptions): Promise<{
	questions: Question[]
	attemptNumber: number
}> {
	const { userSourceId, resourceSourcedId, assessmentTest, resolvedQuestions, rotationMode } = options

	// 1) Derive attempt number purely from OneRoster results history via server action
	const attemptNumber = await getNextAttemptNumber(userSourceId, resourceSourcedId)

	// 3) Select questions per rotation mode
	let questions: Question[]
	if (rotationMode === "deterministic") {
		questions = applyQtiSelectionAndOrdering(assessmentTest, resolvedQuestions, {
			baseSeed: `${userSourceId}:${resourceSourcedId}`,
			attemptNumber
		})
	} else {
		// random: rely on internal shuffle when baseSeed is not provided
		questions = applyQtiSelectionAndOrdering(assessmentTest, resolvedQuestions)
	}

	return { questions, attemptNumber }
}
