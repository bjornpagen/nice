import type { AssessmentRedirectParams } from "@/lib/course-bundle/assessment-redirect"
import { getCachedQuizRedirectPath, getCachedTestRedirectPath } from "@/lib/oneroster/react/assessment-data"

export async function findAssessmentRedirectPath(params: AssessmentRedirectParams) {
	if (params.assessmentType === "quiz") {
		return getCachedQuizRedirectPath(params.subject, params.course, params.unit, params.assessment)
	}
	return getCachedTestRedirectPath(params.subject, params.course, params.unit, params.assessment)
}
