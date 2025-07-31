import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
// Import QTI workers
import { clearAllXmlData } from "@/inngest/functions/clear-all-xml-data"
import { clearCourseXmlData } from "@/inngest/functions/clear-course-xml-data"
import { helloWorld } from "@/inngest/functions/hello"
// Import OneRoster workers
import { generatePayloadForCourse as generateOnerosterPayloadForCourse } from "@/inngest/functions/oneroster/generate-payload-for-course"
import { ingestAssessmentLineItems } from "@/inngest/functions/oneroster/ingest-assessment-line-items"
import { ingestClass } from "@/inngest/functions/oneroster/ingest-class"
import { ingestComponentResources } from "@/inngest/functions/oneroster/ingest-component-resources"
import { ingestCourse } from "@/inngest/functions/oneroster/ingest-course"
import { ingestCourseComponents } from "@/inngest/functions/oneroster/ingest-course-components"
import { ingestResources } from "@/inngest/functions/oneroster/ingest-resources"
// ✅ ADD: Import the new batch orchestration function
import { orchestrateBatchCourseIngestion } from "@/inngest/functions/orchestrate-batch-course-ingestion"
// ✅ MODIFIED: The old orchestrator is replaced by the new unified one.
import { orchestrateCourseIngestionToQti } from "@/inngest/functions/orchestrate-course-ingestion-to-qti"
// Import orchestrators
import { orchestrateCourseOnerosterGeneration } from "@/inngest/functions/orchestrate-course-oneroster-generation"
import { orchestrateCourseXmlGeneration } from "@/inngest/functions/orchestrate-course-qti-generation"
import { orchestrateCourseUploadToOneroster } from "@/inngest/functions/orchestrate-course-upload-to-oneroster"
import { orchestrateCourseUploadToQti } from "@/inngest/functions/orchestrate-course-upload-to-qti"
// ADD: Import the new independent functions.
import { orchestrateHardcodedOnerosterIngestion } from "@/inngest/functions/orchestrate-hardcoded-oneroster-ingestion"
// ADD: Import the two new hardcoded migration orchestrators
import { orchestrateHardcodedPerseusMigration } from "@/inngest/functions/orchestrate-hardcoded-perseus-migration"
import { orchestrateHardcodedQtiIngestion } from "@/inngest/functions/orchestrate-hardcoded-qti-ingestion"
import { convertPerseusArticleToQtiStimulus } from "@/inngest/functions/qti/convert-perseus-article-to-qti-stimulus"
import { convertPerseusQuestionToQtiItem } from "@/inngest/functions/qti/convert-perseus-question-to-qti-item"
// ✅ ADD: Import the new differentiate function
import { differentiateQuestion } from "@/inngest/functions/qti/differentiate-question"
// ❌ REMOVED: The old differentiated ingest function is deleted.
// import { differentiatedIngest } from "@/inngest/functions/qti/differentiated-ingest"
import { ingestAssessmentItems } from "@/inngest/functions/qti/ingest-assessment-items"
import { ingestAssessmentStimuli } from "@/inngest/functions/qti/ingest-assessment-stimuli"
import { ingestAssessmentTests } from "@/inngest/functions/qti/ingest-assessment-tests"
// ✅ ADD: Import the new paraphrase function
import { paraphraseStimulus } from "@/inngest/functions/qti/paraphrase-stimulus"
import { requestAllItemMigrationsForCourse } from "@/inngest/functions/qti/request-all-item-migrations-for-course"
import { requestAllStimulusMigrationsForCourse } from "@/inngest/functions/qti/request-all-stimulus-migrations-for-course"

// Create and export the Inngest HTTP handler
export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		helloWorld,
		// Orchestrators
		orchestrateCourseOnerosterGeneration,
		orchestrateCourseUploadToOneroster,
		orchestrateCourseIngestionToQti, // ✅ MODIFIED: This is now the unified orchestrator
		orchestrateBatchCourseIngestion, // ✅ ADD: Register the new batch orchestration function
		orchestrateCourseXmlGeneration,
		orchestrateCourseUploadToQti,
		// ADD: Register the new hardcoded migration orchestrators
		orchestrateHardcodedPerseusMigration,
		// ADD: Register the new independent functions.
		orchestrateHardcodedOnerosterIngestion,
		orchestrateHardcodedQtiIngestion,
		// ✅ REMOVED: Old differentiated ingest is no longer registered.
		// differentiatedIngest,
		// OneRoster Functions
		generateOnerosterPayloadForCourse,
		ingestClass,
		ingestComponentResources,
		ingestCourse,
		ingestCourseComponents,
		ingestResources,
		ingestAssessmentLineItems,
		// QTI Functions
		clearAllXmlData,
		clearCourseXmlData,
		convertPerseusArticleToQtiStimulus,
		convertPerseusQuestionToQtiItem,
		ingestAssessmentItems,
		ingestAssessmentStimuli,
		ingestAssessmentTests,
		requestAllItemMigrationsForCourse,
		requestAllStimulusMigrationsForCourse,
		// ✅ ADD: Register the new function
		differentiateQuestion,
		// ✅ ADD: Register the new paraphrase function
		paraphraseStimulus
	]
})
