import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
// Import QTI workers
import { clearAllAssessmentItemData } from "@/inngest/functions/clear-all-assessment-item-data"
import { helloWorld } from "@/inngest/functions/hello"
import { orchestrateHardcodedHistoryItemMigration } from "@/inngest/functions/migrations/orchestrate-hardcoded-history-item-migration"
import { orchestrateHardcodedHistoryOnerosterIngestion } from "@/inngest/functions/migrations/orchestrate-hardcoded-history-oneroster-ingestion"
import { orchestrateHardcodedHistoryQAReview } from "@/inngest/functions/migrations/orchestrate-hardcoded-history-qa-review"
import { orchestrateAllHardcodedOnerosterIngestion } from "@/inngest/functions/migrations/orchestrate-all-hardcoded-oneroster-ingestion"
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
import { orchestrateHardcodedScienceQtiBackup } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-qti-backup"
import { orchestrateHardcodedScienceQtiGenerateUndifferentiated } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated"
import { orchestrateHardcodedScienceQtiUpload } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-qti-upload"
import { orchestrateHardcodedScienceStimulusMigration } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-stimulus-migration"
import { orchestrateHardcodedScienceAssessmentLineItemUpload } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload"
import { orchestrateHardcodedArticleSlugsStimulusMigration } from "@/inngest/functions/migrations/orchestrate-hardcoded-article-slugs-stimulus-migration"
// Import OneRoster workers
import { generatePayloadForCourse as generateOnerosterPayloadForCourse } from "@/inngest/functions/oneroster/generate-payload-for-course"
import { ingestAllCourses } from "@/inngest/functions/oneroster/ingest-all-courses"
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
import { orchestrateCourseUploadToOnerosterBySlug } from "@/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug"
import { orchestrateCourseUploadToQti } from "@/inngest/functions/orchestrate-course-upload-to-qti"
import { orchestrateCourseUploadToQtiBySlug } from "@/inngest/functions/orchestrate-course-upload-to-qti-by-slug"
import { extractAndProcessQtiSvgs } from "@/inngest/functions/qa/extract-and-process-qti-svgs"
import { orchestrateCourseVisualQAReview } from "@/inngest/functions/qa/orchestrate-course-visual-qa-review"
// Import Visual QA workers
import { orchestrateVisualQAReview } from "@/inngest/functions/qa/orchestrate-visual-qa-review"
import { orchestrateWidgetReverseEngineering } from "@/inngest/functions/qa/orchestrate-widget-reverse-engineering"
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
import { requestAllItemMigrationsForCourse } from "@/inngest/functions/qti/request-all-item-migrations-for-course"
import { requestAllStimulusMigrationsForCourse } from "@/inngest/functions/qti/request-all-stimulus-migrations-for-course"
import { requestItemMigrationsForExercise } from "@/inngest/functions/qti/request-item-migrations-for-exercise"
import { orchestrateHardcodedExerciseSlugsItemMigration } from "@/inngest/functions/migrations/orchestrate-hardcoded-exercise-slugs-item-migration"
import { orchestrateHardcodedSlugQtiGenerationAndUpload } from "@/inngest/functions/migrations/orchestrate-hardcoded-slug-qti-generation-and-upload"
// ✅ ADD: Import the new validation function
// Removed dangerous validator to prevent accidental runs
import { standardizeQtiQuestionPhrasing } from "@/inngest/functions/standardize-qti-question-phrasing"
import { standardizeQtiTestPhrasing } from "@/inngest/functions/standardize-qti-test-phrasing"
import { courseBuilderWorkflow } from "@/inngest/functions/course-builder-workflow"
import { fetchCourseBuilderInputs } from "@/inngest/functions/course-builder/fetch-inputs"
import { generatePlanAndBuildPayload } from "@/inngest/functions/course-builder/generate-and-build"
import { uploadCourseAndEnroll } from "@/inngest/functions/course-builder/upload-and-enroll"

// Create and export the Inngest HTTP handler
export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		helloWorld,
		// Orchestrators
		orchestrateCourseOnerosterGeneration,
		orchestrateCourseUploadToOneroster,
		orchestrateCourseUploadToOnerosterBySlug,
		// Removed: generic ingestion orchestrators
		// Removed: orchestrateCourseXmlGeneration
		orchestrateCourseUploadToQti,
		orchestrateCourseUploadToQtiBySlug,
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
		orchestrateHardcodedScienceAssessmentLineItemUpload,
		orchestrateHardcodedArticleSlugsStimulusMigration,
		orchestrateHardcodedMathQAReview,
		orchestrateHardcodedHistoryQAReview,
		// History orchestrators
		orchestrateHardcodedHistoryItemMigration,
		orchestrateHardcodedHistoryStimulusMigration,
		orchestrateHardcodedHistoryOnerosterIngestion,
		orchestrateHardcodedHistoryQtiGenerateUndifferentiated,
		orchestrateHardcodedHistoryQtiUpload,
		// All hardcoded courses orchestrator
		orchestrateAllHardcodedOnerosterIngestion,
		// ❌ REMOVED: Obsolete undifferentiated math qti generation
		// orchestrateHardcodedMathQtiGenerateUndifferentiated,
		// ✅ REMOVED: Old differentiated ingest is no longer registered.
		// differentiatedIngest,
		// OneRoster Functions
		generateOnerosterPayloadForCourse,
		ingestAllCourses,
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
		requestItemMigrationsForExercise,
		orchestrateHardcodedExerciseSlugsItemMigration,
		orchestrateHardcodedSlugQtiGenerationAndUpload,
		ingestAssessmentItemOne,
		ingestAssessmentStimulusOne,
		ingestAssessmentTestOne,
		// Removed: undifferentiated ingest
		// ✅ ADD: Register the new atomic differentiation and assembly functions
		differentiateAndSaveQuestion, // ✅ ADD: Register the new atomic differentiation function
		assembleDifferentiatedItemsAndCreateTests,
		// Visual QA Functions
		orchestrateVisualQAReview,
		orchestrateCourseVisualQAReview,
		orchestrateWidgetReverseEngineering,
		extractAndProcessQtiSvgs,
		testPerseusTextarea,
		// QTI Standardization Functions
		standardizeQtiTestPhrasing,
		standardizeQtiQuestionPhrasing
	,
		// Course Builder: step workers and orchestrator
		fetchCourseBuilderInputs,
		generatePlanAndBuildPayload,
		uploadCourseAndEnroll,
		courseBuilderWorkflow
	]
})
