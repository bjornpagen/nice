import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { generateAllAssessmentItemsForCourse } from "@/inngest/functions/generate-all-assessment-items-for-course"
import { generateAllAssessmentStimuliForCourse } from "@/inngest/functions/generate-all-assessment-stimuli-for-course"
import { helloWorld } from "@/inngest/functions/hello"
import { ingestCourseToOneroster } from "@/inngest/functions/ingest-course-to-oneroster"
import { migrateArticleToQtiAssessmentStimulus } from "@/inngest/functions/migrate-article-to-qti-assessment-stimulus"
import { migrateQuestionToQtiAssessmentItem } from "@/inngest/functions/migrate-question-to-qti-assessment-item"
import { generateOnerosterForCourse } from "@/inngest/functions/oneroster-courses/generate-oneroster-for-course"
import { ingestClass } from "@/inngest/functions/oneroster-courses/ingest-class"
import { ingestComponentResources } from "@/inngest/functions/oneroster-courses/ingest-component-resources"
import { ingestCourse } from "@/inngest/functions/oneroster-courses/ingest-course"
import { ingestCourseComponents } from "@/inngest/functions/oneroster-courses/ingest-course-components"
import { ingestResources } from "@/inngest/functions/oneroster-courses/ingest-resources"

// Create and export the Inngest HTTP handler
export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		helloWorld,
		generateAllAssessmentItemsForCourse,
		generateAllAssessmentStimuliForCourse,
		generateOnerosterForCourse,
		migrateArticleToQtiAssessmentStimulus,
		migrateQuestionToQtiAssessmentItem,
		// Add new OneRoster functions
		ingestCourseToOneroster,
		ingestResources,
		ingestCourse,
		ingestCourseComponents,
		ingestComponentResources,
		ingestClass
	]
})
