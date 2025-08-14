//
import { getNextAttemptNumber } from "@/lib/actions/assessment"
import type { AssessmentTest, TestQuestionsResponse } from "@/lib/qti"
import { applyQtiSelectionAndOrdering } from "@/lib/qti-selection"
import type { Question } from "@/lib/types/domain"

interface PrepareOptions {
	userSourceId: string
	resourceSourcedId: string
	componentResourceSourcedId: string
	assessmentTest: AssessmentTest
	resolvedQuestions: TestQuestionsResponse["questions"]
}

export async function prepareInteractiveAssessment(options: PrepareOptions): Promise<{
	questions: Question[]
	attemptNumber: number
}> {
	const { userSourceId, resourceSourcedId, assessmentTest, resolvedQuestions } = options

	// 1) Derive attempt number purely from OneRoster results history via server action
	const attemptNumber = await getNextAttemptNumber(userSourceId, resourceSourcedId)

	// 3) Always select deterministically based on QTI structure
	const questions = applyQtiSelectionAndOrdering(assessmentTest, resolvedQuestions, {
		baseSeed: `${userSourceId}:${resourceSourcedId}`,
		attemptNumber,
		userSourceId,
		resourceSourcedId
	})

	return { questions, attemptNumber }
}
