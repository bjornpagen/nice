import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
// Import QTI workers
import { clearAllAssessmentItemData } from "@/inngest/functions/clear-all-assessment-item-data"
import { helloWorld } from "@/inngest/functions/hello"
import { orchestrateHardcodedHistoryItemMigration } from "@/inngest/functions/migrations/orchestrate-hardcoded-history-item-migration"
import { orchestrateHardcodedHistoryOnerosterIngestion } from "@/inngest/functions/migrations/orchestrate-hardcoded-history-oneroster-ingestion"
import { orchestrateHardcodedHistoryQAReview } from "@/inngest/functions/migrations/orchestrate-hardcoded-history-qa-review"
import { orchestrateHardcodedHistoryQtiGenerateUndifferentiated } from "@/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated"
import { orchestrateHardcodedHistoryQtiUpload } from "@/inngest/functions/migrations/orchestrate-hardcoded-history-qti-upload"
import { orchestrateHardcodedHistoryStimulusMigration } from "@/inngest/functions/migrations/orchestrate-hardcoded-history-stimulus-migration"
// ✅ ADDED: Modular hardcoded QTI pipeline orchestrators
import { orchestrateHardcodedMathDifferentiatedItemGeneration } from "@/inngest/functions/migrations/orchestrate-hardcoded-math-differentiated-item-generation" // 🛑 RENAMED
// ✅ RENAMED & ADDED: Import all hardcoded migration functions
import { orchestrateHardcodedMathItemMigration } from "@/inngest/functions/migrations/orchestrate-hardcoded-math-item-migration"
import { orchestrateHardcodedMathOnerosterIngestion } from "@/inngest/functions/migrations/orchestrate-hardcoded-math-oneroster-ingestion"
import { orchestrateHardcodedMathQAReview } from "@/inngest/functions/migrations/orchestrate-hardcoded-math-qa-review"
import { orchestrateHardcodedMathQtiGenerateUndifferentiated } from "@/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated"
import { orchestrateHardcodedMathQtiUpload } from "@/inngest/functions/migrations/orchestrate-hardcoded-math-qti-upload"
import { orchestrateHardcodedMathStimulusGeneration } from "@/inngest/functions/migrations/orchestrate-hardcoded-math-stimulus-generation" // 🛑 RENAMED
import { orchestrateHardcodedMathStimulusMigration } from "@/inngest/functions/migrations/orchestrate-hardcoded-math-stimulus-migration"
import { orchestrateHardcodedScienceItemMigration } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-item-migration"
import { orchestrateHardcodedScienceOnerosterIngestion } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-oneroster-ingestion"
import { orchestrateHardcodedScienceQAReview } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-qa-review"
import { orchestrateHardcodedScienceQtiGenerateUndifferentiated } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated"
import { orchestrateHardcodedScienceQtiUpload } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-qti-upload"
import { orchestrateHardcodedScienceStimulusMigration } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-stimulus-migration"
import { orchestrateHardcodedScienceQtiBackup } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-qti-backup"
// Import OneRoster workers
import { generatePayloadForCourse as generateOnerosterPayloadForCourse } from "@/inngest/functions/oneroster/generate-payload-for-course"
import { ingestAssessmentLineItems } from "@/inngest/functions/oneroster/ingest-assessment-line-items"
import { ingestClass } from "@/inngest/functions/oneroster/ingest-class"
import { ingestComponentResourceOne } from "@/inngest/functions/oneroster/ingest-component-resource-one"
import { ingestCourse } from "@/inngest/functions/oneroster/ingest-course"
import { ingestCourseComponents } from "@/inngest/functions/oneroster/ingest-course-components"
import { ingestResourceOne } from "@/inngest/functions/oneroster/ingest-resource-one"
// ✅ ADD: Import the new batch orchestration function
// Removed generic batch and course ingestion orchestrators
// Import orchestrators
import { orchestrateCourseOnerosterGeneration } from "@/inngest/functions/orchestrate-course-oneroster-generation"
// Removed: orchestrateCourseXmlGeneration (generic course QTI generation)
import { orchestrateCourseUploadToOneroster } from "@/inngest/functions/orchestrate-course-upload-to-oneroster"
import { orchestrateCourseUploadToQti } from "@/inngest/functions/orchestrate-course-upload-to-qti"
import { orchestrateCourseVisualQAReview } from "@/inngest/functions/qa/orchestrate-course-visual-qa-review"
// Import Visual QA workers
import { orchestrateVisualQAReview } from "@/inngest/functions/qa/orchestrate-visual-qa-review"
import { reviewQuestionRendering } from "@/inngest/functions/qa/review-question-rendering"
import { reverseEngineerWidgetFromSvg, reverseEngineerBatchFromDatabase } from "@/inngest/functions/qa/reverse-engineer-widget-from-svg"
import { orchestrateWidgetReverseEngineering } from "@/inngest/functions/qa/orchestrate-widget-reverse-engineering"
import { reverseEngineerSvgToWidget } from "@/inngest/functions/qa/reverse-engineer-svg-to-widget"
import { extractAndProcessQtiSvgs } from "@/inngest/functions/qa/extract-and-process-qti-svgs"
import { testPerseusTextarea } from "@/inngest/functions/qa/test-perseus-textarea"
// ✅ ADD: Import the new batch differentiation and assembly functions
import { assembleDifferentiatedItemsAndCreateTests } from "@/inngest/functions/qti/assemble-differentiated-items-and-create-tests"
import { backfillItemsAndStimuli } from "@/inngest/functions/qti/backfill-items-and-stimuli"
import { backfillStimuliOnly } from "@/inngest/functions/qti/backfill-stimuli"
import { convertPerseusArticleToQtiStimulus } from "@/inngest/functions/qti/convert-perseus-article-to-qti-stimulus"
import { convertPerseusQuestionToDifferentiatedQtiItems } from "@/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items"
import { convertPerseusQuestionToQtiItem } from "@/inngest/functions/qti/convert-perseus-question-to-qti-item"
import { differentiateAndSaveQuestion } from "@/inngest/functions/qti/differentiate-and-save-question"
import { ingestAssessmentItemOne } from "@/inngest/functions/qti/ingest-assessment-item-one"
import { ingestAssessmentStimulusOne } from "@/inngest/functions/qti/ingest-assessment-stimulus-one"
import { ingestAssessmentTestOne } from "@/inngest/functions/qti/ingest-assessment-test-one"
// Removed generic undifferentiated and differentiated ingest orchestrators
// ✅ ADD: Import the new paraphrase function
import { paraphraseStimulus } from "@/inngest/functions/qti/paraphrase-stimulus"
import { requestAllItemMigrationsForCourse } from "@/inngest/functions/qti/request-all-item-migrations-for-course"
import { requestAllStimulusMigrationsForCourse } from "@/inngest/functions/qti/request-all-stimulus-migrations-for-course"
// ✅ ADD: Import the new validation function
// Removed dangerous validator to prevent accidental runs

