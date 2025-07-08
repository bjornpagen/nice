import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { generateAllAssessmentItemsForCourse } from "@/inngest/functions/generate-all-assessment-items-for-course"
import { generateAllAssessmentStimuliForCourse } from "@/inngest/functions/generate-all-assessment-stimuli-for-course"
import { generateOnerosterForCourse } from "@/inngest/functions/generate-oneroster-for-course"
import { helloWorld } from "@/inngest/functions/hello"
import { migrateArticleToQtiAssessmentStimulus } from "@/inngest/functions/migrate-article-to-qti-assessment-stimulus"
import { migrateQuestionToQtiAssessmentItem } from "@/inngest/functions/migrate-question-to-qti-assessment-item"

// Create an API that serves all active functions
export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		helloWorld,
		migrateQuestionToQtiAssessmentItem,
		migrateArticleToQtiAssessmentStimulus,
		generateOnerosterForCourse,
		generateAllAssessmentItemsForCourse,
		generateAllAssessmentStimuliForCourse
	]
})
