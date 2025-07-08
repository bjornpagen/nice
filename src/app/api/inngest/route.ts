import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { generateOnerosterForCourse } from "@/inngest/functions/generate-oneroster-for-course"
import { helloWorld } from "@/inngest/functions/hello"
import { migrateAllAssessmentItemsForExercise } from "@/inngest/functions/migrate-all-assessment-items-for-exercise"
import { migrateArticleToQtiAssessmentStimulus } from "@/inngest/functions/migrate-article-to-qti-assessment-stimulus"
import { migrateQuestionToQtiAssessmentItem } from "@/inngest/functions/migrate-question-to-qti-assessment-item"

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		helloWorld,
		migrateAllAssessmentItemsForExercise,
		migrateQuestionToQtiAssessmentItem,
		migrateArticleToQtiAssessmentStimulus,
		generateOnerosterForCourse
	]
})
