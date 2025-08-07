import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
// Import QTI workers
import { clearAllAssessmentItemData } from "@/inngest/functions/clear-all-assessment-item-data"
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
// ADD: Import the two new hardcoded migration orchestrators for items and stimuli separately
import { orchestrateHardcodedItemMigration } from "@/inngest/functions/orchestrate-hardcoded-item-migration"
// ADD: Import the new independent functions.
import { orchestrateHardcodedOnerosterIngestion } from "@/inngest/functions/orchestrate-hardcoded-oneroster-ingestion"
// ❌ REMOVED: Obsolete monolithic QTI ingestion orchestrator
// import { orchestrateHardcodedQtiIngestion } from "@/inngest/functions/orchestrate-hardcoded-qti-ingestion"
// ✅ ADDED: Modular hardcoded QTI pipeline orchestrators
import { orchestrateHardcodedQtiGenerationForItemsAndTests } from "@/inngest/functions/orchestrate-hardcoded-qti-generation-for-items-and-tests"
import { orchestrateHardcodedQtiGenerationForStimuli } from "@/inngest/functions/orchestrate-hardcoded-qti-generation-for-stimuli"
import { orchestrateHardcodedQtiUpload } from "@/inngest/functions/orchestrate-hardcoded-qti-upload"
import { orchestrateHardcodedStimulusMigration } from "@/inngest/functions/orchestrate-hardcoded-stimulus-migration"
import { convertPerseusArticleToQtiStimulus } from "@/inngest/functions/qti/convert-perseus-article-to-qti-stimulus"
import { convertPerseusQuestionToDifferentiatedQtiItems } from "@/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items"
import { convertPerseusQuestionToQtiItem } from "@/inngest/functions/qti/convert-perseus-question-to-qti-item"
import { ingestAssessmentItems } from "@/inngest/functions/qti/ingest-assessment-items"
import { ingestAssessmentStimuli } from "@/inngest/functions/qti/ingest-assessment-stimuli"
import { ingestAssessmentTests } from "@/inngest/functions/qti/ingest-assessment-tests"
import { orchestrateCourseDifferentiatedIngestion } from "@/inngest/functions/qti/orchestrate-course-differentiated-ingestion"
// ✅ ADD: Import the new paraphrase function
import { paraphraseStimulus } from "@/inngest/functions/qti/paraphrase-stimulus"
import { requestAllItemMigrationsForCourse } from "@/inngest/functions/qti/request-all-item-migrations-for-course"
import { requestAllStimulusMigrationsForCourse } from "@/inngest/functions/qti/request-all-stimulus-migrations-for-course"
// ✅ ADD: Import the new validation function
import { validateAndClearInvalidQuestionXml } from "@/inngest/functions/qti/validate-and-clear-invalid-question-xml"

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
		orchestrateCourseDifferentiatedIngestion, // ✅ ADD: Register the new differentiated ingestion orchestrator
		orchestrateCourseXmlGeneration,
		orchestrateCourseUploadToQti,
		// ADD: Register the new hardcoded migration orchestrators for items and stimuli separately
		orchestrateHardcodedItemMigration,
		orchestrateHardcodedStimulusMigration,
		// ADD: Register the new independent functions.
		orchestrateHardcodedOnerosterIngestion,
		// ✅ ADDED: Register new modular QTI pipeline orchestrators
		orchestrateHardcodedQtiGenerationForItemsAndTests,
		orchestrateHardcodedQtiGenerationForStimuli,
		orchestrateHardcodedQtiUpload,
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
		clearAllAssessmentItemData,
		clearCourseXmlData,
		convertPerseusArticleToQtiStimulus,
		convertPerseusQuestionToQtiItem,
		convertPerseusQuestionToDifferentiatedQtiItems,
		requestAllItemMigrationsForCourse,
		requestAllStimulusMigrationsForCourse,
		ingestAssessmentItems,
		ingestAssessmentStimuli,
		ingestAssessmentTests,
		// ✅ ADD: Register the new validation function
		validateAndClearInvalidQuestionXml,
		// ✅ ADD: Register the new paraphrase function
		paraphraseStimulus
	]
})
