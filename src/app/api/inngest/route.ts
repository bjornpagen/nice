import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { helloWorld } from "@/inngest/functions/hello"
import { createAssessmentLineItems } from "@/inngest/functions/oneroster/create-assessment-line-items"
// Import OneRoster workers
import { generatePayloadForCourse as generateOnerosterPayloadForCourse } from "@/inngest/functions/oneroster/generate-payload-for-course"
import { ingestClass } from "@/inngest/functions/oneroster/ingest-class"
import { ingestComponentResources } from "@/inngest/functions/oneroster/ingest-component-resources"
import { ingestCourse } from "@/inngest/functions/oneroster/ingest-course"
import { ingestCourseComponents } from "@/inngest/functions/oneroster/ingest-course-components"
import { ingestResources } from "@/inngest/functions/oneroster/ingest-resources"
// Import orchestrators
import { orchestrateCourseIngestionToOneroster } from "@/inngest/functions/orchestrate-course-ingestion-to-oneroster"
import { orchestrateCourseIngestionToQti } from "@/inngest/functions/orchestrate-course-ingestion-to-qti"
import { orchestrateCourseXmlGeneration } from "@/inngest/functions/orchestrate-course-qti-generation"
import { orchestrateCourseUploadToQti } from "@/inngest/functions/orchestrate-course-upload-to-qti"
// Import QTI workers
import { convertPerseusArticleToQtiStimulus } from "@/inngest/functions/qti/convert-perseus-article-to-qti-stimulus"
import { convertPerseusQuestionToQtiItem } from "@/inngest/functions/qti/convert-perseus-question-to-qti-item"
import { ingestAssessmentItems } from "@/inngest/functions/qti/ingest-assessment-items"
import { ingestAssessmentStimuli } from "@/inngest/functions/qti/ingest-assessment-stimuli"
import { ingestAssessmentTests } from "@/inngest/functions/qti/ingest-assessment-tests"
import { requestAllItemMigrationsForCourse } from "@/inngest/functions/qti/request-all-item-migrations-for-course"
import { requestAllStimulusMigrationsForCourse } from "@/inngest/functions/qti/request-all-stimulus-migrations-for-course"

// Create and export the Inngest HTTP handler
export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		helloWorld,
		// Orchestrators
		orchestrateCourseIngestionToOneroster,
		orchestrateCourseIngestionToQti,
		orchestrateCourseUploadToQti,
		orchestrateCourseXmlGeneration,
		// OneRoster Functions
		generateOnerosterPayloadForCourse,
		ingestClass,
		ingestComponentResources,
		ingestCourse,
		ingestCourseComponents,
		ingestResources,
		createAssessmentLineItems,
		// QTI Functions
		convertPerseusArticleToQtiStimulus,
		convertPerseusQuestionToQtiItem,
		ingestAssessmentItems,
		ingestAssessmentStimuli,
		ingestAssessmentTests,
		requestAllItemMigrationsForCourse,
		requestAllStimulusMigrationsForCourse
	]
})