// Create and export the Inngest HTTP handler
export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		helloWorld,
		// Orchestrators
		orchestrateCourseOnerosterGeneration,
		orchestrateCourseUploadToOneroster,
		// Removed: generic ingestion orchestrators
		// Removed: orchestrateCourseXmlGeneration
		orchestrateCourseUploadToQti,
		// ✅ ADDED: Register all new and renamed functions
		orchestrateHardcodedMathItemMigration,
		orchestrateHardcodedMathStimulusMigration,
		orchestrateHardcodedMathOnerosterIngestion,
		orchestrateHardcodedMathDifferentiatedItemGeneration, // 🛑 RENAMED
		orchestrateHardcodedMathStimulusGeneration, // 🛑 RENAMED
		orchestrateHardcodedMathQtiGenerateUndifferentiated,
		orchestrateHardcodedMathQtiUpload,
		orchestrateHardcodedScienceItemMigration,
		orchestrateHardcodedScienceStimulusMigration,
		orchestrateHardcodedScienceOnerosterIngestion,
		orchestrateHardcodedScienceQtiGenerateUndifferentiated,
		orchestrateHardcodedScienceQtiUpload,
		orchestrateHardcodedScienceQtiBackup,
		orchestrateHardcodedScienceQAReview,
		orchestrateHardcodedMathQAReview,
		orchestrateHardcodedHistoryQAReview,
		// History orchestrators
		orchestrateHardcodedHistoryItemMigration,
		orchestrateHardcodedHistoryStimulusMigration,
		orchestrateHardcodedHistoryOnerosterIngestion,
		orchestrateHardcodedHistoryQtiGenerateUndifferentiated,
		orchestrateHardcodedHistoryQtiUpload,
		// ❌ REMOVED: Obsolete undifferentiated math qti generation
		// orchestrateHardcodedMathQtiGenerateUndifferentiated,
		// ✅ REMOVED: Old differentiated ingest is no longer registered.
		// differentiatedIngest,
		// OneRoster Functions
		generateOnerosterPayloadForCourse,
		ingestClass,
		ingestComponentResourceOne,
		ingestCourse,
		ingestCourseComponents,
		ingestResourceOne,
		ingestAssessmentLineItems,
		// QTI Functions
		clearAllAssessmentItemData,
		backfillItemsAndStimuli,
		backfillStimuliOnly,
		convertPerseusArticleToQtiStimulus,
		convertPerseusQuestionToQtiItem,
		convertPerseusQuestionToDifferentiatedQtiItems,
		requestAllItemMigrationsForCourse,
		requestAllStimulusMigrationsForCourse,
		ingestAssessmentItemOne,
		ingestAssessmentStimulusOne,
		ingestAssessmentTestOne,
		// ✅ ADD: Register the new paraphrase function
		paraphraseStimulus,
		// Removed: undifferentiated ingest
		// ✅ ADD: Register the new atomic differentiation and assembly functions
		differentiateAndSaveQuestion, // ✅ ADD: Register the new atomic differentiation function
		assembleDifferentiatedItemsAndCreateTests,
		// Visual QA Functions
		orchestrateVisualQAReview,
		orchestrateCourseVisualQAReview,
		reviewQuestionRendering,
		reverseEngineerWidgetFromSvg,
		reverseEngineerBatchFromDatabase,
		orchestrateWidgetReverseEngineering,
		reverseEngineerSvgToWidget,
		extractAndProcessQtiSvgs,
		testPerseusTextarea
	]
})
