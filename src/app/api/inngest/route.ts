import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
// Import QTI workers
import { clearAllAssessmentItemData } from "@/inngest/functions/clear-all-assessment-item-data"
import { clearCourseXmlData } from "@/inngest/functions/clear-course-xml-data"
import { helloWorld } from "@/inngest/functions/hello"
// ✅ ADDED: Modular hardcoded QTI pipeline orchestrators
import { orchestrateHardcodedMathDifferentiatedItemGeneration } from "@/inngest/functions/migrations/orchestrate-hardcoded-math-differentiated-item-generation" // 🛑 RENAMED
// ✅ RENAMED & ADDED: Import all hardcoded migration functions
import { orchestrateHardcodedMathItemMigration } from "@/inngest/functions/migrations/orchestrate-hardcoded-math-item-migration"
import { orchestrateHardcodedMathOnerosterIngestion } from "@/inngest/functions/migrations/orchestrate-hardcoded-math-oneroster-ingestion"
import { orchestrateHardcodedMathQtiUpload } from "@/inngest/functions/migrations/orchestrate-hardcoded-math-qti-upload"
import { orchestrateHardcodedMathStimulusGeneration } from "@/inngest/functions/migrations/orchestrate-hardcoded-math-stimulus-generation" // 🛑 RENAMED
import { orchestrateHardcodedMathStimulusMigration } from "@/inngest/functions/migrations/orchestrate-hardcoded-math-stimulus-migration"
import { orchestrateHardcodedScienceItemMigration } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-item-migration"
import { orchestrateHardcodedScienceOnerosterIngestion } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-oneroster-ingestion"
import { orchestrateHardcodedScienceQtiGenerateUndifferentiated } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated"
import { orchestrateHardcodedScienceQtiUpload } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-qti-upload"
import { orchestrateHardcodedScienceStimulusMigration } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-stimulus-migration"
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
// ✅ ADD: Import the new batch differentiation and assembly functions
import { assembleDifferentiatedItemsAndCreateTests } from "@/inngest/functions/qti/assemble-differentiated-items-and-create-tests"
import { convertPerseusArticleToQtiStimulus } from "@/inngest/functions/qti/convert-perseus-article-to-qti-stimulus"
import { convertPerseusQuestionToDifferentiatedQtiItems } from "@/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items"
import { convertPerseusQuestionToQtiItem } from "@/inngest/functions/qti/convert-perseus-question-to-qti-item"
import { differentiateAndSaveQuestion } from "@/inngest/functions/qti/differentiate-and-save-question"
import { ingestAssessmentItemOne } from "@/inngest/functions/qti/ingest-assessment-item-one"
import { ingestAssessmentStimulusOne } from "@/inngest/functions/qti/ingest-assessment-stimulus-one"
import { ingestAssessmentTestOne } from "@/inngest/functions/qti/ingest-assessment-test-one"
import { ingestUndifferentiatedCourseFromDb } from "@/inngest/functions/qti/ingest-undifferentiated-course-from-db"
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
		// ✅ ADDED: Register all new and renamed functions
		orchestrateHardcodedMathItemMigration,
		orchestrateHardcodedMathStimulusMigration,
		orchestrateHardcodedMathOnerosterIngestion,
		orchestrateHardcodedMathDifferentiatedItemGeneration, // 🛑 RENAMED
		orchestrateHardcodedMathStimulusGeneration, // 🛑 RENAMED
		orchestrateHardcodedMathQtiUpload,
		orchestrateHardcodedScienceItemMigration,
		orchestrateHardcodedScienceStimulusMigration,
		orchestrateHardcodedScienceOnerosterIngestion,
		orchestrateHardcodedScienceQtiGenerateUndifferentiated,
		orchestrateHardcodedScienceQtiUpload,
		// ❌ REMOVED: Obsolete undifferentiated math qti generation
		// orchestrateHardcodedMathQtiGenerateUndifferentiated,
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
		ingestAssessmentItemOne,
		ingestAssessmentStimulusOne,
		ingestAssessmentTestOne,
		// ✅ ADD: Register the new validation function
		validateAndClearInvalidQuestionXml,
		// ✅ ADD: Register the new paraphrase function
		paraphraseStimulus,
		ingestUndifferentiatedCourseFromDb,
		// ✅ ADD: Register the new atomic differentiation and assembly functions
		differentiateAndSaveQuestion, // ✅ ADD: Register the new atomic differentiation function
		assembleDifferentiatedItemsAndCreateTests
	]
})
