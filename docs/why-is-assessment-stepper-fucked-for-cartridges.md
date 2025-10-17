## User

can you investigate how exactly our assessment stepper works? look at the code, look at the server side progress redis stepper, and explore exactly WHAT does it write when you complete a quiz or exercise to the oneroster backend? how does it plumb any metadata or the sourceid form the sourcedId for the oneroster resource like the quiz and how does it use this value to ultimately derive where to write the assessment test results back to the oneroster database after the quiz has been finalized? can you deeply explore how this part of the codebase works?

## Assistant

<thinking>


**Preparing to inspect codebase**
</thinking>

**Tool Call: List /Users/bjorn/Documents/Code/nice**
Status: Completed

```sh
LICENSE
README.md
biome.json
bun.lock
components.json
course-cartridge-master-plan.md
course-cartridge-v1.tar.zst
data
docs
drizzle.config.ts
examples
export
gritql
next-env.d.ts
next.config.js
node_modules
oneroster.log.txt
package.json
postcss.config.js
prd.md
prompt
public
qti.log.txt
rules
scripts
src
tests
tsconfig.json
tsconfig.tsbuildinfo
vercel.json
yek.yaml
```


## Assistant

<thinking>


**Outlining plan to explore AssessmentStepper and related code**

**Considering planning approach**
</thinking>

**Tool Call: Search assessment in src**
Status: Completed

```sh
src/lib/powerpath-progress.ts:	assessmentLineItemSourcedId?: string
src/lib/powerpath-progress.ts:				assessmentLineItemSourcedId: item.assessmentLineItemSourcedId
src/inngest/events/qti.ts:// @superbuilders/qti-assessment-item-generator library being installed.
src/inngest/events/qti.ts:// Standardizes simplified fraction and scientific notation phrasing across a QTI assessment test.
src/lib/proficiency/core.ts:	/** The type of the assessment (e.g., "unittest", "coursechallenge"). */
src/lib/proficiency/core.ts: * Calculates a new proficiency score based on performance, assessment type, and current score.
src/db/schemas/nice.ts: * 2.  Explicit Ordering: All hierarchical content (units, lessons, assessments) includes
src/db/schemas/nice.ts:const assessmentTypeEnum = schema.enum("assessment_type_enum", ["Quiz", "UnitTest", "CourseChallenge"])
src/db/schemas/nice.ts:export { assessmentTypeEnum as niceAssessmentTypeEnum }
src/db/schemas/nice.ts:const assessmentParentTypeEnum = schema.enum("assessment_parent_type_enum", ["Unit", "Course"])
src/db/schemas/nice.ts:export { assessmentParentTypeEnum as niceAssessmentParentTypeEnum }
src/db/schemas/nice.ts:const assessments = schema.table(
src/db/schemas/nice.ts:	"assessments",
src/db/schemas/nice.ts:		type: assessmentTypeEnum("type").notNull(),
src/db/schemas/nice.ts:		parentType: assessmentParentTypeEnum("parent_type").notNull(),
src/db/schemas/nice.ts:		index("assessments_path_idx").on(table.path),
src/db/schemas/nice.ts:		index("assessments_parent_type_idx").on(table.parentId, table.type),
src/db/schemas/nice.ts:export { assessments as niceAssessments }
src/db/schemas/nice.ts:const assessmentExercises = schema.table(
src/db/schemas/nice.ts:	"assessment_exercises",
src/db/schemas/nice.ts:		assessmentId: text("assessment_id").notNull(),
src/db/schemas/nice.ts:		primaryKey({ columns: [table.assessmentId, table.exerciseId] }),
src/db/schemas/nice.ts:		index("ae_assessment_id_idx").on(table.assessmentId),
src/db/schemas/nice.ts:			name: "ae_assessment_fk",
src/db/schemas/nice.ts:			columns: [table.assessmentId],
src/db/schemas/nice.ts:			foreignColumns: [assessments.id]
src/db/schemas/nice.ts:export { assessmentExercises as niceAssessmentExercises }
src/lib/khan-academy-api.ts:			// ADD: Include schemas for container assessments
src/lib/khan-academy-api.ts:		assessmentItem: z.object({
src/lib/khan-academy-api.ts:					"mutation getOrCreatePracticeTask($input: GetOrCreatePracticeTaskInput!, $ancestorIds: [String!]!) {\n  getOrCreatePracticeTask(input: $input) {\n    result {\n      error {\n        code\n        debugMessage\n        __typename\n      }\n      userTask {\n        cards {\n          ...problemCardFields\n          __typename\n        }\n        task {\n          ...practiceTaskFields\n          __typename\n        }\n        userExercises {\n          ...userExerciseFields\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment practiceTaskFields on PracticeTask {\n  id\n  key\n  bonusReservedItems\n  bonusReservedItemsCompleted\n  bonusTaskAttemptHistory {\n    ...taskAttemptHistoryFields\n    __typename\n  }\n  canRestart\n  completionCriteria {\n    name\n    __typename\n  }\n  contentKey\n  exerciseLength\n  isCompleted\n  pointBounty\n  pointsEarned\n  promotionCriteria {\n    ...promotionCriteriaFields\n    __typename\n  }\n  reservedItems\n  reservedItemsCompleted\n  slug\n  taskAttemptHistory {\n    ...taskAttemptHistoryFields\n    __typename\n  }\n  taskType\n  timeEstimate {\n    lowerBound\n    upperBound\n    __typename\n  }\n  __typename\n}\n\nfragment problemCardFields on ProblemCard {\n  cardType\n  done\n  exerciseName\n  problemType\n  __typename\n}\n\nfragment problemTypeFields on ProblemType {\n  items {\n    id\n    live\n    sha\n    __typename\n  }\n  name\n  relatedVideos\n  __typename\n}\n\nfragment promotionCriteriaFields on PromotionCriteria {\n  name\n  value\n  __typename\n}\n\nfragment taskAttemptHistoryFields on TaskProblemAttempt {\n  correct\n  timeDone\n  seenHint\n  itemId\n  __typename\n}\n\nfragment userExerciseFields on UserExercise {\n  exerciseModel: exercise {\n    id\n    assessmentItemCount: numAssessmentItems\n    displayName\n    isQuiz\n    isSkillCheck\n    name\n    nodeSlug\n    progressKey\n    translatedDisplayName\n    relatedContent {\n      id\n      contentKind\n      kind\n      thumbnailUrl\n      translatedTitle\n      urlWithinCurationNode\n      urlWithinClosestAncestor(ancestorIds: $ancestorIds)\n      topicPaths {\n        path {\n          id\n          kind\n          slug\n          __typename\n        }\n        __typename\n      }\n      ... on Article {\n        kaUrl\n        nodeSlug\n        relativeUrl\n        slug\n        __typename\n      }\n      ... on Video {\n        duration\n        imageUrl\n        kaUrl\n        nodeSlug\n        relativeUrl\n        slug\n        translatedYoutubeId\n        __typename\n      }\n      __typename\n    }\n    relatedVideos {\n      contentKind\n      duration\n      id\n      imageUrl\n      kaUrl\n      kind\n      nodeSlug\n      progressKey\n      relativeUrl\n      slug\n      thumbnailUrl\n      translatedDescription\n      translatedTitle\n      translatedYoutubeId\n      __typename\n    }\n    problemTypes {\n      ...problemTypeFields\n      __typename\n    }\n    translatedProblemTypes {\n      ...problemTypeFields\n      __typename\n    }\n    __typename\n  }\n  exercise: exerciseName\n  fpmMasteryLevel\n  lastAttemptNumber\n  lastCountHints\n  lastDone\n  lastMasteryUpdate\n  longestStreak\n  maximumExerciseProgressDt: maximumExerciseProgressDate\n  streak\n  totalCorrect\n  totalDone\n  __typename\n}"
src/lib/khan-academy-api.ts:	 * Fetches the content for a single assessment item (a question).
src/lib/khan-academy-api.ts:	 * sequential fetching for assessments (via `problemNumber`).
src/lib/khan-academy-api.ts:		logger.info("fetching assessment item", { input })
src/lib/khan-academy-api.ts:					"query getAssessmentItem($input: AssessmentItemInput!) {\n  assessmentItem(input: $input) {\n    item {\n      id\n      sha\n      problemType\n      itemData\n      isContextInaccessible\n      requiresScreenOrMouse\n      __typename\n    }\n    error {\n      code\n      debugMessage\n      __typename\n    }\n    __typename\n  }\n}"
src/lib/khan-academy-api.ts:				logger.warn("unit was processed but yielded no lessons or assessments", {
src/db/scripts/seed.ts:const assessmentInsertSchema = createInsertSchema(schema.niceAssessments)
src/db/scripts/seed.ts:const assessmentExerciseInsertSchema = createInsertSchema(schema.niceAssessmentExercises)
src/db/scripts/seed.ts:	const assessmentsMap = new Map<string, InsertAssessment>()
src/db/scripts/seed.ts:	const assessmentExercisesMap = new Map<string, InsertAssessmentExercise>()
src/db/scripts/seed.ts:						!assessmentsMap.has(unitChild.id)
src/db/scripts/seed.ts:						assessmentsMap.set(unitChild.id, {
src/db/scripts/seed.ts:							if (!assessmentExercisesMap.has(key)) {
src/db/scripts/seed.ts:								assessmentExercisesMap.set(key, { assessmentId: unitChild.id, exerciseId })
src/db/scripts/seed.ts:				!assessmentsMap.has(child.id)
src/db/scripts/seed.ts:				assessmentsMap.set(child.id, {
src/db/scripts/seed.ts:					if (!assessmentExercisesMap.has(key)) {
src/db/scripts/seed.ts:						assessmentExercisesMap.set(key, { assessmentId: child.id, exerciseId })
src/db/scripts/seed.ts:	const assessmentsToInsert: InsertAssessment[] = []
src/db/scripts/seed.ts:	for (const assessment of assessmentsMap.values()) {
src/db/scripts/seed.ts:		const validation = assessmentInsertSchema.safeParse(assessment)
src/db/scripts/seed.ts:			assessmentsToInsert.push(validation.data)
src/db/scripts/seed.ts:			logger.error("invalid assessment data", {
src/db/scripts/seed.ts:				assessmentId: assessment.id,
src/db/scripts/seed.ts:				title: assessment.title,
src/db/scripts/seed.ts:			throw errors.wrap(validation.error, "assessment data validation")
src/db/scripts/seed.ts:	if (assessmentsToInsert.length > 0 && shouldSeed("assessments")) {
src/db/scripts/seed.ts:		logger.info("seeding assessments", { total: assessmentsToInsert.length, batchSize: BATCH_SIZE })
src/db/scripts/seed.ts:		for (let i = 0; i < assessmentsToInsert.length; i += BATCH_SIZE) {
src/db/scripts/seed.ts:			const batch = assessmentsToInsert.slice(i, i + BATCH_SIZE)
src/db/scripts/seed.ts:			logger.debug("inserting assessment batch", { batch: i / BATCH_SIZE + 1, count: batch.length })
src/db/scripts/seed.ts:				logger.error("failed to insert assessment batch, retrying one-by-one", {
src/db/scripts/seed.ts:						logger.error("failed to insert single assessment record", {
src/db/scripts/seed.ts:	const assessmentExercisesToInsert: InsertAssessmentExercise[] = []
src/db/scripts/seed.ts:	for (const assessmentExercise of assessmentExercisesMap.values()) {
src/db/scripts/seed.ts:		const validation = assessmentExerciseInsertSchema.safeParse(assessmentExercise)
src/db/scripts/seed.ts:			assessmentExercisesToInsert.push(validation.data)
src/db/scripts/seed.ts:			logger.error("invalid assessment exercise data", {
src/db/scripts/seed.ts:				assessmentId: assessmentExercise.assessmentId,
src/db/scripts/seed.ts:				exerciseId: assessmentExercise.exerciseId,
src/db/scripts/seed.ts:			throw errors.wrap(validation.error, "assessment exercise data validation")
src/db/scripts/seed.ts:	if (assessmentExercisesToInsert.length > 0 && shouldSeed("assessmentExercises")) {
src/db/scripts/seed.ts:		logger.info("seeding assessment exercises", { total: assessmentExercisesToInsert.length, batchSize: BATCH_SIZE })
src/db/scripts/seed.ts:		for (let i = 0; i < assessmentExercisesToInsert.length; i += BATCH_SIZE) {
src/db/scripts/seed.ts:			const batch = assessmentExercisesToInsert.slice(i, i + BATCH_SIZE)
src/db/scripts/seed.ts:			logger.debug("inserting assessment exercise batch", { batch: i / BATCH_SIZE + 1, count: batch.length })
src/db/scripts/seed.ts:				logger.error("failed to insert assessment exercise batch, retrying one-by-one", {
src/db/scripts/seed.ts:						logger.error("failed to insert single assessment exercise record", {
src/db/scripts/seed.ts:		logger.info("skipping assessment exercises due to --only filter", { skipped: assessmentExercisesToInsert.length })
src/inngest/client.ts:	// ADD: New event for generating 'n' differentiated versions of a single assessment item.
src/inngest/client.ts:	// ✅ ADDED: New, more specific event for clearing only assessment item data.
src/inngest/client.ts:	"qti/database.clear-assessment-item-data": {
src/inngest/client.ts:	"qti/assessment-item.ingest.one": {
src/inngest/client.ts:	"qti/assessment-stimulus.ingest.one": {
src/inngest/client.ts:	"qti/assessment-test.ingest.one": {
src/inngest/client.ts:	"qti/assessment-items.ingest": {
src/inngest/client.ts:	"qti/assessment-stimuli.ingest": {
src/inngest/client.ts:	"qti/assessment-tests.ingest": {
src/inngest/client.ts:	"oneroster/assessment-line-items.ingest": {
src/inngest/client.ts:			assessmentLineItems: z.array(
src/inngest/client.ts:							type: z.literal("assessmentLineItem")
src/inngest/client.ts:	"migration/hardcoded.science.assessmentLineItem.upload": {
src/lib/payloads/oneroster/supplementary-builder.ts:	assessmentLineItems: OneRosterAssessmentLineItem[]
src/lib/payloads/oneroster/supplementary-builder.ts:		assessmentLineItems: []
src/lib/payloads/oneroster/supplementary-builder.ts:					// Add assessment line item for videos (including YT Videos)
src/lib/payloads/oneroster/supplementary-builder.ts:						payload.assessmentLineItems.push({
src/lib/payloads/oneroster/supplementary-builder.ts:					// Add assessment line item for exercises
src/lib/payloads/oneroster/supplementary-builder.ts:						payload.assessmentLineItems.push({
src/app/debug/qti-test/page.tsx:  const [qtiUrl, setQtiUrl] = React.useState("https://qti.alpha-1edtech.com/api/assessment-tests/nice_xeea483e9835f1f34/questions")
src/app/debug/qti-test/page.tsx:            placeholder="Enter QTI assessment-tests API URL..."
src/lib/qti.ts: * A stimulus provides context (e.g., a reading passage, image, video) for one or more assessment items.
src/lib/qti.ts: * Schema for an assessment test, the top-level container for a test.
src/lib/qti.ts: * Input for searching for assessment tests.
src/lib/qti.ts: * Response schema for a search assessment tests request, including pagination.
src/lib/qti.ts:	assessmentTest: z.string(),
src/lib/qti.ts: * Manages OAuth2 authentication and provides methods for all assessment item operations.
src/lib/qti.ts:	 * @param {string} endpoint - The API endpoint to request (e.g., "/assessment-items").
src/lib/qti.ts:			const envelopeKeys = ["assessmentItem", "assessmentTest", "stimulus"] as const
src/lib/qti.ts:		entityName: "stimulus" | "assessmentItem" | "assessmentTest" | "testPart" | "section",
src/lib/qti.ts:		logger.info("qti client: creating assessment item")
src/lib/qti.ts:			"assessmentItem",
src/lib/qti.ts:			"/assessment-items",
src/lib/qti.ts:		logger.info("qti client: getting assessment item", { identifier })
src/lib/qti.ts:		return this.#request(`/assessment-items/${identifier}`, { method: "GET" }, AssessmentItemSchema)
src/lib/qti.ts:		logger.info("qti client: updating assessment item", { identifier: input.identifier })
src/lib/qti.ts:			`/assessment-items/${identifier}`,
src/lib/qti.ts:		logger.info("qti client: deleting assessment item", { identifier })
src/lib/qti.ts:		await this.#request(`/assessment-items/${identifier}`, { method: "DELETE" }, z.null())
src/lib/qti.ts:		logger.info("qti client: searching assessment items", { input })
src/lib/qti.ts:		const endpoint = `/assessment-items?${params.toString()}`
src/lib/qti.ts:	 * Creates a new assessment test from a raw XML payload.
src/lib/qti.ts:	 * @param {string} xml - The raw QTI XML string for the assessment test.
src/lib/qti.ts:	 * @returns {Promise<AssessmentTest>} The created assessment test object.
src/lib/qti.ts:		logger.info("qti client: creating assessment test from XML")
src/lib/qti.ts:			"/assessment-tests",
src/lib/qti.ts:	 * Retrieves a specific assessment test by its identifier.
src/lib/qti.ts:	 * @returns {Promise<AssessmentTest>} The assessment test object.
src/lib/qti.ts:		logger.info("qti client: getting assessment test", { identifier })
src/lib/qti.ts:		return this.#request(`/assessment-tests/${identifier}`, { method: "GET" }, AssessmentTestSchema)
src/lib/qti.ts:	 * Updates an existing assessment test from a raw XML payload.
src/lib/qti.ts:	 * @param {string} xml - The new raw QTI XML for the assessment test.
src/lib/qti.ts:	 * @returns {Promise<AssessmentTest>} The updated assessment test object.
src/lib/qti.ts:		logger.info("qti client: updating assessment test from XML", { identifier })
src/lib/qti.ts:			`/assessment-tests/${identifier}`,
src/lib/qti.ts:	 * Deletes an assessment test.
src/lib/qti.ts:		logger.info("qti client: deleting assessment test", { identifier })
src/lib/qti.ts:		await this.#request(`/assessment-tests/${identifier}`, { method: "DELETE" }, z.null())
src/lib/qti.ts:	 * Searches for assessment tests based on a set of criteria.
src/lib/qti.ts:		logger.info("qti client: searching assessment tests", { input })
src/lib/qti.ts:		const endpoint = `/assessment-tests?${params.toString()}`
src/lib/qti.ts:	 * Processes a user's response for a given assessment item and returns the result.
src/lib/qti.ts:	 * @param {string} identifier - The unique identifier of the assessment item.
src/lib/qti.ts:		const endpoint = `/assessment-items/${identifier}/process-response`
src/components/practice/assessment-stepper.tsx:import { AssessmentBottomNav, type AssessmentType } from "@/components/practice/assessment-bottom-nav"
src/components/practice/assessment-stepper.tsx:import { AssessmentLoadingSkeleton } from "@/components/practice/assessment-loading-skeleton"
src/components/practice/assessment-stepper.tsx:} from "@/lib/actions/assessment"
src/components/practice/assessment-stepper.tsx:import type { AssessmentState } from "@/lib/assessment-cache"
src/components/practice/assessment-stepper.tsx:	assessmentTitle,
src/components/practice/assessment-stepper.tsx:	assessmentTitle: string
src/components/practice/assessment-stepper.tsx:				<h1 className="text-2xl font-bold text-gray-900">{assessmentTitle}</h1>
src/components/practice/assessment-stepper.tsx:					// Reset the entire assessment to try again
src/components/practice/assessment-stepper.tsx:	onerosterResourceSourcedId: string // The OneRoster resource sourcedId - used for OneRoster assessment results
src/components/practice/assessment-stepper.tsx:	assessmentTitle: string
src/components/practice/assessment-stepper.tsx:	assessmentPath: string // The canonical URL path for this assessment
src/components/practice/assessment-stepper.tsx:	assessmentTitle,
src/components/practice/assessment-stepper.tsx:	assessmentPath,
src/components/practice/assessment-stepper.tsx:	const assessmentStartTimeRef = React.useRef<Date | null>(null)
src/components/practice/assessment-stepper.tsx:	 * Initializes and synchronizes the assessment state with the server.
src/components/practice/assessment-stepper.tsx:	 * - This effect is responsible for fetching the server-side assessment state on mount
src/components/practice/assessment-stepper.tsx:	 * - The assessment's identity is tied to `onerosterResourceSourcedId`, which is sufficient
src/components/practice/assessment-stepper.tsx:	 *   to trigger a re-fetch when the assessment itself changes
src/components/practice/assessment-stepper.tsx:				toast.error("Could not load assessment after retries.")
src/components/practice/assessment-stepper.tsx:				toast.error(`Could not complete assessment: ${state.finalizationError}`)
src/components/practice/assessment-stepper.tsx:						assessmentTitle,
src/components/practice/assessment-stepper.tsx:						assessmentPath,
src/components/practice/assessment-stepper.tsx:					toast.error("Failed to complete assessment. Retry or contact support.")
src/components/practice/assessment-stepper.tsx:			// Handle already-finalized assessment on refresh
src/components/practice/assessment-stepper.tsx:		assessmentPath,
src/components/practice/assessment-stepper.tsx:		assessmentTitle,
src/components/practice/assessment-stepper.tsx:	// Interactive assessments include Exercises as well
src/components/practice/assessment-stepper.tsx:	// Ensure attempt is initialized for all assessments (now always interactive)
src/components/practice/assessment-stepper.tsx:	// Record start time when assessment begins
src/components/practice/assessment-stepper.tsx:		if (!assessmentStartTimeRef.current && questions.length > 0) {
src/components/practice/assessment-stepper.tsx:			assessmentStartTimeRef.current = new Date()
src/components/practice/assessment-stepper.tsx:			// Find the index of the current assessment within this flattened list.
src/components/practice/assessment-stepper.tsx:				<p>Failed to load assessment. Please try again or contact support if the issue persists.</p>
src/components/practice/assessment-stepper.tsx:		 * Calculate the percentage score for the assessment summary.
src/components/practice/assessment-stepper.tsx:				assessmentTitle={assessmentTitle}
src/components/practice/assessment-stepper.tsx:		// First, check if the assessment is complete. This prevents updating
src/components/practice/assessment-stepper.tsx:					assessmentTitle,
src/components/practice/assessment-stepper.tsx:					assessmentPath,
src/components/practice/assessment-stepper.tsx:			const currentSlug = (assessmentPath || "").split("/").pop()
src/components/practice/assessment-stepper.tsx:					assessmentTitle,
src/components/practice/assessment-stepper.tsx:					assessmentPath,
src/components/practice/assessment-stepper.tsx:			const currentSlug = (assessmentPath || "").split("/").pop()
src/components/practice/assessment-stepper.tsx:	 *   2. Atomically updates the assessment state in Redis to mark the question as `isReported: true`
src/components/practice/assessment-stepper.tsx:						assessmentTitle,
src/components/practice/assessment-stepper.tsx:						assessmentPath,
src/components/practice/assessment-stepper.tsx:				const currentSlug = (assessmentPath || "").split("/").pop()
src/components/practice/assessment-stepper.tsx:						{assessmentTitle}
src/components/practice/assessment-stepper.tsx:							materialType="assessmentItem"
src/lib/assessment-cache.ts:export const ErrAssessmentStateNotFound = errors.new("assessment state not found")
src/lib/assessment-cache.ts:export const ErrRedisUnavailable = errors.new("assessment service unavailable")
src/lib/assessment-cache.ts:function getCacheKey(userId: string, assessmentId: string, attemptNumber: number): string {
src/lib/assessment-cache.ts:	// Key Schema: assess:state:{userId}:{assessmentId}:{attempt}
src/lib/assessment-cache.ts:	return `assess:state:${userId}:${assessmentId}:${attemptNumber}`
src/lib/assessment-cache.ts:function getQuestionsHashKey(userId: string, assessmentId: string, attemptNumber: number): string {
src/lib/assessment-cache.ts:	// Key Schema: assess:questions:{userId}:{assessmentId}:{attempt}
src/lib/assessment-cache.ts:	return `assess:questions:${userId}:${assessmentId}:${attemptNumber}`
src/lib/assessment-cache.ts:	assessmentId: string,
src/lib/assessment-cache.ts:	const key = getCacheKey(userId, assessmentId, attemptNumber)
src/lib/assessment-cache.ts:	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)
src/lib/assessment-cache.ts:		logger.error("failed to get assessment state from redis", { key, error: stateResult.error })
src/lib/assessment-cache.ts:		logger.error("failed to parse assessment state JSON", { error: parsedState.error })
src/lib/assessment-cache.ts:		throw errors.wrap(parsedState.error, "parse assessment state")
src/lib/assessment-cache.ts:		logger.error("invalid assessment state format", { error: stateValidation.error })
src/lib/assessment-cache.ts:		throw errors.wrap(stateValidation.error, "validate assessment state")
src/lib/assessment-cache.ts:		logger.error("failed to get assessment questions from redis", { questionsKey, error: questionsResult.error })
src/lib/assessment-cache.ts:	assessmentId: string,
src/lib/assessment-cache.ts:	const key = getCacheKey(userId, assessmentId, attemptNumber)
src/lib/assessment-cache.ts:	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)
src/lib/assessment-cache.ts:		logger.error("failed to create assessment state in redis", { key, error: result.error })
src/lib/assessment-cache.ts:	assessmentId: string,
src/lib/assessment-cache.ts:	const stateKey = getCacheKey(userId, assessmentId, attemptNumber)
src/lib/assessment-cache.ts:	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)
src/lib/assessment-cache.ts:			logger.error("assessment state not found for atomic update", { stateKey })
src/lib/assessment-cache.ts:			logger.error("failed to parse assessment state JSON for update", { error: parsedState.error })
src/lib/assessment-cache.ts:			throw errors.wrap(parsedState.error, "parse assessment state for update")
src/lib/assessment-cache.ts:			logger.error("invalid assessment state format for update", { error: stateValidation.error })
src/lib/assessment-cache.ts:			throw errors.wrap(stateValidation.error, "validate assessment state for update")
src/lib/assessment-cache.ts:	logger.error("failed to update assessment state due to concurrent modification after retries", { stateKey })
src/lib/assessment-cache.ts:	assessmentId: string,
src/lib/assessment-cache.ts:	const key = getCacheKey(userId, assessmentId, attemptNumber)
src/lib/assessment-cache.ts:	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)
src/lib/assessment-cache.ts:		logger.error("failed to get assessment state for finalization", { key, error: stateResult.error })
src/lib/assessment-cache.ts:		logger.warn("assessment state not found, cannot mark as finalized", { key })
src/lib/assessment-cache.ts:		logger.error("failed to parse assessment state JSON for finalization", { error: parsedState.error })
src/lib/assessment-cache.ts:		throw errors.wrap(parsedState.error, "parse assessment state for finalization")
src/lib/assessment-cache.ts:		logger.error("invalid assessment state format for finalization", { error: stateValidation.error })
src/lib/assessment-cache.ts:		throw errors.wrap(stateValidation.error, "validate assessment state for finalization")
src/lib/assessment-cache.ts:		logger.error("failed to mark assessment state as finalized in redis", { key, error: result.error })
src/lib/assessment-cache.ts:	logger.info("assessment state marked as finalized", { userId, assessmentId, attemptNumber })
src/lib/assessment-cache.ts:	assessmentId: string,
src/lib/assessment-cache.ts:	const stateKey = getCacheKey(userId, assessmentId, attemptNumber)
src/lib/assessment-cache.ts:	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)
src/lib/assessment-cache.ts:		logger.error("failed to delete assessment state from redis", { stateKey, questionsKey, error: result.error })
src/lib/assessment-cache.ts:	logger.info("assessment state deleted", { userId, assessmentId, attemptNumber })
src/lib/assessment-cache.ts:	assessmentId: string,
src/lib/assessment-cache.ts:	const key = getCacheKey(userId, assessmentId, attemptNumber)
src/lib/assessment-cache.ts:		logger.error("failed to get assessment state to mark as failed", { key, error: stateResult.error })
src/app/debug/qti-test/qti-fetcher.tsx:  assessmentTest: string
src/lib/payloads/oneroster/course.ts:	assessmentLineItems: OneRosterAssessmentLineItem[]
src/lib/payloads/oneroster/course.ts:	const assessments = unitIds.length
src/lib/payloads/oneroster/course.ts:	// ADDED: Fetch course-level assessments (Course Challenges)
src/lib/payloads/oneroster/course.ts:	// --- ADDED: Fetch assessment_exercises to build hierarchy ---
src/lib/payloads/oneroster/course.ts:	const allAssessmentIds = [...assessments.map((a) => a.id), ...courseAssessments.map((ca) => ca.id)]
src/lib/payloads/oneroster/course.ts:	const assessmentExercises = allAssessmentIds.length
src/lib/payloads/oneroster/course.ts:				where: inArray(schema.niceAssessmentExercises.assessmentId, allAssessmentIds)
src/lib/payloads/oneroster/course.ts:	for (const ae of assessmentExercises) {
src/lib/payloads/oneroster/course.ts:		if (!exercisesByAssessmentId.has(ae.assessmentId)) {
src/lib/payloads/oneroster/course.ts:			exercisesByAssessmentId.set(ae.assessmentId, [])
src/lib/payloads/oneroster/course.ts:		exercisesByAssessmentId.get(ae.assessmentId)?.push(ae.exerciseId)
src/lib/payloads/oneroster/course.ts:		...assessments.filter((a) => a.type === "Quiz"),
src/lib/payloads/oneroster/course.ts:	for (const [assessmentId, exerciseIds] of exercisesByAssessmentId.entries()) {
src/lib/payloads/oneroster/course.ts:		if (quizAssessmentIds.has(assessmentId)) {
src/lib/payloads/oneroster/course.ts:		assessmentLineItems: []
src/lib/payloads/oneroster/course.ts:		onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:		const unitTest = assessments.find((a) => a.parentId === unit.id && a.type === "UnitTest")
src/lib/payloads/oneroster/course.ts:			onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:		const unitQuizzes = assessments.filter((a) => a.parentId === unit.id && a.type === "Quiz")
src/lib/payloads/oneroster/course.ts:			onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:					onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:						onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:							onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:		const unitAssessments = assessments.filter((a) => a.parentId === unit.id).sort((a, b) => a.ordering - b.ordering)
src/lib/payloads/oneroster/course.ts:		for (const assessment of unitAssessments) {
src/lib/payloads/oneroster/course.ts:			const assessmentSourcedId = `nice_${assessment.id}`
src/lib/payloads/oneroster/course.ts:			if (!resourceSet.has(assessmentSourcedId)) {
src/lib/payloads/oneroster/course.ts:				let assessmentXp: number
src/lib/payloads/oneroster/course.ts:				if (assessment.type === "UnitTest") {
src/lib/payloads/oneroster/course.ts:					assessmentXp = UNIT_TEST_XP
src/lib/payloads/oneroster/course.ts:				} else if (assessment.type === "Quiz") {
src/lib/payloads/oneroster/course.ts:					assessmentXp = QUIZ_XP
src/lib/payloads/oneroster/course.ts:					// Fallback for other assessment types
src/lib/payloads/oneroster/course.ts:					assessmentXp = 1
src/lib/payloads/oneroster/course.ts:				if (assessment.type === "Quiz") {
src/lib/payloads/oneroster/course.ts:				} else if (assessment.type === "UnitTest") {
src/lib/payloads/oneroster/course.ts:				} else if (assessment.type === "CourseChallenge") {
src/lib/payloads/oneroster/course.ts:					logger.error("assessment launch url: no lessons in unit", { unitId: unit.id, unitSlug: unit.slug })
src/lib/payloads/oneroster/course.ts:					throw errors.new("assessment launch url: no lessons in unit")
src/lib/payloads/oneroster/course.ts:				const assessmentPathSegment = assessment.type === "Quiz" ? "quiz" : "test"
src/lib/payloads/oneroster/course.ts:				const canonicalAssessmentPath = `${appDomain}/${subjectSlug}/${course.slug}/${unit.slug}/${lastLessonSlug}/${assessmentPathSegment}/${normalizeKhanSlug(assessment.slug)}`
src/lib/payloads/oneroster/course.ts:					sourcedId: assessmentSourcedId,
src/lib/payloads/oneroster/course.ts:					title: assessment.title,
src/lib/payloads/oneroster/course.ts:					vendorResourceId: `nice-academy-${assessment.id}`,
src/lib/payloads/oneroster/course.ts:						khanActivityType: assessment.type,
src/lib/payloads/oneroster/course.ts:						khanId: assessment.id,
src/lib/payloads/oneroster/course.ts:						khanSlug: normalizeKhanSlug(assessment.slug),
src/lib/payloads/oneroster/course.ts:						khanTitle: assessment.title,
src/lib/payloads/oneroster/course.ts:						khanDescription: assessment.description,
src/lib/payloads/oneroster/course.ts:						xp: assessmentXp
src/lib/payloads/oneroster/course.ts:				resourceSet.add(assessmentSourcedId)
src/lib/payloads/oneroster/course.ts:				sourcedId: `nice_${assessment.id}`,
src/lib/payloads/oneroster/course.ts:				title: assessment.title,
src/lib/payloads/oneroster/course.ts:				sortOrder: assessment.ordering,
src/lib/payloads/oneroster/course.ts:					khanId: assessment.id,
src/lib/payloads/oneroster/course.ts:					khanSlug: assessment.slug,
src/lib/payloads/oneroster/course.ts:					khanTitle: assessment.title,
src/lib/payloads/oneroster/course.ts:					khanDescription: assessment.description
src/lib/payloads/oneroster/course.ts:				sourcedId: `nice_${assessment.id}_${assessment.id}`,
src/lib/payloads/oneroster/course.ts:				title: assessment.title,
src/lib/payloads/oneroster/course.ts:				courseComponent: { sourcedId: `nice_${assessment.id}`, type: "courseComponent" },
src/lib/payloads/oneroster/course.ts:				resource: { sourcedId: assessmentSourcedId, type: "resource" },
src/lib/payloads/oneroster/course.ts:			// Note: Unit-level assessments are Quiz or UnitTest; exercises are represented as lesson content.
src/lib/payloads/oneroster/course.ts:	// ADDED: Logic to handle course-level assessments (Course Challenges)
src/lib/payloads/oneroster/course.ts:		for (const assessment of courseAssessments.sort((a, b) => a.ordering - b.ordering)) {
src/lib/payloads/oneroster/course.ts:			const assessmentSourcedId = `nice_${assessment.id}`
src/lib/payloads/oneroster/course.ts:			if (!resourceSet.has(assessmentSourcedId)) {
src/lib/payloads/oneroster/course.ts:				let assessmentXp: number
src/lib/payloads/oneroster/course.ts:				if (assessment.type === "CourseChallenge") {
src/lib/payloads/oneroster/course.ts:					assessmentXp = COURSE_CHALLENGE_XP
src/lib/payloads/oneroster/course.ts:				} else if (assessment.type === "Quiz") {
src/lib/payloads/oneroster/course.ts:					assessmentXp = QUIZ_XP
src/lib/payloads/oneroster/course.ts:					// Fallback for other assessment types
src/lib/payloads/oneroster/course.ts:					assessmentXp = 1
src/lib/payloads/oneroster/course.ts:				if (assessment.type === "Quiz") {
src/lib/payloads/oneroster/course.ts:				} else if (assessment.type === "UnitTest") {
src/lib/payloads/oneroster/course.ts:				} else if (assessment.type === "CourseChallenge") {
src/lib/payloads/oneroster/course.ts:					sourcedId: assessmentSourcedId,
src/lib/payloads/oneroster/course.ts:					title: assessment.title,
src/lib/payloads/oneroster/course.ts:					vendorResourceId: `nice-academy-${assessment.id}`,
src/lib/payloads/oneroster/course.ts:						launchUrl: `${appDomain}/${subjectSlug}/${course.slug}/test/${normalizeKhanSlug(assessment.slug)}`,
src/lib/payloads/oneroster/course.ts:						url: `${appDomain}/${subjectSlug}/${course.slug}/test/${normalizeKhanSlug(assessment.slug)}`,
src/lib/payloads/oneroster/course.ts:						khanActivityType: assessment.type,
src/lib/payloads/oneroster/course.ts:						khanId: assessment.id,
src/lib/payloads/oneroster/course.ts:						khanSlug: normalizeKhanSlug(assessment.slug),
src/lib/payloads/oneroster/course.ts:						khanTitle: assessment.title,
src/lib/payloads/oneroster/course.ts:						khanDescription: assessment.description,
src/lib/payloads/oneroster/course.ts:						xp: assessmentXp
src/lib/payloads/oneroster/course.ts:				resourceSet.add(assessmentSourcedId)
src/lib/payloads/oneroster/course.ts:				sourcedId: `nice_${course.id}_${assessment.id}`,
src/lib/payloads/oneroster/course.ts:				title: assessment.title,
src/lib/payloads/oneroster/course.ts:				resource: { sourcedId: assessmentSourcedId, type: "resource" },
src/lib/payloads/oneroster/course.ts:				sortOrder: assessment.ordering
src/lib/payloads/oneroster/course.ts:	const unitTestCount = assessments.filter((a) => a.type === "UnitTest").length
src/lib/types/domain.ts:/** Represents a single question in an assessment. */
src/lib/xp/service.ts:import { checkExistingProficiency } from "@/lib/actions/assessment"
src/lib/xp/service.ts:	assessmentResourceId: string
src/lib/xp/service.ts: * Orchestrates the entire process of calculating and awarding XP for an assessment.
src/lib/xp/service.ts: * @param options - The context and performance data for the assessment.
src/lib/xp/service.ts:	logger.info("awarding xp for assessment", {
src/lib/xp/service.ts:		assessmentResourceId: options.assessmentResourceId,
src/lib/xp/service.ts:	const proficiencyResult = await errors.try(checkExistingProficiency(options.assessmentResourceId))
src/lib/xp/service.ts:			assessmentResourceId: options.assessmentResourceId
src/lib/xp/service.ts:	// 2. Calculate the base assessment XP using the core pure function.
src/lib/xp/service.ts:	const assessmentXpResult = calculateAssessmentXp(
src/lib/xp/service.ts:	let finalXp = assessmentXpResult.finalXp
src/lib/xp/service.ts:	if (options.isExercise && assessmentXpResult.finalXp > 0 && accuracy >= 80) {
src/lib/xp/service.ts:				exerciseResourceSourcedId: options.assessmentResourceId,
src/lib/xp/service.ts:				assessmentId: options.componentResourceId,
src/lib/xp/service.ts:			assessmentId: options.componentResourceId,
src/lib/xp/service.ts:		...assessmentXpResult,
src/lib/data/assessment.ts:import { findAssessmentRedirectPath } from "@/lib/utils/assessment-redirect"
src/lib/data/assessment.ts:	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
src/lib/data/assessment.ts:		assessmentTest,
src/lib/data/assessment.ts:	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
src/lib/data/assessment.ts:		assessmentTest,
src/lib/data/assessment.ts:	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
src/lib/data/assessment.ts:		assessmentTest,
src/lib/data/assessment.ts:		assessment: params.quiz,
src/lib/data/assessment.ts:		assessmentType: "quiz"
src/lib/data/assessment.ts:		assessment: params.test,
src/lib/data/assessment.ts:		assessmentType: "unittest"
src/inngest/functions/orchestrate-course-upload-to-qti.ts:			readJsonFile("assessmentItems.json"),
src/inngest/functions/orchestrate-course-upload-to-qti.ts:			readJsonFile("assessmentStimuli.json"),
src/inngest/functions/orchestrate-course-upload-to-qti.ts:			readJsonFile("assessmentTests.json")
src/inngest/functions/orchestrate-course-upload-to-qti.ts:				const identifier = extractIdentifier(stimulus.xml, "qti-assessment-stimulus")
src/inngest/functions/orchestrate-course-upload-to-qti.ts:				return identifier ? { name: "qti/assessment-stimulus.ingest.one", data: { courseSlug, identifier } } : null
src/inngest/functions/orchestrate-course-upload-to-qti.ts:				const identifier = extractIdentifier(testXml, "qti-assessment-test")
src/inngest/functions/orchestrate-course-upload-to-qti.ts:				return identifier ? { name: "qti/assessment-test.ingest.one", data: { courseSlug, identifier } } : null
src/inngest/functions/orchestrate-course-upload-to-qti.ts:				const identifier = extractIdentifier(item.xml, "qti-assessment-item")
src/inngest/functions/orchestrate-course-upload-to-qti.ts:				return identifier ? { name: "qti/assessment-item.ingest.one", data: { courseSlug, identifier } } : null
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:The question fundamentally relies on precise numerical reading from a graph that provides no numerical information. This is pedagogically destructive and represents a complete failure in educational assessment design.
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd" identifier="nice_xcc647c4e88872a57_0001" title="Subtract on a Number Line - Variation 1" time-dependent="false" xml:lang="en-US">
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd" identifier="nice_x074e933f0d3ee41a_0003" title="Interpret a Retail Sales Data Point" time-dependent="false" xml:lang="en-US">
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="nice_xa67fea6e7226c92b_0003" title="Line Plot of Marker Lengths - Variation 3" time-dependent="false" xml:lang="en-US">
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd" identifier="nice_x8596dbd12ec9a8a1_0001" title="Interpreting a Line Plot of Plant Heights" time-dependent="false" xml:lang="en-US">
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd" identifier="nice_x8953c437b4808dc0_0001" title="What time is it? (Variation 1)" time-dependent="false" xml:lang="en-US">
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd" identifier="nice_xf7e3dd1bce376407_0003" title="Select the correct line plot for crayon measurements" time-dependent="false" xml:lang="en-US">
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="nice_x3bf67409b2d2116a_0001" title="Johnny Appleseed Picture Graph Variation 1" time-dependent="false" xml:lang="en-US">
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/ai/prompts/qti_analysis_report.md:<qti-assessment-item
src/lib/ai/prompts/qti_analysis_report.md:</qti-assessment-item>
src/lib/xp/core.ts: * @param totalQuestions The total number of questions in the assessment.
src/lib/xp/core.ts: * @param durationInSeconds The time taken to complete the assessment in seconds.
src/hooks/useResourceLockStatus.ts:			// Non-assessment items (Video, Article) rely on completed flag
src/lib/data/resource-redirect.ts:	// either interactive or qti forms for assessments/exercises.
src/lib/xp/bank.ts:import { generateResultSourcedId } from "@/lib/utils/assessment-identifiers"
src/lib/xp/bank.ts:import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
src/lib/xp/bank.ts: * the canonical nice_timeSpent value from assessment results instead of
src/lib/xp/bank.ts:	// 2. For each eligible resource, fetch its assessment result to get canonical time spent
src/lib/xp/bank.ts:				logger.debug("no existing assessment result for resource", {
src/lib/xp/bank.ts:	// 5. Save banked XP to individual assessmentResults for each awarded resource
src/lib/xp/bank.ts:				logger.error("failed to save banked xp assessment result", { resourceId, error: saveResult.error })
src/lib/xp/bank.ts:				logger.info("saved banked xp assessment result", { resourceId })
src/lib/xp/bank.ts: * window. Now uses canonical nice_timeSpent from assessment results.
src/lib/xp/bank.ts:	// 5. Calculate banked XP using canonical nice_timeSpent from assessment results
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:import { ingestAssessmentLineItems } from "@/inngest/functions/oneroster/ingest-assessment-line-items"
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:			const [courseComponents, resources, componentResources, assessmentLineItems] = await Promise.all([
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:				readFile("assessmentLineItems.json")
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:			return { courseComponents, resources, componentResources, assessmentLineItems }
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:			assessmentLineItemCount: payload.assessmentLineItems.length
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:		if (payload.assessmentLineItems.length > 0) {
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:			await step.invoke("invoke-ingest-assessment-line-items", {
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:				data: { assessmentLineItems: payload.assessmentLineItems }
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:				assessmentLineItems: payload.assessmentLineItems.length
src/app/debug/qti/content.tsx:import { AssessmentBottomNav, type AssessmentType } from "@/components/practice/assessment-bottom-nav"
src/app/debug/qti/content.tsx:import { processQuestionResponse } from "@/lib/actions/assessment"
src/app/debug/qti/content.tsx:                            materialType="assessmentItem"
src/lib/data/course.ts:			// This is a child component (could be lesson or assessment - we'll filter later)
src/lib/data/course.ts:					logger.error("failed to fetch assessment test for exercise", {
src/lib/data/course.ts:		const assessmentComponentIds = new Set<string>()
src/lib/data/course.ts:		// Determine a canonical lesson slug to embed in assessment paths (practice route requires a lesson)
src/lib/data/course.ts:				logger.error("no lesson components found for unit while determining assessment path", {
src/lib/data/course.ts:				throw errors.new("assessment path: no lesson components found")
src/lib/data/course.ts:				logger.error("no lesson components found for unit while determining assessment path", {
src/lib/data/course.ts:				throw errors.new("assessment path: no lesson components found")
src/lib/data/course.ts:				logger.error("invalid lesson component metadata for assessment path", {
src/lib/data/course.ts:		// Process each child component to find assessments
src/lib/data/course.ts:					const assessmentType = resourceMetadata.khanActivityType
src/lib/data/course.ts:						logger.error("component resource not found for assessment", {
src/lib/data/course.ts:							`component resource not found for assessment ${childComponent.sourcedId} resource ${resource.sourcedId}`
src/lib/data/course.ts:					// Determine the URL path segment for the assessment type
src/lib/data/course.ts:					switch (assessmentType) {
src/lib/data/course.ts:							logger.error("unknown assessment type", { assessmentType })
src/lib/data/course.ts:							throw errors.new(`unknown assessment type: ${assessmentType}`)
src/lib/data/course.ts:						logger.error("missing lesson slug for assessment path", { unitSourcedId: unit.id })
src/lib/data/course.ts:						throw errors.new("assessment path: missing lesson slug")
src/lib/data/course.ts:					const assessment: Quiz | UnitTest = {
src/lib/data/course.ts:						type: assessmentType,
src/lib/data/course.ts:					unitAssessments.push(assessment)
src/lib/data/course.ts:					assessmentComponentIds.add(childComponent.sourcedId) // Track this as an assessment component
src/lib/data/course.ts:		// Filter out assessment components from lessons
src/lib/data/course.ts:		const unitLessons = allUnitChildren.filter((child) => !assessmentComponentIds.has(child.id))
src/lib/data/course.ts:		// Add assessments with their sort orders from components (since they are now course components)
src/lib/data/course.ts:		for (const assessment of unitAssessments) {
src/lib/data/course.ts:				child: assessment,
src/lib/data/course.ts:				sortOrder: assessment.ordering, // We already set this from childComponent.sortOrder
src/lib/data/course.ts:				source: "component" // Changed from "resource" since assessments are now components
src/lib/constants/assessment.ts: * Defines the canonical structure for metadata stored with an assessment result in the gradebook.
src/lib/data/profile.ts:import { getResourceIdFromLineItem } from "@/lib/utils/assessment-line-items"
src/lib/data/profile.ts: * NEW: Sums earned XP from OneRoster assessment results for a given student and course.
src/lib/data/profile.ts: * Only assessment line items using the new `_ali` convention are considered.
src/lib/data/profile.ts:			// Filter by student and by assessment line items that belong to this course.
src/lib/data/profile.ts:		logger.error("failed to fetch assessment results for earned XP", {
src/lib/data/profile.ts:	// Keep only the newest fully graded result per assessment line item
src/lib/data/profile.ts:		const lineItemId = result.assessmentLineItem?.sourcedId
src/lib/data/profile.ts:	// Get all assessment results for this user
src/lib/data/profile.ts:		logger.error("failed to fetch assessment results for proficiency calculation", {
src/lib/data/profile.ts:	// Create a map of resourceId -> assessment result for quick lookup
src/lib/data/profile.ts:		// Skip results from old assessment line items (without '_ali' suffix)
src/lib/data/profile.ts:		if (!result.assessmentLineItem.sourcedId.endsWith("_ali")) {
src/lib/data/profile.ts:			const resourceId = getResourceIdFromLineItem(result.assessmentLineItem.sourcedId)
src/lib/data/profile.ts:	logger.debug("processed assessment results", {
src/lib/data/profile.ts:				logger.debug("Found unit-level assessment", {
src/lib/data/profile.ts:					assessmentId: child.id,
src/lib/data/profile.ts:					assessmentTitle: child.title,
src/lib/data/profile.ts:					assessmentType: child.type
src/lib/data/profile.ts:				// Second pass: populate lessons with exercises and unit-level assessments
src/lib/data/profile.ts:					// Build a set of all child component IDs under this unit (lessons and assessment components)
src/lib/data/profile.ts:					// Combine lessons and assessments, sort by sortOrder
src/inngest/functions/standardize-qti-question-phrasing.ts:			const systemPrompt = `You are a QTI XML standardization expert. Your task is to identify specific phrasing issues in QTI assessment items.
src/inngest/functions/standardize-qti-question-phrasing.ts:<qti-assessment-item
src/inngest/functions/standardize-qti-question-phrasing.ts:</qti-assessment-item>
src/inngest/functions/standardize-qti-question-phrasing.ts:<qti-assessment-item
src/inngest/functions/standardize-qti-question-phrasing.ts:</qti-assessment-item>
src/inngest/functions/standardize-qti-question-phrasing.ts:				logger.error("failed to update qti assessment item", { error: updateResult.error, identifier })
src/inngest/functions/standardize-qti-question-phrasing.ts:				throw errors.wrap(updateResult.error, "qti assessment item update")
src/inngest/functions/standardize-qti-question-phrasing.ts:			logger.info("qti assessment item updated", { identifier })
src/lib/qti-validation/false-positives.test.ts:				rootTag: "assessmentItem",
src/lib/dtos/assessment.ts:	assessmentTitle: z.string(),
src/lib/dtos/assessment.ts:	assessmentPath: z.string(),
src/lib/constants/progress.ts:/** Threshold score (0-100) for an assessment to be considered proficient for XP farming prevention. */
src/lib/caliper/writer.ts:import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
src/lib/caliper/writer.ts:            assessmentLineItem: { sourcedId: lineItemId, type: "assessmentLineItem" as const },
src/lib/qti-selection.ts: * Parses a QTI assessment test's XML to apply selection and ordering rules.
src/lib/qti-selection.ts:	assessmentTest: AssessmentTest,
src/lib/qti-selection.ts:		// For stateless cross-assessment de-duplication and selection diversity
src/lib/qti-selection.ts:	const xml = assessmentTest.rawXml
src/lib/qti-selection.ts:		testIdentifier: assessmentTest.identifier,
src/lib/qti-selection.ts:		testIdentifier: assessmentTest.identifier,
src/lib/qti-selection.ts:	const sectionRegex = /<qti-assessment-section[^>]*>([\s\S]*?)<\/qti-assessment-section>/g
src/lib/qti-selection.ts:		testIdentifier: assessmentTest.identifier,
src/lib/qti-selection.ts:		logger.debug("no qti sections found, returning all questions", { testIdentifier: assessmentTest.identifier })
src/lib/qti-selection.ts:		const itemRefRegex = /<qti-assessment-item-ref[^>]*identifier="(?<identifier>[^"]+)"/g
src/lib/qti-selection.ts:			testIdentifier: assessmentTest.identifier,
src/lib/qti-selection.ts:				testIdentifier: assessmentTest.identifier,
src/lib/qti-selection.ts:					testIdentifier: assessmentTest.identifier,
src/lib/qti-selection.ts:			const seedBase = options?.baseSeed ?? assessmentTest.identifier
src/lib/qti-selection.ts:			const seed = `${seedBase}:${assessmentTest.identifier}:${sectionId}`
src/lib/qti-selection.ts:					testIdentifier: assessmentTest.identifier,
src/lib/qti-selection.ts:					const resourceId = options?.resourceSourcedId ?? assessmentTest.identifier
src/lib/qti-selection.ts:					const seedBase = options?.baseSeed ?? assessmentTest.identifier
src/lib/qti-selection.ts:							step = 1 + (fnv1aHash(`${seedBase}:${assessmentTest.identifier}:${sectionId}:step`) % (n - 1))
src/lib/qti-selection.ts:						const perAssessmentOffset = fnv1aHash(`${resourceId}:${assessmentTest.identifier}:${sectionId}:offset`) % n
src/lib/qti-selection.ts:							testIdentifier: assessmentTest.identifier,
src/lib/qti-selection.ts:						const perAssessmentOffset = fnv1aHash(`${resourceId}:${assessmentTest.identifier}:${sectionId}:offset`) % n
src/lib/qti-selection.ts:							testIdentifier: assessmentTest.identifier,
src/lib/qti-selection.ts:					testIdentifier: assessmentTest.identifier,
src/lib/qti-selection.ts:				testIdentifier: assessmentTest.identifier,
src/lib/qti-selection.ts:			testIdentifier: assessmentTest.identifier,
src/lib/qti-selection.ts:		throw errors.new("QTI assessment parsing: no questions selected")
src/lib/qti-selection.ts:				testIdentifier: assessmentTest.identifier,
src/lib/qti-selection.ts:		testIdentifier: assessmentTest.identifier,
src/lib/qti-validation/rules.ts:// Private helper to upsert an assessment item.
src/lib/qti-validation/rules.ts:// Private helper for validating assessment items via the API.
src/lib/qti-validation/rules.ts:	const finalXml = xml.replace(/<qti-assessment-item([^>]*?)>/, (_match, group1) => {
src/lib/qti-validation/rules.ts:		return `<qti-assessment-item${updatedAttrs}>`
src/lib/qti-validation/rules.ts:	logger.debug("final assessment item xml being sent to qti api", {
src/lib/qti-validation/rules.ts:	if (rootTag === "qti-assessment-item") {
src/lib/qti-validation/rules.ts:	} else if (rootTag === "qti-assessment-test") {
src/lib/qti-validation/rules.ts:	} else if (rootTag === "qti-assessment-stimulus") {
src/lib/qti-validation/rules.ts:	if (context.rootTag !== "qti-assessment-stimulus") {
src/lib/qti-validation/rules.ts:	if (context.rootTag !== "qti-assessment-stimulus") {
src/lib/qti-validation/rules.ts:// The compiler ensures valid QTI output, and this AI validation was only used for assessment items.
src/app/api/qti/update-item/route.ts:  logger.info("qti update item: updating assessment item", { identifier })
src/app/api/qti/update-item/route.ts:  logger.info("qti update item: successfully updated assessment item", { identifier })
src/lib/data/content.ts:	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
src/lib/data/content.ts:		assessmentTest,
src/lib/powerpath.ts:    assessmentLineItemSourcedId: z.string(),
src/lib/powerpath.ts:    assessmentLineItemSourcedId: z.string(),
src/lib/powerpath.ts:    assessmentLineItemSourcedId: z.string(),
src/lib/powerpath.ts:		logger.debug("powerpath: getting assessment progress", { student, lesson, attempt })
src/lib/qti-validation/ghetto.ts: * @param xml The XML content of the assessment item.
src/lib/qti-validation/ghetto.ts:	const validationXml = replaceRootAttributes(xml, "qti-assessment-item", tempIdentifier, title)
src/lib/qti-validation/ghetto.ts: * @param xml The XML content of the assessment test.
src/lib/qti-validation/ghetto.ts:	const validationXml = replaceRootAttributes(xml, "qti-assessment-test", tempIdentifier, title)
src/lib/utils/assessment-line-items.ts: * Utility functions for converting between resource IDs and assessment line item IDs.
src/lib/utils/assessment-line-items.ts: * across the entire application when working with OneRoster assessment line items.
src/lib/utils/assessment-line-items.ts: * Converts a resource ID to its corresponding assessment line item ID.
src/lib/utils/assessment-line-items.ts: * @returns The assessment line item sourcedId (e.g., "nice_xa3cbcc67cc56d4a1_ali")
src/lib/utils/assessment-line-items.ts: * Converts an assessment line item ID back to its original resource ID.
src/lib/utils/assessment-line-items.ts: * @param lineItemId - The assessment line item sourcedId (e.g., "nice_xa3cbcc67cc56d4a1_ali")
src/lib/utils/assessment-line-items.ts: * Checks if a given ID is an assessment line item ID (ends with '_ali').
src/lib/utils/assessment-line-items.ts: * @returns True if the ID appears to be an assessment line item ID
src/lib/utils/assessment-line-items.ts: * Converts an array of resource IDs to their corresponding assessment line item IDs.
src/lib/utils/assessment-line-items.ts: * @returns Array of assessment line item sourcedIds
src/lib/data/progress.ts:import { getResourceIdFromLineItem } from "@/lib/utils/assessment-line-items"
src/lib/data/progress.ts:import { isInteractiveAttemptResult, isPassiveContentResult } from "@/lib/utils/assessment-results"
src/lib/data/progress.ts:			// Fetch all assessment results for the user
src/lib/data/progress.ts:				const lineItemId = result.assessmentLineItem.sourcedId
src/inngest/functions/oneroster/ingest-assessment-line-items.ts:	assessmentLineItems: z.array(z.unknown())
src/inngest/functions/oneroster/ingest-assessment-line-items.ts:		id: "ingest-assessment-line-items",
src/inngest/functions/oneroster/ingest-assessment-line-items.ts:	{ event: "oneroster/assessment-line-items.ingest" },
src/inngest/functions/oneroster/ingest-assessment-line-items.ts:			throw errors.new("event data must contain assessmentLineItems array")
src/inngest/functions/oneroster/ingest-assessment-line-items.ts:		for (const item of eventDataResult.data.assessmentLineItems) {
src/inngest/functions/oneroster/ingest-assessment-line-items.ts:		logger.info("starting assessment line item ingestion", {
src/inngest/functions/oneroster/ingest-assessment-line-items.ts:				const result = await errors.try(oneroster.putAssessmentLineItem(item.sourcedId, { assessmentLineItem: item }))
src/inngest/functions/oneroster/ingest-assessment-line-items.ts:					logger.error("failed to upsert assessment line item", { sourcedId: item.sourcedId, error: result.error })
src/inngest/functions/oneroster/ingest-assessment-line-items.ts:		logger.info("all assessment line items ingestion steps completed")
src/app/api/inngest/route.ts:import { clearAllAssessmentItemData } from "@/inngest/functions/clear-all-assessment-item-data"
src/app/api/inngest/route.ts:import { orchestrateHardcodedScienceAssessmentLineItemUpload } from "@/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload"
src/app/api/inngest/route.ts:import { ingestAssessmentLineItems } from "@/inngest/functions/oneroster/ingest-assessment-line-items"
src/app/api/inngest/route.ts:import { ingestAssessmentItemOne } from "@/inngest/functions/qti/ingest-assessment-item-one"
src/app/api/inngest/route.ts:import { ingestAssessmentStimulusOne } from "@/inngest/functions/qti/ingest-assessment-stimulus-one"
src/app/api/inngest/route.ts:import { ingestAssessmentTestOne } from "@/inngest/functions/qti/ingest-assessment-test-one"
src/lib/utils/assessment-identifiers.ts:import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
src/lib/utils/assessment-identifiers.ts: * Centralized policy for all assessment-related identifiers.
src/lib/utils/assessment-identifiers.ts: * Generates the sourcedId for an assessment result.
src/lib/utils/assessment-identifiers.ts: * Interactive assessments (exercises, quizzes, tests) must have an attempt number.
src/lib/utils/assessment-identifiers.ts:			logger.error("attempt number required for interactive assessments", {
src/lib/utils/assessment-identifiers.ts:			throw errors.new("attempt number required for interactive assessments")
src/lib/utils/openai-vision.ts:	summary: z.string().describe("Brief overall assessment of the production rendering quality"),
src/lib/utils/openai-vision.ts:	production_assessment: z.string().describe("Detailed analysis of what you observe in the production screenshot")
src/inngest/functions/oneroster/generate-payload-for-course.ts:			// MODIFIED: Update the list of files to include the new assessment line items
src/inngest/functions/oneroster/generate-payload-for-course.ts:				{ name: "assessmentLineItems.json", data: payload.assessmentLineItems }
src/inngest/functions/oneroster/generate-payload-for-course.ts:				assessmentLineItems: path.join(outputDir, "assessmentLineItems.json")
src/inngest/functions/oneroster/generate-payload-for-course.ts:				assessmentLineItems: payload.assessmentLineItems.length
src/inngest/functions/qti/ingest-assessment-item-one.ts:		id: "ingest-assessment-item-one",
src/inngest/functions/qti/ingest-assessment-item-one.ts:	{ event: "qti/assessment-item.ingest.one" },
src/inngest/functions/qti/ingest-assessment-item-one.ts:		logger.info("Ingesting assessment item", { identifier, courseSlug })
src/inngest/functions/qti/ingest-assessment-item-one.ts:		const filePath = path.join(process.cwd(), "data", courseSlug, "qti", "assessmentItems.json")
src/inngest/functions/qti/ingest-assessment-item-one.ts:		const match = items.find((it) => extractIdentifier(it.xml, "qti-assessment-item") === identifier)
src/inngest/functions/qti/ingest-assessment-item-one.ts:					logger.error("Failed to create assessment item after 404 on update.", {
src/inngest/functions/qti/ingest-assessment-item-one.ts:				logger.info("Successfully created assessment item.", { identifier })
src/inngest/functions/qti/ingest-assessment-item-one.ts:			logger.error("Failed to update assessment item.", { identifier, error: updateResult.error })
src/inngest/functions/qti/ingest-assessment-item-one.ts:		logger.info("Successfully updated assessment item.", { identifier })
src/lib/utils.ts:			// Non-assessment items (Video, Article) rely on completed flag
src/lib/utils/assessment-redirect.ts:	assessment: string // quiz or test slug
src/lib/utils/assessment-redirect.ts:	assessmentType: "quiz" | "unittest"
src/lib/utils/assessment-redirect.ts: * Finds an assessment resource (quiz or unit test) within a unit's hierarchy and constructs
src/lib/utils/assessment-redirect.ts: * @param params The route parameters including the assessment slug
src/lib/utils/assessment-redirect.ts: * @returns The redirect path to the assessment within the proper lesson structure
src/lib/utils/assessment-redirect.ts: * @throws notFound() if the assessment cannot be found
src/lib/utils/assessment-redirect.ts:	logger.info("finding assessment redirect path", {
src/lib/utils/assessment-redirect.ts:		assessmentType: params.assessmentType,
src/lib/utils/assessment-redirect.ts:	assertNoEncodedColons(params.assessment, "findAssessmentRedirectPath assessment parameter")
src/lib/utils/assessment-redirect.ts:		logger.error("failed to fetch all resources for assessment validation", {
src/lib/utils/assessment-redirect.ts:			assessmentType: params.assessmentType,
src/lib/utils/assessment-redirect.ts:	// Find the assessment resource with proper URL decoding
src/lib/utils/assessment-redirect.ts:	const assessmentResource = allResourcesResult.data.find((res) => {
src/lib/utils/assessment-redirect.ts:			metadataResult.data.khanSlug === params.assessment && // Use decoded value!
src/lib/utils/assessment-redirect.ts:			metadataResult.data.khanActivityType === (params.assessmentType === "quiz" ? "Quiz" : "UnitTest")
src/lib/utils/assessment-redirect.ts:	if (!assessmentResource) {
src/lib/utils/assessment-redirect.ts:		logger.warn("assessment resource not found within the specified unit/lesson hierarchy", {
src/lib/utils/assessment-redirect.ts:			assessmentSlug: params.assessment,
src/lib/utils/assessment-redirect.ts:			assessmentType: params.assessmentType
src/lib/utils/assessment-redirect.ts:	// Construct the redirect path based on assessment type
src/lib/utils/assessment-redirect.ts:	const assessmentPath = params.assessmentType === "quiz" ? "quiz" : "test"
src/lib/utils/assessment-redirect.ts:	return `/${params.subject}/${params.course}/${params.unit}/${lastLessonSlug}/${assessmentPath}/${params.assessment}`
src/lib/utils/assessment-results.ts: * for interactive assessments (Quizzes, Tests, Exercises).
src/lib/utils/assessment-results.ts: * This is the single source of truth for identifying interactive assessment attempts.
src/lib/utils/assessment-results.ts: * @param lineItemId The OneRoster assessment line item sourcedId.
src/lib/utils/assessment-results.ts: * @param lineItemId The OneRoster assessment line item sourcedId.
src/lib/utils/assessment-results.ts: * @param lineItemId The OneRoster assessment line item sourcedId.
src/lib/utils/assessment-results.ts: * Finds the most recent, valid assessment result for an *interactive assessment*
src/lib/utils/assessment-results.ts: * @param lineItemId The specific OneRoster assessment line item sourcedId to check.
src/app/(admin)/course-builder/actions.ts:  const assessmentLineItems: Array<{
src/app/(admin)/course-builder/actions.ts:          assessmentLineItems.push({
src/app/(admin)/course-builder/actions.ts:          assessmentLineItems.push({
src/app/(admin)/course-builder/actions.ts:          assessmentLineItems.push({
src/app/(admin)/course-builder/actions.ts:    assessmentLineItems,
src/app/(admin)/course-builder/actions.ts:// Execute QTI copy plan: duplicate assessment tests for new exercise IDs
src/app/(admin)/course-builder/actions.ts:    // 1) Fetch existing assessment test by sourceId
src/app/(admin)/course-builder/actions.ts:      logger.error("qti copy: get assessment test failed", { sourceId, error: getResult.error })
src/app/(admin)/course-builder/actions.ts:      throw errors.wrap(getResult.error, "qti get assessment test")
src/app/(admin)/course-builder/actions.ts:    // Replace the identifier attribute in the root <qti-assessment-test ... identifier="...">
src/app/(admin)/course-builder/actions.ts:    const updatedXml = xml.replace(/(<qti-assessment-test[\s\S]*?identifier=")([^"]+)("[\s\S]*?>)/, `$1${newId}$3`)
src/app/(admin)/course-builder/actions.ts:    // 3) Create new assessment test with updated XML
src/app/(admin)/course-builder/actions.ts:      logger.error("qti copy: create assessment test failed", { newId, error: createResult.error })
src/app/(admin)/course-builder/actions.ts:      throw errors.wrap(createResult.error, "qti create assessment test")
src/app/(admin)/course-builder/actions.ts:    logger.info("qti copy: created new assessment test", { sourceId, newId, title })
src/app/(admin)/course-builder/actions.ts:    // Replace the identifier attribute in the root <qti-assessment-stimulus ... identifier="...">
src/app/(admin)/course-builder/actions.ts:    const updatedXml = xml.replace(/(<qti-assessment-stimulus[\s\S]*?identifier=")([^"]+)("[\s\S]*?>)/, `$1${newId}$3`)
src/app/(admin)/course-builder/actions.ts:    // The API expects JSON with identifier, title, and content (XML body only, not the full <qti-assessment-stimulus> document)
src/app/(admin)/course-builder/actions.ts:// Step 5: Create assessment line items
src/app/(admin)/course-builder/actions.ts:        assessmentLineItem: {
src/app/(admin)/course-builder/actions.ts:      logger.error("put assessment line item failed", { id: ali.sourcedId, error: res.error })
src/app/(admin)/course-builder/actions.ts:      throw errors.wrap(res.error, "put assessment line item")
src/lib/oneroster.ts:		"assessmentLineItem",
src/lib/oneroster.ts:	assessmentLineItem: GUIDRefReadSchema,
src/lib/oneroster.ts:		assessmentLineItem: GUIDRefWriteSchema,
src/lib/oneroster.ts:	 * @param {string} sourcedId - The unique identifier for the assessment line item.
src/lib/oneroster.ts:	 * @param {object} payload - The assessment line item data.
src/lib/oneroster.ts:	 * @returns {Promise<AssessmentLineItem>} The created or updated assessment line item object.
src/lib/oneroster.ts:		payload: { assessmentLineItem: CreateAssessmentLineItemInput }
src/lib/oneroster.ts:		logger.info("oneroster: putting assessment line item", { sourcedId })
src/lib/oneroster.ts:		const validation = z.object({ assessmentLineItem: CreateAssessmentLineItemInputSchema }).safeParse(payload)
src/lib/oneroster.ts:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
src/lib/oneroster.ts:			z.object({ assessmentLineItem: AssessmentLineItemSchema })
src/lib/oneroster.ts:		if (!response?.assessmentLineItem) {
src/lib/oneroster.ts:		return response.assessmentLineItem
src/lib/oneroster.ts:	 * @param {string} sourcedId - The unique identifier for the assessment line item.
src/lib/oneroster.ts:	 * @param {object} payload - The assessment line item data.
src/lib/oneroster.ts:	 * @returns {Promise<AssessmentLineItem>} The updated assessment line item object.
src/lib/oneroster.ts:		payload: { assessmentLineItem: CreateAssessmentLineItemInput }
src/lib/oneroster.ts:		logger.info("oneroster: patching assessment line item", { sourcedId })
src/lib/oneroster.ts:		const validation = z.object({ assessmentLineItem: CreateAssessmentLineItemInputSchema }).safeParse(payload)
src/lib/oneroster.ts:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
src/lib/oneroster.ts:		logger.info("oneroster: successfully patched assessment line item", { sourcedId })
src/lib/oneroster.ts:	 * @param {string} sourcedId - The unique identifier of the assessment line item.
src/lib/oneroster.ts:	 * @returns {Promise<AssessmentLineItem | null>} The assessment line item object, or null if not found.
src/lib/oneroster.ts:		logger.info("oneroster: getting assessment line item", { sourcedId })
src/lib/oneroster.ts:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
src/lib/oneroster.ts:			z.object({ assessmentLineItem: AssessmentLineItemSchema.optional() }),
src/lib/oneroster.ts:		return response?.assessmentLineItem ?? null
src/lib/oneroster.ts:	 * @returns {Promise<AssessmentLineItem[]>} Array of assessment line items.
src/lib/oneroster.ts:		logger.info("oneroster: fetching ALL assessment line items", options)
src/lib/oneroster.ts:			assessmentLineItems: z.array(AssessmentLineItemSchema)
src/lib/oneroster.ts:			endpoint: "/ims/oneroster/gradebook/v1p2/assessmentLineItems",
src/lib/oneroster.ts:			responseKey: "assessmentLineItems",
src/lib/oneroster.ts:		logger.info("oneroster: finished fetching all assessment line items", {
src/lib/oneroster.ts:	 * @param {string} sourcedId - The unique identifier of the assessment line item.
src/lib/oneroster.ts:		logger.info("oneroster: deleting assessment line item", { sourcedId })
src/lib/oneroster.ts:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
src/lib/oneroster.ts:		logger.info("oneroster: successfully deleted assessment line item", { sourcedId })
src/lib/oneroster.ts:		logger.info("creating assessment result", {
src/lib/oneroster.ts:			lineItemId: payload.result.assessmentLineItem.sourcedId
src/lib/oneroster.ts:			`/ims/oneroster/gradebook/v1p2/assessmentResults/${sourcedId}`,
src/lib/oneroster.ts:				body: JSON.stringify({ assessmentResult: validation.data.result })
src/lib/oneroster.ts:			z.object({ assessmentResult: AssessmentResultSchema })
src/lib/oneroster.ts:		if (!response?.assessmentResult) {
src/lib/oneroster.ts:		return response.assessmentResult
src/lib/oneroster.ts:	 * @param {string} sourcedId - The unique identifier of the assessment result.
src/lib/oneroster.ts:	 * @returns {Promise<AssessmentResult | null>} The assessment result object, or null if not found.
src/lib/oneroster.ts:		logger.info("oneroster: getting assessment result", { sourcedId })
src/lib/oneroster.ts:			assessmentResult: AssessmentResultSchema.optional()
src/lib/oneroster.ts:			`/ims/oneroster/gradebook/v1p2/assessmentResults/${sourcedId}`,
src/lib/oneroster.ts:		if (!response || !response.assessmentResult) {
src/lib/oneroster.ts:		return response.assessmentResult
src/lib/oneroster.ts:	 * Fetches all assessment results with optional filtering and sorting.
src/lib/oneroster.ts:	 * @returns A promise that resolves to an array of assessment results.
src/lib/oneroster.ts:		const results = await this.#fetchPaginatedCollection<{ assessmentResults: AssessmentResult[] }, AssessmentResult>({
src/lib/oneroster.ts:			endpoint: "/ims/oneroster/gradebook/v1p2/assessmentResults",
src/lib/oneroster.ts:			responseKey: "assessmentResults",
src/lib/oneroster.ts:			schema: z.object({ assessmentResults: z.array(AssessmentResultSchema) }),
src/lib/oneroster.ts:	 * @param {string} sourcedId - The unique identifier of the assessment result.
src/lib/oneroster.ts:		logger.info("oneroster: deleting assessment result", { sourcedId })
src/lib/oneroster.ts:			`/ims/oneroster/gradebook/v1p2/assessmentResults/${sourcedId}`,
src/lib/oneroster.ts:		logger.info("oneroster: successfully deleted assessment result", { sourcedId })
src/lib/xml-utils.ts: * @param elementName The name of the element (e.g., 'qti-assessment-item')
src/lib/xml-utils.ts: * Extracts all assessment item references from a QTI test XML
src/lib/xml-utils.ts:	// Match all qti-assessment-item-ref elements and extract their identifier attributes
src/lib/xml-utils.ts:	const regex = /<qti-assessment-item-ref[^>]*\sidentifier=["']([^"']+)["']/gi
src/lib/xml-utils.ts:	const hrefRegex = /<qti-assessment-item-ref[^>]*\shref=["']([^"']+)["']/gi
src/lib/interactive-assessments.ts:import { getNextAttemptNumber } from "@/lib/actions/assessment"
src/lib/interactive-assessments.ts:	assessmentTest: AssessmentTest
src/lib/interactive-assessments.ts:	const { userSourceId, resourceSourcedId, assessmentTest, resolvedQuestions } = options
src/lib/interactive-assessments.ts:	const questions = applyQtiSelectionAndOrdering(assessmentTest, resolvedQuestions, {
src/lib/data/fetchers/interactive-helpers.ts:import { prepareInteractiveAssessment } from "@/lib/interactive-assessments"
src/lib/data/fetchers/interactive-helpers.ts:	// where the component is the assessment itself, not the unit
src/lib/data/fetchers/interactive-helpers.ts:): Promise<{ assessmentTest: AssessmentTest; resolvedQuestions: TestQuestionsResponse["questions"] }> {
src/lib/data/fetchers/interactive-helpers.ts:	const assessmentTestResult = await errors.try(getAssessmentTest(resourceSourcedId))
src/lib/data/fetchers/interactive-helpers.ts:	if (assessmentTestResult.error) {
src/lib/data/fetchers/interactive-helpers.ts:		logger.error("failed to fetch assessment test XML", {
src/lib/data/fetchers/interactive-helpers.ts:			error: assessmentTestResult.error
src/lib/data/fetchers/interactive-helpers.ts:		throw errors.wrap(assessmentTestResult.error, "fetch assessment test")
src/lib/data/fetchers/interactive-helpers.ts:	const resolvedQuestionsResult = await errors.try(resolveAllQuestionsForTestFromXml(assessmentTestResult.data))
src/lib/data/fetchers/interactive-helpers.ts:		assessmentTest: assessmentTestResult.data,
src/lib/data/fetchers/interactive-helpers.ts:	assessmentTest: AssessmentTest
src/lib/data/fetchers/interactive-helpers.ts:		logger.error("user authentication required for interactive assessment")
src/lib/data/fetchers/interactive-helpers.ts:		logger.error("user source id missing for interactive assessment", { userId: user.id })
src/lib/data/fetchers/interactive-helpers.ts:		assessmentTest: options.assessmentTest,
src/app/(admin)/course-builder/content.tsx:        { text: "Creating assessment line items..." },
src/app/(admin)/course-builder/content.tsx:            // Step 5: Creating assessments
src/app/(admin)/course-builder/content.tsx:            await createAssessmentLineItemsStep(payload.assessmentLineItems)
src/lib/qti-stimulus/utils/examples-loader.ts:	const baseDir = `${EXAMPLES_DIR}/assessment-stimulus`
src/lib/data/fetchers/qti.ts:// Fetch a single assessment item with caching
src/lib/data/fetchers/qti.ts:// Fetch multiple assessment items, preserving input order
src/lib/data/fetchers/qti.ts:			logger.error("qti assessment item not found", { id })
src/lib/data/fetchers/qti.ts:			throw errors.new(`qti assessment item not found: ${id}`)
src/lib/canvas-api.ts:		assessmentRequestsForCurrentUser: z.array(AssessmentRequestSchema).optional()
src/lib/canvas-api.ts:			"query GetCourseModules($courseId: ID!) {\n  course(id: $courseId) {\n    modulesConnection {\n      nodes {\n        id: _id\n        moduleItems {\n          content {\n            ... on Assignment {\n              name\n              _id\n              peerReviews {\n                anonymousReviews\n                __typename\n              }\n              assessmentRequestsForCurrentUser {\n                id: _id\n                anonymousId\n                available\n                createdAt\n                workflowState\n                user {\n                  id: _id\n                  name\n                  __typename\n                }\n                anonymizedUser {\n                  id: _id\n                  name\n                  __typename\n                }\n                __typename\n              }\n              __typename\n            }\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}"
src/inngest/functions/qti/convert-perseus-article-to-qti-stimulus.ts:				rootTag: "qti-assessment-stimulus",
src/lib/services/attempt.ts:import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
src/lib/services/attempt.ts:import { filterInteractiveAttemptResults } from "@/lib/utils/assessment-results"
src/lib/services/attempt.ts: * Service for managing assessment attempt numbers.
src/lib/services/attempt.ts: * for a user's assessment based on their previous attempts.
src/lib/services/attempt.ts: * Computes the next attempt number for a user's assessment.
src/lib/services/attempt.ts:	const filter = `status='active' AND student.sourcedId='${userSourcedId}' AND assessmentLineItem.sourcedId='${lineItemId}'`
src/lib/qti-stimulus/utils/valid-tags.ts:	"qti-assessment-item",
src/lib/qti-stimulus/utils/valid-tags.ts:	"qti-assessment-item-ref",
src/lib/qti-stimulus/utils/valid-tags.ts:	"qti-assessment-section",
src/lib/qti-stimulus/utils/valid-tags.ts:	"qti-assessment-section-ref",
src/lib/qti-stimulus/utils/valid-tags.ts:	"qti-assessment-stimulus",
src/lib/qti-stimulus/utils/valid-tags.ts:	"qti-assessment-stimulus-ref",
src/lib/qti-stimulus/utils/valid-tags.ts:	"qti-assessment-test",
src/lib/ports/gradebook.ts:import { type AssessmentResultMetadata, AssessmentResultMetadataSchema } from "@/lib/constants/assessment"
src/lib/ports/gradebook.ts: * Saves a fully-formed assessment result to the gradebook via an idempotent PUT operation.
src/lib/ports/gradebook.ts:		logger.error("invalid assessment result metadata", {
src/lib/ports/gradebook.ts:			assessmentLineItem: { sourcedId: options.lineItemSourcedId, type: "assessmentLineItem" as const },
src/lib/services/assessment.ts:import type { SaveAssessmentResultCommand } from "@/lib/dtos/assessment"
src/lib/services/assessment.ts:import { generateResultSourcedId } from "@/lib/utils/assessment-identifiers"
src/lib/services/assessment.ts:import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
src/lib/services/assessment.ts:		score: assessmentScore,
src/lib/services/assessment.ts:	logger.info("saving assessment result [service]", { correlationId, resourceId, userId })
src/lib/services/assessment.ts:		assessmentResourceId: resourceId,
src/lib/services/assessment.ts:			score: assessmentScore,
src/lib/services/assessment.ts:		logger.error("failed to save assessment result to gradebook", { error: gradebookResult.error, correlationId })
src/lib/services/assessment.ts:		throw errors.wrap(gradebookResult.error, "failed to save primary assessment result")
src/lib/services/assessment.ts:	// Proficiency update for interactive assessments
src/lib/services/assessment.ts:	if (command.unitData && command.assessmentPath && command.assessmentTitle && command.userEmail) {
src/lib/services/assessment.ts:				id: `${env.NEXT_PUBLIC_APP_DOMAIN}${command.assessmentPath}`,
src/lib/services/assessment.ts:				activity: { name: command.assessmentTitle, id: resourceId },
src/lib/services/assessment.ts:			logger.error("side effect failed in assessment service", {
src/inngest/functions/qti/request-all-stimulus-migrations-for-course.ts:		logger.info("starting all assessment stimulus migrations for course", { courseId })
src/lib/metadata/oneroster.ts:// Schema for QTI-specific metadata (used for exercises and assessment tests)
src/lib/actions/assessment.ts:} from "@/lib/assessment-cache"
src/lib/actions/assessment.ts:import type { SaveAssessmentResultCommand } from "@/lib/dtos/assessment"
src/lib/actions/assessment.ts:import * as assessment from "@/lib/services/assessment"
src/lib/actions/assessment.ts:import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
src/lib/actions/assessment.ts:import { findLatestInteractiveAttempt } from "@/lib/utils/assessment-results"
src/lib/actions/assessment.ts: * Retrieves a deterministic list of questions for an assessment based on user, assessment, and attempt.
src/lib/actions/assessment.ts:	assessmentResourceSourcedId: string,
src/lib/actions/assessment.ts:	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(assessmentResourceSourcedId)
src/lib/actions/assessment.ts:	const questions = applyQtiSelectionAndOrdering(assessmentTest, resolvedQuestions, {
src/lib/actions/assessment.ts:		baseSeed: `${userSourcedId}:${assessmentResourceSourcedId}`,
src/lib/actions/assessment.ts:		resourceSourcedId: assessmentResourceSourcedId
src/lib/actions/assessment.ts: * @param qtiItemId - The QTI assessment item ID (e.g., nice_question123)
src/lib/actions/assessment.ts: * @param assessmentAttemptNumber - The attempt number (0 = first attempt)
src/lib/actions/assessment.ts:	assessmentAttemptNumber?: number
src/lib/actions/assessment.ts:		assessmentAttemptNumber
src/lib/actions/assessment.ts:	 * We currently rely on the provider's JSON representation of assessment items
src/lib/actions/assessment.ts:	 * (e.g., `responseDeclarations` on the GET /assessment-items/:id response) to
src/lib/actions/assessment.ts:	 *   `tests/actions/assessment/response-filtering.test.ts`
src/lib/actions/assessment.ts:		logger.error("failed to get qti assessment item for response processing", { error: itemResult.error, qtiItemId })
src/lib/actions/assessment.ts:		throw errors.wrap(itemResult.error, "qti get assessment item")
src/lib/actions/assessment.ts: * Gets or creates the assessment state in Redis.
src/lib/actions/assessment.ts: * If the assessment is already finalized or completed, triggers finalization and returns the finalized state.
src/lib/actions/assessment.ts:			logger.info("resuming an already finalized assessment state", {
src/lib/actions/assessment.ts: * This action is central to the assessment's integrity. It is called only on the user's
src/lib/actions/assessment.ts:		logger.error("assessment state not found", { onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber })
src/lib/actions/assessment.ts:	 * We currently rely on the provider's JSON representation of assessment items
src/lib/actions/assessment.ts:	 * (e.g., `responseDeclarations` on the GET /assessment-items/:id response) to
src/lib/actions/assessment.ts:	 *   `tests/actions/assessment/response-filtering.test.ts`
src/lib/actions/assessment.ts:		logger.error("failed to get qti assessment item for submit", { error: itemResult.error, questionId })
src/lib/actions/assessment.ts:		throw errors.wrap(itemResult.error, "qti get assessment item")
src/lib/actions/assessment.ts:		logger.error("assessment state not found for skip", {
src/lib/actions/assessment.ts: * 2. It advances the `currentQuestionIndex`, removing the question from the user's active assessment path.
src/lib/actions/assessment.ts:		logger.error("assessment state not found for report", {
src/lib/actions/assessment.ts: * Computes the next attempt number for a user on an assessment resource using OneRoster.
src/lib/actions/assessment.ts: * Checks if a user has already achieved proficiency (80%+) on an assessment.
src/lib/actions/assessment.ts: * @param onerosterAssessmentSourcedId - The OneRoster assessment resource sourcedId
src/lib/actions/assessment.ts:			filter: `student.sourcedId='${onerosterUserSourcedId}' AND assessmentLineItem.sourcedId='${strictLineItemId}'`
src/lib/actions/assessment.ts: * Orchestrates the finalization of an assessment.
src/lib/actions/assessment.ts: * saves the official result to OneRoster via the assessment service, and awards XP.
src/lib/actions/assessment.ts: * - The Redis state is the SINGLE SOURCE OF TRUTH for assessment results
src/lib/actions/assessment.ts: * After all permanent storage is updated, it marks the assessment state in Redis as `isFinalized: true`.
src/lib/actions/assessment.ts: * @param options Contextual data for the assessment (no session results are passed from the client).
src/lib/actions/assessment.ts:	assessmentTitle: string
src/lib/actions/assessment.ts:	assessmentPath: string
src/lib/actions/assessment.ts:		logger.error("finalize assessment: user not authenticated", { correlationId })
src/lib/actions/assessment.ts:		logger.error("assessment state not found for finalization", {
src/lib/actions/assessment.ts:		logger.info("finalizing assessment", {
src/lib/actions/assessment.ts:			logger.error("finalize assessment: user not authenticated", { correlationId })
src/lib/actions/assessment.ts:		// Extract subject and course slugs from assessment path
src/lib/actions/assessment.ts:		const pathParts = options.assessmentPath.split("/")
src/lib/actions/assessment.ts:			logger.error("invalid assessment path structure", { assessmentPath: options.assessmentPath, correlationId })
src/lib/actions/assessment.ts:			throw errors.new("assessment path invalid")
src/lib/actions/assessment.ts:			logger.error("invalid subject slug in assessment path", {
src/lib/actions/assessment.ts:				assessmentPath: options.assessmentPath,
src/lib/actions/assessment.ts:			logger.error("user email required for assessment finalization", {
src/lib/actions/assessment.ts:			throw errors.new("user email required for assessment")
src/lib/actions/assessment.ts:			score: assertPercentageInteger(score, "assessment score"),
src/lib/actions/assessment.ts:		const saveResult = await errors.try(assessment.saveResult(command))
src/lib/actions/assessment.ts:			logger.error("failed to save final assessment result", {
src/lib/actions/assessment.ts:			throw errors.wrap(saveResult.error, "failed to save final assessment result")
src/lib/actions/assessment.ts:		logger.error("assessment finalization failed unexpectedly", { correlationId, error: finalizationResult.error })
src/lib/actions/assessment.ts: * Clears the current assessment state from Redis for a user, allowing getOrCreateAssessmentState
src/lib/actions/assessment.ts: * This action clears ANY existing assessment state from Redis, regardless of finalization status.
src/lib/actions/assessment.ts: * @param onerosterResourceSourcedId - The OneRoster resource ID for the assessment
src/lib/actions/assessment.ts:		logger.info("cleared previous assessment state to start new one", {
src/lib/services/cache.ts: * Called after any operation that modifies user progress (assessments, videos, articles).
src/lib/actions/proficiency.ts:import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
src/lib/actions/proficiency.ts: * Analyzes an assessment completion and updates individual exercise proficiency
src/lib/actions/proficiency.ts: * mastery learning where performance on comprehensive assessments updates the
src/lib/actions/proficiency.ts:					filter: `student.sourcedId='${onerosterUserSourcedId}' AND assessmentLineItem.sourcedId='${getAssessmentLineItemId(onerosterResourceSourcedId)}'`
src/lib/actions/proficiency.ts:			// Strictly consider only new attempt-based IDs for interactive assessments
src/components/practice/lock-overlay.tsx:		// Then unit-level assessments
src/inngest/functions/qti/backfill-items-and-stimuli.ts:				const updatedXml = replaceRootAttributes(i.xml, "qti-assessment-item", identifier, currentTitle)
src/inngest/functions/qti/backfill-items-and-stimuli.ts:				const updatedXml = replaceRootAttributes(s.xml, "qti-assessment-stimulus", identifier, currentTitle)
src/inngest/functions/qti/backfill-items-and-stimuli.ts:				fs.writeFile(path.join(courseDir, "assessmentItems.json"), JSON.stringify(itemPayload, null, 2)),
src/inngest/functions/qti/backfill-items-and-stimuli.ts:				fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(stimulusPayload, null, 2))
src/inngest/functions/qti/backfill-items-and-stimuli.ts:						name: "qti/assessment-item.ingest.one" as const,
src/inngest/functions/qti/backfill-items-and-stimuli.ts:						name: "qti/assessment-stimulus.ingest.one" as const,
src/lib/services/proficiency.ts:import { generateResultSourcedId } from "@/lib/utils/assessment-identifiers"
src/lib/services/proficiency.ts:import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
src/lib/services/proficiency.ts: * Analyzes an assessment completion and updates individual exercise proficiency
src/lib/services/proficiency.ts: * mastery learning where performance on comprehensive assessments updates the
src/lib/services/proficiency.ts:					filter: `student.sourcedId='${onerosterUserSourcedId}' AND assessmentLineItem.sourcedId='${getAssessmentLineItemId(onerosterResourceSourcedId)}'`
src/lib/services/proficiency.ts:			// Strictly consider only new attempt-based IDs for interactive assessments
src/lib/services/proficiency.ts:				xpReason: "Proficiency update from summative assessment",
src/lib/services/proficiency.ts:					comment: `Proficiency updated from assessment ${onerosterComponentResourceSourcedId}`,
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:<qti-assessment-item
src/lib/qti-generation/__snapshots__/compiler.test.ts.snap:</qti-assessment-item>"
src/lib/qti-resolution.ts:	logger.debug("qti xml: parsing assessment test", { xmlLength: xml.length })
src/lib/qti-resolution.ts:	const sectionRegex = /<qti-assessment-section[^>]*identifier="([^"]+)"[\s\S]*?<\/qti-assessment-section>/g
src/lib/qti-resolution.ts:		const itemRefRegex = /<qti-assessment-item-ref[^>]*identifier="([^"]+)"/g
src/lib/qti-resolution.ts:					href: `/assessment-items/${id}`,
src/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items.ts:import { compile } from "@superbuilders/qti-assessment-item-generator/compiler"
src/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items.ts:import type { AssessmentItemInput } from "@superbuilders/qti-assessment-item-generator/core/item"
src/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items.ts:import { differentiateAssessmentItem } from "@superbuilders/qti-assessment-item-generator/structured/differentiator"
src/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items.ts:import { widgetCollections } from "@superbuilders/qti-assessment-item-generator/widgets/collections"
src/lib/actions/qti.ts: * Server action to process a user's response for a QTI assessment item.
src/lib/actions/qti.ts: * @param identifier The unique identifier of the assessment item.
src/inngest/functions/qti/ingest-assessment-stimulus-one.ts:		id: "ingest-assessment-stimulus-one",
src/inngest/functions/qti/ingest-assessment-stimulus-one.ts:	{ event: "qti/assessment-stimulus.ingest.one" },
src/inngest/functions/qti/ingest-assessment-stimulus-one.ts:		const filePath = path.join(process.cwd(), "data", courseSlug, "qti", "assessmentStimuli.json")
src/inngest/functions/qti/ingest-assessment-stimulus-one.ts:		const match = stimuli.find((s) => extractIdentifier(s.xml, "qti-assessment-stimulus") === identifier)
src/inngest/functions/qti/ingest-assessment-stimulus-one.ts:		logger.info("Ingesting assessment stimulus", { identifier, courseSlug })
src/components/qti-renderer.tsx:	materialType: "assessmentItem" | "stimulus" // REQUIRED: No fallback - system must specify type
src/components/qti-renderer.tsx:		materialType === "assessmentItem"
src/lib/qti-generation/direct/stimulus-generator.ts:	const extracted = extractAndValidateXml(cleanedXml, "qti-assessment-stimulus", logger)
src/lib/qti-generation/direct/stimulus-generator.ts:	const rootTag = "qti-assessment-stimulus"
src/lib/qti-generation/direct/stimulus-generator.ts:You are converting from Perseus JSON, a proprietary format from Khan Academy, to QTI 3.0 XML stimulus format. The ultimate goal is to produce a **high-quality, informational QTI stimulus item.** Stimuli are purely informational content that provide context for assessment items.
src/lib/qti-generation/direct/stimulus-generator.ts:When generating a \`qti-assessment-stimulus\`, the \`<qti-stimulus-body>\` element has extremely strict content rules:
src/lib/qti-generation/direct/stimulus-generator.ts:3. **PURPOSE**: Stimulus items are purely informational. They provide context, passages, or reference material for other assessment items. They CANNOT contain questions or interactions.
src/inngest/functions/qti/ingest-assessment-test-one.ts:		id: "ingest-assessment-test-one",
src/inngest/functions/qti/ingest-assessment-test-one.ts:	{ event: "qti/assessment-test.ingest.one" },
src/inngest/functions/qti/ingest-assessment-test-one.ts:		const filePath = path.join(process.cwd(), "data", courseSlug, "qti", "assessmentTests.json")
src/inngest/functions/qti/ingest-assessment-test-one.ts:		const xml = tests.find((t) => extractIdentifier(t, "qti-assessment-test") === identifier)
src/inngest/functions/qti/ingest-assessment-test-one.ts:		logger.info("Ingesting assessment test", { identifier, courseSlug })
src/inngest/functions/qti/ingest-assessment-test-one.ts:					logger.error("Failed to create assessment test.", { identifier, error: createResult.error })
src/inngest/functions/qti/ingest-assessment-test-one.ts:				logger.info("Successfully created assessment test.", { identifier })
src/inngest/functions/qti/ingest-assessment-test-one.ts:			logger.error("Failed to update assessment test.", { identifier, error: updateResult.error })
src/inngest/functions/qti/ingest-assessment-test-one.ts:		logger.info("Successfully updated assessment test.", { identifier })
src/lib/actions/tracking.ts:import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
src/lib/actions/tracking.ts:			assessmentLineItem: { sourcedId: onerosterLineItemSourcedId, type: "assessmentLineItem" as const },
src/lib/actions/tracking.ts:			assessmentLineItem: { sourcedId: onerosterLineItemSourcedId, type: "assessmentLineItem" as const },
src/lib/actions/tracking.ts:	assessmentTitle?: string
src/lib/actions/tracking.ts:	assessmentPath?: string
src/lib/actions/tracking.ts: * Saves an assessment result and orchestrates XP and proficiency updates.
src/lib/actions/tracking.ts:		score: assessmentScore,
src/lib/actions/tracking.ts:		correctAnswers: assessmentCorrectAnswers,
src/lib/actions/tracking.ts:		totalQuestions: assessmentTotalQuestions,
src/lib/actions/tracking.ts:		metadata: assessmentMetadata,
src/lib/actions/tracking.ts:		assessmentTitle,
src/lib/actions/tracking.ts:		assessmentPath,
src/lib/actions/tracking.ts:	logger.info("saving assessment result", { clerkUserId, ...options })
src/lib/actions/tracking.ts:		assessmentTotalQuestions > 0 ? Math.round((assessmentCorrectAnswers / assessmentTotalQuestions) * 100) : 100
src/lib/actions/tracking.ts:	// Step 2: Save the raw assessment result to OneRoster
src/lib/actions/tracking.ts:	if (unitData && assessmentPath && assessmentTitle && userEmail && expectedXp !== undefined && attemptNumber) {
src/lib/actions/tracking.ts:		logger.info("calculating xp for assessment", { resourceId })
src/lib/actions/tracking.ts:		// Extract subject and course from assessment path (format: /subject/course/...)
src/lib/actions/tracking.ts:		const pathParts = assessmentPath.split("/").filter(Boolean)
src/lib/actions/tracking.ts:			logger.error("invalid assessment path format for XP calculation", {
src/lib/actions/tracking.ts:				assessmentPath,
src/lib/actions/tracking.ts:			throw errors.new("invalid assessment path format")
src/lib/actions/tracking.ts:			logger.error("invalid subject slug in assessment path", {
src/lib/actions/tracking.ts:				assessmentPath,
src/lib/actions/tracking.ts:			throw errors.new("invalid subject slug in assessment path")
src/lib/actions/tracking.ts:			logger.error("missing course slug in assessment path", {
src/lib/actions/tracking.ts:				assessmentPath,
src/lib/actions/tracking.ts:			throw errors.new("missing course slug in assessment path")
src/lib/actions/tracking.ts:				assessmentResourceId: resourceId,
src/lib/actions/tracking.ts:				correctQuestions: assessmentCorrectAnswers,
src/lib/actions/tracking.ts:				totalQuestions: assessmentTotalQuestions,
src/lib/actions/tracking.ts:	// Step 4: Save the assessment result with metadata
src/lib/actions/tracking.ts:	const finalScore = assertPercentageInteger(assessmentScore, "assessment score")
src/lib/actions/tracking.ts:	const baseMetadata = assessmentMetadata
src/lib/actions/tracking.ts:				masteredUnits: assessmentMetadata.masteredUnits,
src/lib/actions/tracking.ts:				totalQuestions: assessmentMetadata.totalQuestions,
src/lib/actions/tracking.ts:				correctQuestions: assessmentMetadata.correctQuestions,
src/lib/actions/tracking.ts:				accuracy: assessmentMetadata.accuracy,
src/lib/actions/tracking.ts:				xp: assessmentMetadata.xp,
src/lib/actions/tracking.ts:				multiplier: assessmentMetadata.multiplier,
src/lib/actions/tracking.ts:				totalQuestions: assessmentTotalQuestions,
src/lib/actions/tracking.ts:				correctQuestions: assessmentCorrectAnswers,
src/lib/actions/tracking.ts:			assessmentLineItem: { sourcedId: onerosterLineItemSourcedId, type: "assessmentLineItem" as const },
src/lib/actions/tracking.ts:					? `${assessmentCorrectAnswers}/${assessmentTotalQuestions} correct on attempt ${attemptNumber}`
src/lib/actions/tracking.ts:					: `${assessmentCorrectAnswers}/${assessmentTotalQuestions} correct on first attempt`,
src/lib/actions/tracking.ts:		logger.error("failed to save assessment result", { clerkUserId, resourceId, error: result.error })
src/lib/actions/tracking.ts:		throw errors.wrap(result.error, "assessment result save")
src/lib/actions/tracking.ts:	logger.info("successfully saved assessment result", {
src/lib/actions/tracking.ts:		score: assessmentScore
src/lib/actions/tracking.ts:	if (unitData && assessmentPath && assessmentTitle && userEmail) {
src/lib/actions/tracking.ts:				id: `${env.NEXT_PUBLIC_APP_DOMAIN}${assessmentPath}`,
src/lib/actions/tracking.ts:				activity: { name: assessmentTitle, id: resourceId },
src/lib/actions/tracking.ts:				totalQuestions: assessmentTotalQuestions,
src/lib/actions/tracking.ts:				correctQuestions: assessmentCorrectAnswers,
src/lib/actions/tracking.ts:			const finalXpForCaliper = xp?.finalXp ?? assessmentMetadata?.xp ?? expectedXp ?? 0
src/lib/actions/tracking.ts:	// Step 4: Update proficiency for interactive assessments
src/lib/actions/tracking.ts:			logger.error("failed to update proficiency from assessment", {
src/lib/actions/tracking.ts:			// Continue execution - proficiency failure should not block assessment save
src/lib/actions/tracking.ts:	// The result sourcedId follows our pattern: use the assessment line item id
src/lib/actions/tracking.ts:	const assessmentResult = result.data
src/lib/actions/tracking.ts:	if (!assessmentResult || typeof assessmentResult.score !== "number") {
src/lib/actions/tracking.ts:	const rawScore = assessmentResult.score
src/lib/actions/tracking.ts:		scoreStatus: assessmentResult.scoreStatus
src/inngest/functions/qti/request-all-item-migrations-for-course.ts:		logger.info("starting all assessment item migrations for course", { courseId })
src/inngest/functions/qti/request-all-item-migrations-for-course.ts:		// Get all exercise IDs from assessments
src/inngest/functions/qti/request-all-item-migrations-for-course.ts:		const assessmentExercisesResult = await errors.try(
src/inngest/functions/qti/request-all-item-migrations-for-course.ts:				.innerJoin(niceAssessments, eq(niceAssessmentExercises.assessmentId, niceAssessments.id))
src/inngest/functions/qti/request-all-item-migrations-for-course.ts:		if (assessmentExercisesResult.error) {
src/inngest/functions/qti/request-all-item-migrations-for-course.ts:			logger.error("failed to fetch assessment exercises for course", {
src/inngest/functions/qti/request-all-item-migrations-for-course.ts:				error: assessmentExercisesResult.error
src/inngest/functions/qti/request-all-item-migrations-for-course.ts:			throw errors.wrap(assessmentExercisesResult.error, "db query for assessment exercises")
src/inngest/functions/qti/request-all-item-migrations-for-course.ts:			...assessmentExercisesResult.data.map((row) => row.exerciseId)
src/inngest/functions/clear-all-assessment-item-data.ts:		id: "clear-all-assessment-item-data",
src/inngest/functions/clear-all-assessment-item-data.ts:		name: "Clear QTI assessment XML/JSON, analysis notes, and QA review table for non-science courses"
src/inngest/functions/clear-all-assessment-item-data.ts:	{ event: "qti/database.clear-assessment-item-data" },
src/inngest/functions/clear-all-assessment-item-data.ts:		logger.info("starting database-wide clearing of assessment item data for non-science courses")
src/inngest/functions/clear-all-assessment-item-data.ts:		logger.info("completed database-wide clearing of non-science assessment item data")
src/components/practice/assessment-start-screen.tsx:import { AssessmentBottomNav, type AssessmentType } from "@/components/practice/assessment-bottom-nav"
src/components/practice/assessment-start-screen.tsx:	expectedXp?: number // Total XP for the assessment
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:			const assessmentItems: AssessmentItem[] = []
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						const identifier = extractIdentifier(item.xml, "qti-assessment-item")
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						assessmentItems.push(result.item)
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:			// 5. Write the final aggregated and validated assessmentItems.json file
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:			await fs.writeFile(path.join(courseDir, "assessmentItems.json"), JSON.stringify(assessmentItems, null, 2))
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:			// ... (All DB queries to fetch exercises, assessments, etc.) ...
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:			// ... (All logic to build test objects using the `assessmentItems` array) ...
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentId: schema.niceAssessments.id,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentTitle: schema.niceAssessments.title,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentType: schema.niceAssessments.type,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentPath: schema.niceAssessments.path,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentSlug: schema.niceAssessments.slug,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentDescription: schema.niceAssessments.description,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							eq(schema.niceAssessments.id, schema.niceAssessmentExercises.assessmentId)
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentId: schema.niceAssessments.id,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentTitle: schema.niceAssessments.title,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentType: schema.niceAssessments.type,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentPath: schema.niceAssessments.path,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentSlug: schema.niceAssessments.slug,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentDescription: schema.niceAssessments.description,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							eq(schema.niceAssessments.id, schema.niceAssessmentExercises.assessmentId)
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:			for (const item of assessmentItems) {
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:			// Limit assessments to exercises that actually belong to this course
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:			const assessmentMap = new Map<
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:				if (!assessmentMap.has(row.assessmentId)) {
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:					assessmentMap.set(row.assessmentId, {
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						title: row.assessmentTitle,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						type: row.assessmentType,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						path: row.assessmentPath,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						slug: row.assessmentSlug,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						description: row.assessmentDescription,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:					assessmentMap.get(row.assessmentId)?.exerciseIds.push(row.exerciseId)
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:					logger.debug("skipping cross-course exercise in assessment", {
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						assessmentId: row.assessmentId,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						assessmentTitle: row.assessmentTitle
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:				assessmentType: string
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:				// Unified deterministic k-bucketing for all assessment types
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:				if (assessmentType === "Exercise") targetCount = 4
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:				else if (assessmentType === "Quiz") targetCount = 8
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:				else if (assessmentType === "UnitTest") targetCount = 12
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:									`<qti-assessment-item-ref identifier="${q.id}" href="/assessment-items/${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						return `        <qti-assessment-section identifier="SECTION_${id}_BUCKET_${i}" title="${safeTitle}" visible="false">
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:        </qti-assessment-section>`
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${id}" title="${safeTitle}">
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:</qti-assessment-test>`
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:			const explicitTestsCandidatesRaw: Array<AssessmentTestCandidate | null> = Array.from(assessmentMap.entries()).map(
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:				([assessmentId, data]) => {
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							logger.warn("exercise referenced by assessment has no questions", {
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:								assessmentId,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:								assessmentTitle: data.title
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						logger.info("skipping assessment without questions", {
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentId,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentTitle: data.title,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentType: data.type
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						// Find the assessment item by its QTI identifier
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						const item = assessmentItems.find((item) => {
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							logger.error("qti item not found when building test", { qtiId, assessmentId })
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							logger.error("qti item missing metadata when building test", { qtiId, assessmentId })
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							logger.error("qti item metadata missing exercise info when building test", { qtiId, assessmentId })
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						logger.info("skipping assessment with zero mapped questions after filtering", {
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentId,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentTitle: data.title,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:							assessmentType: data.type
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:					return buildTestObject(assessmentId, data.title, allQuestionsForTest, data.type)
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:					const item = assessmentItems.find((item) => {
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:									`<qti-assessment-item-ref identifier="${q.id}" href="/assessment-items/${q.id}" sequence="${index + 1}"></qti-assessment-item-ref>`
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:						return `        <qti-assessment-section identifier="SECTION_${exercise.id}_BUCKET_${i}" title="${safeTitle}" visible="false">
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:					        </qti-assessment-section>`
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${exercise.id}" title="${safeTitle}">
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:</qti-assessment-test>`
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:			// Ghetto-validate assessment tests (batched upsert + immediate delete)
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:			const assessmentTests = validatedTests.map((t) => t.xml)
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:			// 7. Write the final assessmentTests.json file
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:			await fs.writeFile(path.join(courseDir, "assessmentTests.json"), JSON.stringify(assessmentTests, null, 2))
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:				validatedItemCount: assessmentItems.length,
src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts:				testCount: assessmentTests.length
src/inngest/functions/qti/backfill-stimuli.ts:		const eventsToDispatch: Array<{ name: "qti/assessment-stimulus.ingest.one"; data: { courseSlug: string; identifier: string } }> = []
src/inngest/functions/qti/backfill-stimuli.ts:				const updatedXml = replaceRootAttributes(s.xml, "qti-assessment-stimulus", identifier, extractedTitle)
src/inngest/functions/qti/backfill-stimuli.ts:				fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(stimulusPayload, null, 2))
src/inngest/functions/qti/backfill-stimuli.ts:				logger.error("file write", { file: path.join(courseDir, "assessmentStimuli.json"), error: writeResult.error })
src/inngest/functions/qti/backfill-stimuli.ts:					name: "qti/assessment-stimulus.ingest.one",
src/inngest/functions/qti/convert-perseus-question-to-qti-item.ts:import { compile } from "@superbuilders/qti-assessment-item-generator/compiler"
src/inngest/functions/qti/convert-perseus-question-to-qti-item.ts:} from "@superbuilders/qti-assessment-item-generator/structured"
src/inngest/functions/qti/convert-perseus-question-to-qti-item.ts:import { buildPerseusEnvelope } from "@superbuilders/qti-assessment-item-generator/structured/ai-context-builder"
src/inngest/functions/qti/convert-perseus-question-to-qti-item.ts:import { widgetCollections } from "@superbuilders/qti-assessment-item-generator/widgets/collections"
src/inngest/functions/orchestrate-course-upload-to-qti-by-slug.ts:			readJsonFile("assessmentItems.json"),
src/inngest/functions/orchestrate-course-upload-to-qti-by-slug.ts:			readJsonFile("assessmentStimuli.json"),
src/inngest/functions/orchestrate-course-upload-to-qti-by-slug.ts:			readJsonFile("assessmentTests.json")
src/inngest/functions/orchestrate-course-upload-to-qti-by-slug.ts:				const identifier = extractIdentifier(stimulus.xml, "qti-assessment-stimulus")
src/inngest/functions/orchestrate-course-upload-to-qti-by-slug.ts:				return identifier ? { name: "qti/assessment-stimulus.ingest.one", data: { courseSlug, identifier } } : null
src/inngest/functions/orchestrate-course-upload-to-qti-by-slug.ts:				const identifier = extractIdentifier(testXml, "qti-assessment-test")
src/inngest/functions/orchestrate-course-upload-to-qti-by-slug.ts:				return identifier ? { name: "qti/assessment-test.ingest.one", data: { courseSlug, identifier } } : null
src/inngest/functions/orchestrate-course-upload-to-qti-by-slug.ts:				const identifier = extractIdentifier(item.xml, "qti-assessment-item")
src/inngest/functions/orchestrate-course-upload-to-qti-by-slug.ts:				return identifier ? { name: "qti/assessment-item.ingest.one", data: { courseSlug, identifier } } : null
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:import { ingestAssessmentLineItems } from "@/inngest/functions/oneroster/ingest-assessment-line-items"
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:		id: "orchestrate-hardcoded-science-assessmentlineitem-upload",
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:	{ event: "migration/hardcoded.science.assessmentLineItem.upload" },
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:		logger.info("starting hardcoded science assessment line item upload", {
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:			// Read assessment line items from filesystem
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:			const assessmentLineItems = await step.run(`read-assessment-line-items-${courseId}`, async () => {
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:				logger.info("reading assessment line items for course", { courseId, courseSlug })
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:				const filePath = path.join(courseDir, "assessmentLineItems.json")
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:					logger.error("failed to read assessment line items file", {
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:					throw errors.wrap(fileResult.error, "read assessment line items file")
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:					logger.error("failed to parse assessment line items json", {
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:					throw errors.wrap(parseResult.error, "parse assessment line items json")
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:				logger.info("read assessment line items from disk", {
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:			if (assessmentLineItems.length > 0) {
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:				await step.invoke(`invoke-ingest-assessment-line-items-${courseId}`, {
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:					data: { assessmentLineItems }
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:			logger.info("completed assessment line item upload for course", { courseId })
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:		logger.info("successfully completed assessment line item upload for all hardcoded science courses")
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							assessmentId: schema.niceAssessments.id,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							assessmentTitle: schema.niceAssessments.title,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							assessmentType: schema.niceAssessments.type,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							assessmentPath: schema.niceAssessments.path,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							assessmentSlug: schema.niceAssessments.slug,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							assessmentDescription: schema.niceAssessments.description,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							eq(schema.niceAssessments.id, schema.niceAssessmentExercises.assessmentId)
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							assessmentId: schema.niceAssessments.id,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							assessmentTitle: schema.niceAssessments.title,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							assessmentType: schema.niceAssessments.type,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							assessmentPath: schema.niceAssessments.path,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							assessmentSlug: schema.niceAssessments.slug,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							assessmentDescription: schema.niceAssessments.description,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							eq(schema.niceAssessments.id, schema.niceAssessmentExercises.assessmentId)
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:					const finalXml = replaceRootAttributes(q.xml, "qti-assessment-item", `nice_${q.id}`, q.exerciseTitle)
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:					const finalXml = replaceRootAttributes(a.xml, "qti-assessment-stimulus", `nice_${a.id}`, a.title)
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:				const assessmentMap = new Map<
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:					if (!assessmentMap.has(row.assessmentId)) {
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:						assessmentMap.set(row.assessmentId, {
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							title: row.assessmentTitle,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							type: row.assessmentType,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							path: row.assessmentPath,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							slug: row.assessmentSlug,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							description: row.assessmentDescription,
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:					assessmentMap.get(row.assessmentId)?.exerciseIds.push(row.exerciseId)
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:					assessmentType: string
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:					if (assessmentType === "CourseChallenge") {
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:											`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:								return `        <qti-assessment-section identifier="SECTION_${id}_BUCKET_${i}" title="${safeTitle}" visible="false">
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:        </qti-assessment-section>`
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${id}" title="${safeTitle}">
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:</qti-assessment-test>`
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:					if (assessmentType === "UnitTest") {
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:											`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:								return `        <qti-assessment-section identifier="SECTION_${id}_BUCKET_${i}" title="${safeTitle}" visible="false">
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:        </qti-assessment-section>`
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${id}" title="${safeTitle}">
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:</qti-assessment-test>`
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:					if (assessmentType === "Quiz" || assessmentType === "Exercise") {
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:						const targetCount = assessmentType === "Quiz" ? 8 : 4
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:											`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:								const visibleAttr = assessmentType === "Exercise" ? "true" : "false"
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:								return `        <qti-assessment-section identifier="SECTION_${id}_BUCKET_${i}" title="${safeTitle}" visible="${visibleAttr}">
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:        </qti-assessment-section>`
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${id}" title="${safeTitle}">
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:</qti-assessment-test>`
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:				const explicitTests = Array.from(assessmentMap.entries()).map(([assessmentId, data]) => {
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:					return buildTestObject(assessmentId, data.title, allQuestionsForTest, data.type)
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:										`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							return `        <qti-assessment-section identifier="SECTION_${exercise.id}_BUCKET_${i}" title="${safeTitle}" visible="false">
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:	        </qti-assessment-section>`
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:<qti-assessment-test xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\" identifier=\"nice_${exercise.id}\" title=\"${safeTitle}\">
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:	    <qti-test-part identifier=\"PART_1\" navigation-mode=\"nonlinear\" submission-mode=\"individual\">\n${selectionStrategy}\n    </qti-test-part>\n</qti-assessment-test>`
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:						fs.writeFile(path.join(courseDir, "assessmentItems.json"), JSON.stringify(items, null, 2)),
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:						fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(stimuli, null, 2)),
src/inngest/functions/migrations/orchestrate-hardcoded-history-qti-generate-undifferentiated.ts:							path.join(courseDir, "assessmentTests.json"),
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:// Schema for the expected assessment item format
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							assessmentId: schema.niceAssessments.id,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							assessmentTitle: schema.niceAssessments.title,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							assessmentType: schema.niceAssessments.type,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							assessmentPath: schema.niceAssessments.path,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							assessmentSlug: schema.niceAssessments.slug,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							assessmentDescription: schema.niceAssessments.description,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							eq(schema.niceAssessments.id, schema.niceAssessmentExercises.assessmentId)
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							assessmentId: schema.niceAssessments.id,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							assessmentTitle: schema.niceAssessments.title,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							assessmentType: schema.niceAssessments.type,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							assessmentPath: schema.niceAssessments.path,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							assessmentSlug: schema.niceAssessments.slug,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							assessmentDescription: schema.niceAssessments.description,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							eq(schema.niceAssessments.id, schema.niceAssessmentExercises.assessmentId)
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:					const finalXml = replaceRootAttributes(q.xml, "qti-assessment-item", `nice_${q.id}`, q.exerciseTitle)
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:					const finalXml = replaceRootAttributes(a.xml, "qti-assessment-stimulus", `nice_${a.id}`, a.title)
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:				const assessmentMap = new Map<
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:					if (!assessmentMap.has(row.assessmentId)) {
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:						assessmentMap.set(row.assessmentId, {
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							title: row.assessmentTitle,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							type: row.assessmentType,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							path: row.assessmentPath,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							slug: row.assessmentSlug,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							description: row.assessmentDescription,
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:					assessmentMap.get(row.assessmentId)?.exerciseIds.push(row.exerciseId)
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:					assessmentType: string
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:					if (assessmentType === "CourseChallenge") {
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:											`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:								return `        <qti-assessment-section identifier=\"SECTION_${id}_BUCKET_${i}\" title=\"${safeTitle}\" visible=\"false\">
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:        </qti-assessment-section>`
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:<qti-assessment-test xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\" identifier=\"nice_${id}\" title=\"${safeTitle}\">
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:</qti-assessment-test>`
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:					if (assessmentType === "UnitTest") {
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:											`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:								return `        <qti-assessment-section identifier=\"SECTION_${id}_BUCKET_${i}\" title=\"${safeTitle}\" visible=\"false\">
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:        </qti-assessment-section>`
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:<qti-assessment-test xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\" identifier=\"nice_${id}\" title=\"${safeTitle}\">
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:</qti-assessment-test>`
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:					if (assessmentType === "Quiz" || assessmentType === "Exercise") {
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:						const targetCount = assessmentType === "Quiz" ? 8 : 4
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:											`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:								const visibleAttr = assessmentType === "Exercise" ? "true" : "false"
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:								return `        <qti-assessment-section identifier="SECTION_${id}_BUCKET_${i}" title="${safeTitle}" visible="${visibleAttr}">
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:        </qti-assessment-section>`
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${id}" title="${safeTitle}">
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:</qti-assessment-test>`
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:				const explicitTests = Array.from(assessmentMap.entries()).map(([assessmentId, data]) => {
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:					return buildTestObject(assessmentId, data.title, allQuestionsForTest, data.type)
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:										`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							return `        <qti-assessment-section identifier="SECTION_${exercise.id}_BUCKET_${i}" title="${safeTitle}" visible="false">
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:	        </qti-assessment-section>`
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:<qti-assessment-test xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\" identifier=\"nice_${exercise.id}\" title=\"${safeTitle}\">
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:    <qti-test-part identifier=\"PART_1\" navigation-mode=\"nonlinear\" submission-mode=\"individual\">\n${selectionStrategy}\n    </qti-test-part>\n</qti-assessment-test>`
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:						fs.writeFile(path.join(courseDir, "assessmentItems.json"), JSON.stringify(items, null, 2)),
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:						fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(stimuli, null, 2)),
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-generate-undifferentiated.ts:							path.join(courseDir, "assessmentTests.json"),
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:import { ingestAssessmentLineItems } from "@/inngest/functions/oneroster/ingest-assessment-line-items"
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:			const [courseComponents, resources, componentResources, assessmentLineItems] = await Promise.all([
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:				readFile("assessmentLineItems.json")
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:			return { courseComponents, resources, componentResources, assessmentLineItems }
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:			assessmentLineItemCount: payload.assessmentLineItems.length
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:		if (payload.assessmentLineItems.length > 0) {
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:			await step.invoke("invoke-ingest-assessment-line-items", {
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:				data: { assessmentLineItems: payload.assessmentLineItems }
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:				assessmentLineItems: payload.assessmentLineItems.length
src/app/(user)/[subject]/[course]/(practice)/[unit]/test/[test]/page.tsx:import { fetchTestRedirectPath } from "@/lib/data/assessment"
src/inngest/functions/migrations/orchestrate-hardcoded-math-stimulus-generation.ts:				const assessmentStimuli = allArticles.map((a) => {
src/inngest/functions/migrations/orchestrate-hardcoded-math-stimulus-generation.ts:					const finalXml = replaceRootAttributes(a.xml, "qti-assessment-stimulus", `nice_${a.id}`, a.title)
src/inngest/functions/migrations/orchestrate-hardcoded-math-stimulus-generation.ts:					fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(assessmentStimuli, null, 2))
src/inngest/functions/migrations/orchestrate-hardcoded-math-stimulus-generation.ts:						file: path.join(courseDir, "assessmentStimuli.json")
src/inngest/functions/migrations/orchestrate-hardcoded-math-stimulus-generation.ts:					stimuli: assessmentStimuli.length
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:// Schema for the expected assessment item format
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							assessmentId: schema.niceAssessments.id,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							assessmentTitle: schema.niceAssessments.title,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							assessmentType: schema.niceAssessments.type,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							assessmentPath: schema.niceAssessments.path,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							assessmentSlug: schema.niceAssessments.slug,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							assessmentDescription: schema.niceAssessments.description,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							eq(schema.niceAssessments.id, schema.niceAssessmentExercises.assessmentId)
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							assessmentId: schema.niceAssessments.id,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							assessmentTitle: schema.niceAssessments.title,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							assessmentType: schema.niceAssessments.type,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							assessmentPath: schema.niceAssessments.path,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							assessmentSlug: schema.niceAssessments.slug,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							assessmentDescription: schema.niceAssessments.description,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							eq(schema.niceAssessments.id, schema.niceAssessmentExercises.assessmentId)
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:					const finalXml = replaceRootAttributes(q.xml, "qti-assessment-item", `nice_${q.id}`, q.exerciseTitle)
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:					const finalXml = replaceRootAttributes(a.xml, "qti-assessment-stimulus", `nice_${a.id}`, a.title)
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:				const assessmentMap = new Map<
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:					if (!assessmentMap.has(row.assessmentId)) {
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:						assessmentMap.set(row.assessmentId, {
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							title: row.assessmentTitle,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							type: row.assessmentType,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							path: row.assessmentPath,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							slug: row.assessmentSlug,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							description: row.assessmentDescription,
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:					assessmentMap.get(row.assessmentId)?.exerciseIds.push(row.exerciseId)
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:					assessmentType: string
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:					if (assessmentType === "CourseChallenge") {
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:											`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:								return `        <qti-assessment-section identifier=\"SECTION_${id}_BUCKET_${i}\" title=\"${safeTitle}\" visible=\"false\">
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:					</qti-assessment-section>`
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:<qti-assessment-test xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\" identifier=\"nice_${id}\" title=\"${safeTitle}\">
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:</qti-assessment-test>`
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:					if (assessmentType === "UnitTest") {
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:											`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:								return `        <qti-assessment-section identifier=\"SECTION_${id}_BUCKET_${i}\" title=\"${safeTitle}\" visible=\"false\">
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:					</qti-assessment-section>`
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:<qti-assessment-test xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\" identifier=\"nice_${id}\" title=\"${safeTitle}\">
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:</qti-assessment-test>`
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:					if (assessmentType === "Quiz" || assessmentType === "Exercise") {
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:						const targetCount = assessmentType === "Quiz" ? 8 : 4
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:											`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:								const visibleAttr = assessmentType === "Exercise" ? "true" : "false"
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:								return `        <qti-assessment-section identifier="SECTION_${id}_BUCKET_${i}" title="${safeTitle}" visible="${visibleAttr}">
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:					        </qti-assessment-section>`
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${id}" title="${safeTitle}">
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:</qti-assessment-test>`
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:				const explicitTests = Array.from(assessmentMap.entries()).map(([assessmentId, data]) => {
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:					return buildTestObject(assessmentId, data.title, allQuestionsForTest, data.type)
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:										`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							return `        <qti-assessment-section identifier="SECTION_${exercise.id}_BUCKET_${i}" title="${safeTitle}" visible="false">
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:					        </qti-assessment-section>`
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:<qti-assessment-test xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\" identifier=\"nice_${exercise.id}\" title=\"${safeTitle}\">
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:    <qti-test-part identifier=\"PART_1\" navigation-mode=\"nonlinear\" submission-mode=\"individual\">\n${selectionStrategy}\n    </qti-test-part>\n</qti-assessment-test>`
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:						fs.writeFile(path.join(courseDir, "assessmentItems.json"), JSON.stringify(items, null, 2)),
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:						fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(stimuli, null, 2)),
src/inngest/functions/migrations/orchestrate-hardcoded-math-qti-generate-undifferentiated.ts:							path.join(courseDir, "assessmentTests.json"),
src/inngest/functions/migrations/orchestrate-hardcoded-slug-qti-generation-and-upload.ts:			const finalXml = replaceRootAttributes(q.xml, "qti-assessment-item", `nice_${q.id}`, exerciseTitle)
src/inngest/functions/migrations/orchestrate-hardcoded-slug-qti-generation-and-upload.ts:<qti-assessment-item-ref identifier=\"nice_${q.id}\" href=\"/assessment-items/nice_${q.id}\" sequence=\"${idx + 1}\"></qti-assessment-item-ref>`
src/inngest/functions/migrations/orchestrate-hardcoded-slug-qti-generation-and-upload.ts:						return `        <qti-assessment-section identifier=\"SECTION_${ex.exerciseId}_BUCKET_${i}\" title=\"${safeTitle}\" visible=\"false\">\n\t\t    <qti-selection select=\"1\" with-replacement=\"false\"/>\n\t\t    <qti-ordering shuffle=\"true\"/>\n\t\t    ${itemRefsXml}\n\t\t</qti-assessment-section>`
src/inngest/functions/migrations/orchestrate-hardcoded-slug-qti-generation-and-upload.ts:				return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<qti-assessment-test xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\" identifier=\"nice_${ex.exerciseId}\" title=\"${safeTitle}\">\n    <qti-outcome-declaration identifier=\"SCORE\" cardinality=\"single\" base-type=\"float\">\n        <qti-default-value><qti-value>0.0</qti-value></qti-default-value>\n    </qti-outcome-declaration>\n    <qti-test-part identifier=\"PART_1\" navigation-mode=\"nonlinear\" submission-mode=\"individual\">\n${sectionsXml}\n    </qti-test-part>\n</qti-assessment-test>`
src/inngest/functions/migrations/orchestrate-hardcoded-slug-qti-generation-and-upload.ts:				fs.writeFile(path.join(outDir, "assessmentItems.json"), JSON.stringify(items, null, 2)),
src/inngest/functions/migrations/orchestrate-hardcoded-slug-qti-generation-and-upload.ts:				fs.writeFile(path.join(outDir, "assessmentTests.json"), JSON.stringify(tests, null, 2))
src/inngest/functions/migrations/orchestrate-hardcoded-slug-qti-generation-and-upload.ts:			name: "qti/assessment-item.ingest.one" as const,
src/inngest/functions/migrations/orchestrate-hardcoded-slug-qti-generation-and-upload.ts:			.map((ex) => ({ name: "qti/assessment-test.ingest.one" as const, data: { courseSlug: OUTPUT_SLUG, identifier: `nice_${ex.exerciseId}` } }))
src/app/(user)/[subject]/[course]/(practice)/[unit]/quiz/[quiz]/page.tsx:import { fetchQuizRedirectPath } from "@/lib/data/assessment"
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-backup.ts:			const assessmentIds = (
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-backup.ts:				assessments: assessmentIds.length
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-backup.ts:					logger.error("missing metadata for assessment item from qti backend", { questionId: qid, identifier })
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-backup.ts:			for (const asmtId of assessmentIds) {
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-backup.ts:						logger.warn("assessment test not found in qti backend during backup; skipping", { assessmentId: asmtId, identifier })
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-backup.ts:					logger.error("qti backend: get assessment test failed", { assessmentId: asmtId, identifier, error: r.error })
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-backup.ts:					fs.writeFile(path.join(dir, "assessmentItems.json"), JSON.stringify(items, null, 2)),
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-backup.ts:					fs.writeFile(path.join(dir, "assessmentStimuli.json"), JSON.stringify(stimuli, null, 2)),
src/inngest/functions/migrations/orchestrate-hardcoded-science-qti-backup.ts:					fs.writeFile(path.join(dir, "assessmentTests.json"), JSON.stringify(tests, null, 2))
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:import { fetchCourseChallengePage_LayoutData, fetchCourseChallengePage_TestData } from "@/lib/data/assessment"
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:				// Convert unit-level assessments (quizzes, unit tests)
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:					.map((assessment) => {
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:						const pathSegment = assessment.type === "Quiz" ? "quiz" : "test"
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:							? `${unit.path}/${lastLesson.slug}/${pathSegment}/${assessment.slug}`
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:							: assessment.path
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:						if (assessment.type === "Quiz") {
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:								id: assessment.id,
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:								componentResourceSourcedId: assessment.componentResourceSourcedId,
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:								slug: assessment.slug,
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:								title: assessment.title,
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:							id: assessment.id,
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:							componentResourceSourcedId: assessment.componentResourceSourcedId,
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:							slug: assessment.slug,
src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx:							title: assessment.title,
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/e/[exercise]/components/content.tsx:import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/e/[exercise]/components/content.tsx:import { AssessmentStepper } from "@/components/practice/assessment-stepper"
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/e/[exercise]/components/content.tsx:				assessmentTitle={exercise.title}
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/e/[exercise]/components/content.tsx:				assessmentPath={exercise.path}
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/e/[exercise]/components/content.tsx:					// Bump key so the assessment stepper remounts on next start
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/components/lesson-footer.tsx:	// Find the current material (lesson or assessment) first
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/components/lesson-footer.tsx:			// Look for next material (could be another lesson or assessment)
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/components/lesson-footer.tsx:					nextItem = nextMaterial // Next assessment (Quiz, UnitTest, CourseChallenge)
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/components/lesson-footer.tsx:		// Current is an assessment (Quiz, UnitTest, CourseChallenge), look for next material
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/components/lesson-footer.tsx:				nextItem = nextMaterial // Next assessment
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/components/lesson-layout.tsx:				// Non-lesson materials are assessments (Quiz, UnitTest, CourseChallenge)
src/app/(user)/[subject]/[course]/(practice)/test/[test]/components/content.tsx:import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
src/app/(user)/[subject]/[course]/(practice)/test/[test]/components/content.tsx:import { AssessmentStepper } from "@/components/practice/assessment-stepper"
src/app/(user)/[subject]/[course]/(practice)/test/[test]/components/content.tsx:				assessmentTitle={test.title}
src/app/(user)/[subject]/[course]/(practice)/test/[test]/components/content.tsx:				assessmentPath={test.path}
src/app/(user)/[subject]/[course]/(practice)/test/[test]/components/content.tsx:					// Bump key so the assessment stepper remounts on next start
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/quiz/[quiz]/page.tsx:import { fetchQuizPageData } from "@/lib/data/assessment"
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:					// Convert unit-level assessments (quizzes, unit tests)
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:						.map((assessment) => {
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:							const originalIndex = unit.children.findIndex((child) => child.id === assessment.id)
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:							// Map assessment types to URL segments
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:							const pathSegment = assessment.type === "Quiz" ? "quiz" : "test"
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:								? `${unit.path}/${lastLesson.slug}/${pathSegment}/${assessment.slug}`
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:								: assessment.path // fallback to original path if no lessons found
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:							if (assessment.type === "Quiz") {
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:									id: assessment.id,
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:									componentResourceSourcedId: assessment.componentResourceSourcedId,
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:									slug: assessment.slug,
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:									title: assessment.title,
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:								id: assessment.id,
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:								componentResourceSourcedId: assessment.componentResourceSourcedId,
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:								slug: assessment.slug,
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx:								title: assessment.title,
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/quiz/[quiz]/components/content.tsx:import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/quiz/[quiz]/components/content.tsx:import { AssessmentStepper } from "@/components/practice/assessment-stepper"
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/quiz/[quiz]/components/content.tsx:				assessmentTitle={quiz.title}
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/quiz/[quiz]/components/content.tsx:				assessmentPath={quiz.path}
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/quiz/[quiz]/components/content.tsx:					// Bump key so the assessment stepper remounts on next start
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/test/[test]/page.tsx:import { fetchUnitTestPageData } from "@/lib/data/assessment"
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/test/[test]/components/content.tsx:import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/test/[test]/components/content.tsx:import { AssessmentStepper } from "@/components/practice/assessment-stepper"
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/test/[test]/components/content.tsx:				assessmentTitle={test.title}
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/test/[test]/components/content.tsx:				assessmentPath={test.path}
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/test/[test]/components/content.tsx:					// Bump key so the assessment stepper remounts on next start
```


## Assistant

<thinking>


**Inspecting AssessmentStepper component**
</thinking>

**Tool Call: Read assessment-stepper.tsx**
Status: Completed

```tsx
"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import confetti from "canvas-confetti"
import { Lock, Unlock } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { AssessmentBottomNav, type AssessmentType } from "@/components/practice/assessment-bottom-nav"
import { AssessmentLoadingSkeleton } from "@/components/practice/assessment-loading-skeleton"
import greenFriend from "@/components/practice/course/unit/lesson/exercise/images/green-friend_v3.png"
import lightBlueFriend from "@/components/practice/course/unit/lesson/exercise/images/light-blue-friend_v3.png"
import spaceFriend from "@/components/practice/course/unit/lesson/exercise/images/space-friend_v3.png"
import quizIllustration from "@/components/practice/course/unit/quiz/images/quiz-illustration.png"
import testIllustration from "@/components/practice/course/unit/test/images/test-illustration.png"
import { useLessonProgress } from "@/components/practice/lesson-progress-context"
import { QTIRenderer } from "@/components/qti-renderer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import {
	finalizeAssessment,
	getOrCreateAssessmentState,
	processQuestionResponse,
	reportQuestion,
	skipQuestion,
	startNewAssessmentAttempt,
	submitAnswer
} from "@/lib/actions/assessment"
import type { AssessmentState } from "@/lib/assessment-cache"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import type { Question, Unit } from "@/lib/types/domain"
import type { LessonLayoutData } from "@/lib/types/page"
import { cn } from "@/lib/utils"

// Shared helper: render XP penalty alert
function renderPenaltyAlert(penaltyXp: number, contentType: string, xpReason?: string, avgSecondsPerQuestion?: number) {
	const isDark = contentType === "Exercise" || contentType === "Quiz" || contentType === "Test"
	return (
		<Alert
			className={cn(
				"backdrop-blur-sm",
				isDark
					? "border-white/15 bg-white/5 text-white [&_[data-slot=alert-description]]:text-white/80"
					: "border-red-200 bg-red-50 text-red-900 [&_[data-slot=alert-description]]:text-red-900"
			)}
		>
			<AlertTitle className={cn(isDark ? "text-white" : "text-red-900")}>XP penalty applied</AlertTitle>
			<AlertDescription>
				<p>
					{xpReason || "insincere effort detected"}. Deducted
					<span className="font-semibold"> {Math.abs(penaltyXp)} XP</span>
					{typeof avgSecondsPerQuestion === "number" && <> (~{avgSecondsPerQuestion.toFixed(1)}s per question)</>}
				</p>
				<p>Slow down and aim for accuracy to earn XP.</p>
			</AlertDescription>
		</Alert>
	)
}

// Summary View Component
function SummaryView({
	title,
	subtitle,
	titleClass,
	bgClass,
	showCharacters,
	correctAnswersCount,
	totalQuestions,
	contentType,
	assessmentTitle,
	onComplete,
	handleReset,
	nextItem,
	isNextEnabled,
	penaltyXp,
	xpReason,
	avgSecondsPerQuestion
}: {
	title: string
	subtitle: string
	titleClass: string
	bgClass: string
	showCharacters: boolean
	correctAnswersCount: number | null
	totalQuestions: number | null
	contentType: AssessmentType
	assessmentTitle: string
	onComplete?: () => void
	handleReset: () => void
	nextItem: { text: string; path: string } | null
	isNextEnabled?: boolean
	penaltyXp?: number
	xpReason?: string
	avgSecondsPerQuestion?: number
}) {
	return (
		<div className="flex flex-col h-full bg-white">
			{/* Summary Header */}
			<div className="bg-white p-6 border-b border-gray-200 flex-shrink-0 text-center">
				<h1 className="text-2xl font-bold text-gray-900">{assessmentTitle}</h1>
			</div>

			{/* Summary Content */}
			<div
				className={`flex-1 flex flex-col items-center justify-center ${showCharacters ? "p-12 pb-32" : "p-12"} ${bgClass} relative`}
			>
				<div className="text-center max-w-2xl z-10">
					<h2 className={`text-4xl font-bold mb-4 whitespace-nowrap ${titleClass}`}>{title}</h2>
					{subtitle && (
						<p
							className={`text-lg mb-8 whitespace-nowrap ${contentType === "Exercise" || contentType === "Quiz" || contentType === "Test" ? "text-blue-100" : "text-gray-700"}`}
						>
							{subtitle}
						</p>
					)}
					{typeof penaltyXp === "number" && penaltyXp < 0 && (
						<div className="mt-6 w-full max-w-xl mx-auto">
							{renderPenaltyAlert(penaltyXp, contentType, xpReason, avgSecondsPerQuestion)}
						</div>
					)}
					<div className="mt-8">
						{typeof correctAnswersCount === "number" && typeof totalQuestions === "number" && (
							<p
								className={`text-3xl font-bold ${contentType === "Exercise" || contentType === "Quiz" || contentType === "Test" ? "text-white" : "text-gray-900"}`}
							>
								{correctAnswersCount}/{totalQuestions} correct
							</p>
						)}
					</div>
				</div>

				{/* Illustrations based on content type */}
				{showCharacters && contentType === "Exercise" && (
					<div className="absolute bottom-0 flex flex-row w-full justify-center items-end overflow-hidden h-1/3 max-h-64">
						<Image
							src={spaceFriend}
							alt="Exercise illustration"
							className="max-w-full max-h-full min-h-0 min-w-0 object-contain object-bottom flex-1"
						/>
						<Image
							src={greenFriend}
							alt="Exercise illustration"
							className="max-w-full max-h-full min-h-0 min-w-0 object-contain object-bottom flex-1"
						/>
						<Image
							src={lightBlueFriend}
							alt="Exercise illustration"
							className="max-w-full max-h-full min-h-0 min-w-0 object-contain object-bottom flex-1"
						/>
					</div>
				)}
				{showCharacters && contentType === "Quiz" && (
					<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 justify-center items-center overflow-hidden h-1/2 max-h-80 w-full hidden [@media(min-height:600px)]:block">
						<Image src={quizIllustration} alt="Quiz illustration" className="w-full h-full object-contain" />
					</div>
				)}
				{showCharacters && contentType === "Test" && (
					<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 justify-center items-center overflow-hidden h-2/3 max-h-96 w-full hidden [@media(min-height:600px)]:block">
						<Image src={testIllustration} alt="Test illustration" className="w-full h-full object-contain" />
					</div>
				)}
			</div>

			<AssessmentBottomNav
				contentType={contentType}
				onContinue={() => {
					// Navigate to next content or complete
					onComplete?.()
				}}
				isEnabled={true}
				isComplete={true}
				currentQuestion={(totalQuestions ?? 0) + 1} // Setting this higher than totalQuestions to trigger complete state
				totalQuestions={totalQuestions ?? undefined}
				onReset={() => {
					// Reset the entire assessment to try again
					handleReset()
				}}
				nextItem={nextItem}
				nextEnabled={isNextEnabled}
			/>
		</div>
	)
}

interface AssessmentStepperProps {
	questions: Question[]
	contentType: AssessmentType
	onComplete?: () => void
	onerosterComponentResourceSourcedId: string // The OneRoster componentResource sourcedId - used by PowerPath
	onerosterResourceSourcedId: string // The OneRoster resource sourcedId - used for OneRoster assessment results
	onerosterCourseSourcedId: string // The parent course ID for cache invalidation
	assessmentTitle: string
	assessmentPath: string // The canonical URL path for this assessment
	unitData?: Unit
	expectedXp: number
```


## Assistant

<thinking>


**Identifying server-side actions**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
"use server"

import { randomUUID } from "node:crypto"
// Note: services are framework-agnostic. Do not import auth or Next APIs here.
import { auth, clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import {
	type AssessmentQuestionState,
	type AssessmentState,
	createAssessmentState,
	deleteAssessmentState,
	ErrAssessmentStateNotFound,
	getAssessmentState,
	markAssessmentFinalizationFailed,
	markAssessmentFinalized,
	updateStateAndQuestion
} from "@/lib/assessment-cache"
import { getCurrentUserSourcedId, isUserAuthorizedForQuestion } from "@/lib/authorization"
import { oneroster, qti } from "@/lib/clients"
import { XP_PROFICIENCY_THRESHOLD } from "@/lib/constants/progress"
import { isSubjectSlug } from "@/lib/constants/subjects"
import { fetchAndResolveQuestions } from "@/lib/data/fetchers/interactive-helpers"
import type { SaveAssessmentResultCommand } from "@/lib/dtos/assessment"
import { applyQtiSelectionAndOrdering } from "@/lib/qti-selection"
import * as assessment from "@/lib/services/assessment"
import * as attempt from "@/lib/services/attempt"
import type { Question, Unit } from "@/lib/types/domain"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
import { findLatestInteractiveAttempt } from "@/lib/utils/assessment-results"
import { assertPercentageInteger } from "@/lib/utils/score"

/**
 * IMPORTANT NOTE ABOUT POWERPATH TERMINOLOGY:
 *
 * PowerPath's API uses the term "lesson" for what OneRoster calls a "componentResource".
 * This is a naming mismatch between the two systems:
 * - OneRoster hierarchy: Course → CourseComponent → ComponentResource
 * - PowerPath terminology: "lesson" = OneRoster's ComponentResource
 *
 * In this file, we use OneRoster's correct terminology in our function parameters
 * (onerosterComponentResourceSourcedId) but pass it to PowerPath's "lesson" field.
 */

/**
 * Retrieves a deterministic list of questions for an assessment based on user, assessment, and attempt.
 * This ensures the same questions are shown for a specific attempt, even after page refresh.
 */
async function getDeterministicQuestionList(
	userSourcedId: string,
	assessmentResourceSourcedId: string,
	attemptNumber: number
): Promise<Question[]> {
	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(assessmentResourceSourcedId)

	const questions = applyQtiSelectionAndOrdering(assessmentTest, resolvedQuestions, {
		baseSeed: `${userSourcedId}:${assessmentResourceSourcedId}`,
		attemptNumber,
		userSourceId: userSourcedId,
		resourceSourcedId: assessmentResourceSourcedId
	})

	return questions
}

/**
 * Processes a question response using the QTI API.
 * This server action wraps the API calls that should never be called from client components.
 *
 * @param qtiItemId - The QTI assessment item ID (e.g., nice_question123)
 * @param selectedResponse - The user's selected response
 * @param responseIdentifier - The identifier for the response being submitted
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId - used by PowerPath
 * @param isInteractiveAssessment - Whether this is a quiz or test (vs exercise)
 * @param assessmentAttemptNumber - The attempt number (0 = first attempt)
 */
export async function processQuestionResponse(
	qtiItemId: string,
	selectedResponse: string | unknown[] | Record<string, unknown>,
	responseIdentifier: string,
	onerosterComponentResourceSourcedId?: string,
	isInteractiveAssessment?: boolean,
	assessmentAttemptNumber?: number
) {
	const { userId } = await auth()
	if (!userId) {
		logger.error("processQuestionResponse failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
	logger.debug("processing question response", {
		qtiItemId,
		responseIdentifier,
		onerosterUserSourcedId,
		onerosterComponentResourceSourcedId,
		isInteractiveAssessment,
		assessmentAttemptNumber
	})

	// Fetch authoritative response declarations to validate identifiers
	/**
	 * IMPORTANT: Temporary compatibility with AE Studios' OTI/QTI service
	 *
	 * We currently rely on the provider's JSON representation of assessment items
	 * (e.g., `responseDeclarations` on the GET /assessment-items/:id response) to
	 * derive the set of declared response identifiers for validation and filtering.
	 * This is necessary to harden against the iframe/player emitting undeclared
	 * identifiers (e.g., a stray "RESPONSE").
	 *
	 * TODO(migration): When we migrate off the current AE Studios implementation
	 * of OTI/QTI, REWRITE this logic to parse the raw XML (`rawXml`) directly
	 * to extract response declarations, their identifiers, cardinalities, and
	 * base types. Do not depend on provider-specific JSON shapes. The XML parse
	 * must be the single source of truth to avoid vendor lock-in and drift.
	 *
	 * Migration acceptance criteria:
	 * - Parse <qti-response-declaration> nodes from XML and compute `allowedIds`
	 * - Respect record vs single/multiple/ordered cardinality for how we submit
	 * - Keep unknown identifiers strictly rejected (no fallbacks)
	 * - Preserve the behavior documented by tests in
	 *   `tests/actions/assessment/response-filtering.test.ts`
	 */
	const itemResult = await errors.try(qti.getAssessmentItem(qtiItemId))
	if (itemResult.error) {
		logger.error("failed to get qti assessment item for response processing", { error: itemResult.error, qtiItemId })
		throw errors.wrap(itemResult.error, "qti get assessment item")
	}
	const declarations = itemResult.data.responseDeclarations ?? []
	const allowedIds = new Set(declarations.map((d) => d.identifier))
	if (allowedIds.size === 0) {
		logger.error("qti item has no response declarations", { qtiItemId })
		throw errors.new("qti item: no response declarations")
	}

	// Handle fill-in-the-blank questions with multiple responses
	if (typeof selectedResponse === "object" && !Array.isArray(selectedResponse) && selectedResponse !== null) {
		const originalEntries = Object.entries(selectedResponse)
		const responseEntries = originalEntries.filter(([id]) => allowedIds.has(id))

		logger.info("processing multi-input question", {
			qtiItemId,
			responseCount: responseEntries.length,
			responseIdentifiers: responseEntries.map(([id]) => id),
			ignoredIdentifiers: originalEntries.filter(([id]) => !allowedIds.has(id)).map(([id]) => id)
		})

		if (responseEntries.length === 0) {
			logger.error("no declared response identifiers present in selected response", {
				qtiItemId,
				allowedIdentifiers: Array.from(allowedIds),
				originalIdentifiers: originalEntries.map(([id]) => id)
			})
			throw errors.new("no declared response identifiers")
		}

		const results = await Promise.all(
			responseEntries.map(async ([identifier, value]) => {
				const normalizedValue = Array.isArray(value) ? value : String(value)
				const result = await errors.try(
					qti.processResponse(qtiItemId, {
						responseIdentifier: identifier,
						value: normalizedValue
					})
				)
				if (result.error) {
					return result
				}
				return result
			})
		)

		const anyErrors = results.some((r) => r.error)
		if (anyErrors) {
			const failedResponses = results.filter((r) => r.error)
			logger.error("one or more qti response processing calls failed for multi-input question", {
				failedResponses: failedResponses.map((r, _idx) => ({
					identifier: responseEntries[results.indexOf(r)]?.[0],
					error: r.error
				})),
				qtiItemId,
				selectedResponse
			})
			throw errors.new("qti response processing failed for multi-input question")
		}

		const isAllCorrect = results.every((r) => r.data && r.data.score > 0)
		logger.info("multi-input question processing complete", {
			qtiItemId,
			isCorrect: isAllCorrect,
			individualScores: results.map((r, idx) => ({
				identifier: responseEntries[idx]?.[0],
				score: r.data?.score
			}))
		})

		return {
			isCorrect: isAllCorrect,
			score: isAllCorrect ? 1 : 0,
			feedback: isAllCorrect ? "Correct!" : "Not quite right. Try again."
		} as const
```


## Assistant

<thinking>


**Searching for finalize logic**
</thinking>

**Tool Call: Search finalizeAssessment in assessment.ts**
Status: Completed

```sh
459:	// The client will need to call finalizeAssessment when ready
721:export async function finalizeAssessment(options: {
754:			logger.info("finalizeAssessment called on an already finalized state, returning stored summary.", {
```


## Assistant

<thinking>


**Preparing finalize section**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts

/**
 * Orchestrates the finalization of an assessment.
 *
 * This is the culminating action called when a user completes the last question. It reads the
 * **server-authoritative state from Redis** (not from client input), calculates the final score,
 * saves the official result to OneRoster via the assessment service, and awards XP.
 *
 * **CRITICAL BUSINESS LOGIC:**
 * - The Redis state is the SINGLE SOURCE OF TRUTH for assessment results
 * - Redis only stores the FIRST ATTEMPT for each question (subsequent attempts are for formative feedback only)
 * - Reported questions (where isReported=true or isCorrect=null) are EXCLUDED from scoring
 * - The final score = (correct answers / scorable questions) × 100, where scorable questions exclude reported ones
 *
 * After all permanent storage is updated, it marks the assessment state in Redis as `isFinalized: true`.
 * This makes the finalization step idempotent; if called again on an already-finalized state, it will
 * simply return the calculated summary without performing duplicate writes.
 *
 * @param options Contextual data for the assessment (no session results are passed from the client).
 * @returns A summary payload for the client's SummaryView, including score and any XP penalties.
 */
export async function finalizeAssessment(options: {
	onerosterResourceSourcedId: string
	onerosterComponentResourceSourcedId: string
	onerosterCourseSourcedId: string
	expectedXp: number
	assessmentTitle: string
	assessmentPath: string
	unitData?: Unit
	contentType: "Exercise" | "Quiz" | "Test" | "CourseChallenge"
}) {
	const correlationId = randomUUID()
	const { userId: clerkUserId } = await auth()
	if (!clerkUserId) {
		logger.error("finalize assessment: user not authenticated", { correlationId })
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(clerkUserId)
	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, options.onerosterResourceSourcedId)

	const state = await getAssessmentState(onerosterUserSourcedId, options.onerosterResourceSourcedId, attemptNumber)
	if (!state) {
		logger.error("assessment state not found for finalization", {
			onerosterUserSourcedId,
			onerosterResourceSourcedId: options.onerosterResourceSourcedId,
			attemptNumber
		})
		throw ErrAssessmentStateNotFound
	}

	// Wrap finalization logic in an async function to use errors.try
	const performFinalization = async () => {
		// IDEMPOTENCY: If the summary has already been calculated and stored, return it immediately.
		if (state.finalSummary) {
			logger.info("finalizeAssessment called on an already finalized state, returning stored summary.", {
				correlationId
			})
			return state.finalSummary
		}

		// Calculate server-authoritative duration
		const durationInSeconds = Math.round((Date.now() - new Date(state.startedAt).getTime()) / 1000)

		// Reconstruct sessionResults from Redis state
		const questionList = await getDeterministicQuestionList(
			onerosterUserSourcedId,
			options.onerosterResourceSourcedId,
			attemptNumber
		)
		const sessionResults = Object.entries(state.questions).map(([indexStr, qState]) => {
			const index = Number(indexStr)
			const questionId = questionList[index]?.id

			if (!questionId) {
				logger.error("critical state inconsistency: question ID not found at expected index during finalization", {
					onerosterUserSourcedId,
					onerosterResourceSourcedId: options.onerosterResourceSourcedId,
					attemptNumber,
					failedIndex: index,
					totalQuestionsInList: questionList.length,
					totalQuestionsInState: Object.keys(state.questions).length,
					correlationId
				})
				throw errors.new("critical state inconsistency: could not map question state to a question ID")
			}

			return {
				qtiItemId: questionId,
				isCorrect: qState.isCorrect,
				isReported: qState.isReported
			}
		})

		// The sessionResults from Redis are authoritative. We only need to filter out
		// reported questions (where isCorrect is null) for scoring.
		const scorableResults = sessionResults.filter((r) => typeof r.isCorrect === "boolean")

		const correctAnswers = scorableResults.filter((r) => r.isCorrect).length
		const totalQuestions = scorableResults.length
		const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 100
		const avgSecondsPerQuestion =
			durationInSeconds && totalQuestions > 0 ? durationInSeconds / totalQuestions : undefined

		logger.info("finalizing assessment", {
			userSourcedId: onerosterUserSourcedId,
			resourceSourcedId: options.onerosterResourceSourcedId,
			correlationId
		})

		const { userId: clerkUserId } = await auth()
		if (!clerkUserId) {
			logger.error("finalize assessment: user not authenticated", { correlationId })
			throw errors.new("user not authenticated")
		}

		// Extract subject and course slugs from assessment path
		const pathParts = options.assessmentPath.split("/")
		if (pathParts.length < 3 || !pathParts[1] || !pathParts[2]) {
			logger.error("invalid assessment path structure", { assessmentPath: options.assessmentPath, correlationId })
			throw errors.new("assessment path invalid")
		}
		const subjectSlugRaw = pathParts[1]
		if (!isSubjectSlug(subjectSlugRaw)) {
			logger.error("invalid subject slug in assessment path", {
				subjectSlug: subjectSlugRaw,
				assessmentPath: options.assessmentPath,
				correlationId
			})
			throw errors.new("subject slug invalid")
		}
		const subjectSlug = subjectSlugRaw
		const courseSlug = pathParts[2]

		// Build the command DTO for the service layer
		// Fetch user metadata for downstream services (streak)
		const clerk = await clerkClient()
		const user = await clerk.users.getUser(clerkUserId)

		// Email is now required for Caliper analytics
		const userEmail = user.emailAddresses[0]?.emailAddress
		if (!userEmail) {
			logger.error("user email required for assessment finalization", {
				clerkUserId,
				correlationId
			})
			throw errors.new("user email required for assessment")
		}

		const command: SaveAssessmentResultCommand = {
			...options,
			onerosterUserSourcedId,
			// Persist the scorable results to ensure downstream consumers use consistent data
			sessionResults: scorableResults,
			attemptNumber,
			score: assertPercentageInteger(score, "assessment score"),
			correctAnswers,
			totalQuestions,
			durationInSeconds,
			isInteractiveAssessment: true,
			clerkUserId,
			correlationId,
			// zod schema now validates subjectSlug against SUBJECT_SLUGS; pass through
			subjectSlug,
			courseSlug,
			userPublicMetadata: user.publicMetadata,
			userEmail
		}

		const saveResult = await errors.try(assessment.saveResult(command))
		if (saveResult.error) {
			logger.error("failed to save final assessment result", {
				error: saveResult.error,
				resourceSourcedId: options.onerosterResourceSourcedId
			})
			throw errors.wrap(saveResult.error, "failed to save final assessment result")
		}

		const extractXpInfo = (): { finalXp: number; penaltyApplied: boolean; reason: string } | undefined => {
			if (!saveResult.data || typeof saveResult.data !== "object" || !("xp" in saveResult.data)) {
				return undefined
			}
			const xp = saveResult.data.xp
			if (
				xp &&
				typeof xp === "object" &&
				"finalXp" in xp &&
				"penaltyApplied" in xp &&
				"reason" in xp &&
				typeof xp.finalXp === "number" &&
				typeof xp.penaltyApplied === "boolean" &&
				typeof xp.reason === "string"
			) {
				return {
					finalXp: xp.finalXp,
					penaltyApplied: xp.penaltyApplied,
					reason: xp.reason
				}
			}
			return undefined
		}
		const xpInfo = extractXpInfo()

		const finalSummary = {
			score: score,
			correctAnswersCount: correctAnswers,
			totalQuestions: totalQuestions,
			xpPenaltyInfo:
				xpInfo?.penaltyApplied === true
					? {
							penaltyXp: xpInfo.finalXp,
							reason: xpInfo.reason,
							avgSecondsPerQuestion
						}
					: undefined
		}

		await markAssessmentFinalized(
			onerosterUserSourcedId,
			options.onerosterResourceSourcedId,
			attemptNumber,
			finalSummary
		)

		return finalSummary
	}

	// Execute finalization with error handling
	const finalizationResult = await errors.try(performFinalization())
	if (finalizationResult.error) {
		const errorMessage =
			finalizationResult.error instanceof Error
				? finalizationResult.error.toString()
				: "An unknown error occurred during finalization."

		// NEW: Mark state as failed before re-throwing
		await markAssessmentFinalizationFailed(
			onerosterUserSourcedId,
			options.onerosterResourceSourcedId,
			attemptNumber,
			errorMessage
		)

		logger.error("assessment finalization failed unexpectedly", { correlationId, error: finalizationResult.error })
		throw finalizationResult.error // Re-throw to ensure client knows it failed
	}

	return finalizationResult.data
}

/**
 * Flags a question as reported in the QTI API by updating its metadata.
 * This is the primary server action for the "Report an issue" feature.
 * @param questionId The QTI AssessmentItem identifier (e.g., "nice_x...").
 * @param report The user's report message describing the issue.
 */
export async function flagQuestionAsReported(questionId: string, report: string): Promise<{ success: boolean }> {
	const { userId: clerkUserId } = await auth()
	if (!clerkUserId) {
		logger.error("flag question: user not authenticated", { questionId })
		throw errors.new("user not authenticated")
	}

	const userSourcedId = await getCurrentUserSourcedId(clerkUserId)

	const isAuthorized = await isUserAuthorizedForQuestion(userSourcedId, questionId)
	if (!isAuthorized) {
		logger.warn("unauthorized attempt to report question", { clerkUserId, userSourcedId, questionId })
		throw errors.new("user not authorized to report this question")
	}

	logger.info("flagging question as reported", { clerkUserId, questionId, report })

	const flagQuestionOperation = async () => {
		const existingItem = await qti.getAssessmentItem(questionId)

		const updatedMetadata = {
			...existingItem.metadata,
			status: "reported",
			report: report.trim(),
			lastReported: new Date().toISOString(),
			reportedBy: clerkUserId
```


## Assistant

<thinking>


**Investigating OneRoster integration**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
import { CALIPER_SUBJECT_MAPPING } from "@/lib/constants/subjects"
import type { SaveAssessmentResultCommand } from "@/lib/dtos/assessment"
import * as analytics from "@/lib/ports/analytics"
import * as gradebook from "@/lib/ports/gradebook"
import * as cache from "@/lib/services/cache"
import * as proficiency from "@/lib/services/proficiency"
import * as streak from "@/lib/services/streak"
import { constructActorId } from "@/lib/utils/actor-id"
import { generateResultSourcedId } from "@/lib/utils/assessment-identifiers"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
import { calculateAssessmentXp } from "@/lib/xp/core"
import * as xp from "@/lib/xp/service"

export async function saveResult(command: SaveAssessmentResultCommand): Promise<unknown> {
	const {
		onerosterResourceSourcedId: resourceId,
		score: assessmentScore,
		correctAnswers,
		totalQuestions,
		onerosterUserSourcedId: userId,
		onerosterCourseSourcedId: courseId,
		isInteractiveAssessment = false,
		attemptNumber,
		correlationId
	} = command

	logger.info("saving assessment result [service]", { correlationId, resourceId, userId })

	// 1. Calculate XP (includes proficiency check and banking)
	// userEmail is now required by the DTO schema, no need to check
	const xpResult = await xp.awardXpForAssessment({
		userSourcedId: userId,
		assessmentResourceId: resourceId,
		componentResourceId: command.onerosterComponentResourceSourcedId,
		courseSourcedId: courseId,
		baseXp: command.expectedXp,
		correctQuestions: correctAnswers,
		totalQuestions: totalQuestions,
		attemptNumber: attemptNumber,
		durationInSeconds: command.durationInSeconds,
		isExercise: command.contentType === "Exercise",
		userEmail: command.userEmail,
		subjectSlug: command.subjectSlug,
		courseSlug: command.courseSlug
	})

	// 2. Prepare and save the primary result to the gradebook (MUST SUCCEED)
	const resultSourcedId = generateResultSourcedId(userId, resourceId, isInteractiveAssessment, attemptNumber)
	const lineItemSourcedId = getAssessmentLineItemId(resourceId)

	// Build the comment based on attempt number
	const comment =
		attemptNumber && attemptNumber > 1
			? `${correctAnswers}/${totalQuestions} correct on attempt ${attemptNumber}`
			: `${correctAnswers}/${totalQuestions} correct on first attempt`

	// Build metadata for the result using legacy rules
	const accuracyPercent = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 100
	const calculateMasteredUnits = () => {
		if (command.contentType === "Test") return accuracyPercent >= 90 ? 1 : 0
		if (command.contentType === "Exercise" || command.contentType === "Quiz") return accuracyPercent >= 80 ? 1 : 0
		return 0
	}
	const masteredUnits = calculateMasteredUnits()

	// Atomic: for Exercises, store exercise-only XP in the result metadata.
	// Other content types (Quiz/Test) do not bank, so total is the same as exercise XP.
	const exerciseOnlyXp = calculateAssessmentXp(
		command.expectedXp,
		accuracyPercent,
		attemptNumber,
		totalQuestions,
		command.durationInSeconds
	).finalXp

	const metadata = {
		masteredUnits,
		totalQuestions: totalQuestions,
		correctQuestions: correctAnswers,
		accuracy: accuracyPercent,
		xp: command.contentType === "Exercise" ? exerciseOnlyXp : xpResult.finalXp,
		multiplier: xpResult.multiplier,
		penaltyApplied: xpResult.penaltyApplied,
		xpReason: xpResult.reason,
		completedAt: new Date().toISOString(),
		courseSourcedId: courseId,
		attempt: attemptNumber,
		durationInSeconds: command.durationInSeconds,
		lessonType: command.contentType?.toLowerCase()
	}

	const gradebookResult = await errors.try(
		gradebook.saveResult({
			resultSourcedId,
			lineItemSourcedId,
			userSourcedId: userId,
			score: assessmentScore,
			comment,
			metadata,
			correlationId
		})
	)

	if (gradebookResult.error) {
		logger.error("failed to save assessment result to gradebook", { error: gradebookResult.error, correlationId })
		throw errors.wrap(gradebookResult.error, "failed to save primary assessment result")
	}

	// 3. Trigger best-effort background tasks.
	const sideEffectPromises = []

	// Cache invalidation
	sideEffectPromises.push(cache.invalidateUserCourseProgress(userId, courseId))

	// Streak update if XP was awarded
	if (xpResult.finalXp > 0 && command.userPublicMetadata) {
		sideEffectPromises.push(streak.update(command.clerkUserId, command.userPublicMetadata))
	}

	// Proficiency update for interactive assessments
	if (
		isInteractiveAssessment &&
		command.onerosterComponentResourceSourcedId &&
		command.sessionResults &&
		attemptNumber
	) {
		sideEffectPromises.push(
			proficiency.updateFromAssessment(
				userId,
				command.onerosterComponentResourceSourcedId,
				attemptNumber,
				command.sessionResults,
				courseId,
				correlationId
			)
		)
	}

	// Analytics event if we have required data
	if (command.unitData && command.assessmentPath && command.assessmentTitle && command.userEmail) {
		const subjectSlug = command.subjectSlug
		const mappedSubject = CALIPER_SUBJECT_MAPPING[subjectSlug]
		if (!mappedSubject) {
			logger.error("caliper subject mapping missing", { subjectSlug, correlationId })
			// Skip analytics if subject mapping is missing
		} else {
			// Build Caliper actor (legacy shape)
			const actor = {
				id: constructActorId(userId),
				type: "TimebackUser" as const,
				email: command.userEmail
			}

			// Build Caliper context to match legacy payloads used by progress analytics
			const context = {
				id: `${env.NEXT_PUBLIC_APP_DOMAIN}${command.assessmentPath}`,
				type: "TimebackActivityContext" as const,
				subject: mappedSubject,
				app: { name: "Nice Academy" },
				course: {
					name: command.courseSlug,
					id: `${env.TIMEBACK_ONEROSTER_SERVER_URL}/ims/oneroster/rostering/v1p2/courses/${courseId}`
				},
				activity: { name: command.assessmentTitle, id: resourceId },
				process: false
			}

			// Send analytics events (activity completed + optional time spent)
			sideEffectPromises.push(
				analytics.sendActivityCompletedEvent({
					actor,
					context,
					performance: {
						totalQuestions,
						correctQuestions: correctAnswers,
						masteredUnits
					},
					// Atomic: exercise-only XP (exclude banked XP)
					finalXp: calculateAssessmentXp(
						command.expectedXp,
						accuracyPercent,
						attemptNumber,
						totalQuestions,
						command.durationInSeconds
					).finalXp,
					durationInSeconds: command.durationInSeconds,
					correlationId
				})
			)
			if (command.durationInSeconds && command.durationInSeconds >= 1) {
				sideEffectPromises.push(
					analytics.sendTimeSpentEvent({
						actor,
						context,
						durationInSeconds: command.durationInSeconds,
						correlationId
					})
```


## Assistant

<thinking>


**Prompting to continue**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
					})
				)
			}
		}
	}

	// Wait for all side effects to complete
	const settled = await Promise.allSettled(sideEffectPromises)

	// Log any failures for observability
	settled.forEach((result, index) => {
		if (result.status === "rejected") {
			logger.error("side effect failed in assessment service", {
				index,
				error: result.reason,
				correlationId
			})
		}
	})

	return { onerosterResultSourcedId: resultSourcedId, xp: xpResult }
}
```


## Assistant

<thinking>


**Inspecting gradebook port**
</thinking>

**Tool Call: List /Users/bjorn/Documents/Code/nice/ports**
Status: Completed

```sh
analytics.ts
clerk.ts
gradebook.ts
```


**Tool Call: Read gradebook.ts**
Status: Completed

```ts
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"
import { type AssessmentResultMetadata, AssessmentResultMetadataSchema } from "@/lib/constants/assessment"
import { assertPercentageInteger } from "@/lib/utils/score"

/**
 * Saves a fully-formed assessment result to the gradebook via an idempotent PUT operation.
 * This is the sole entry point for writing grades. It enforces score and metadata normalization.
 *
 * @returns The sourcedId of the created/updated result.
 */
export async function saveResult(options: {
	resultSourcedId: string
	lineItemSourcedId: string
	userSourcedId: string
	score: number
	comment: string
	metadata: AssessmentResultMetadata
	correlationId: string
}): Promise<string> {
	const metadataValidation = AssessmentResultMetadataSchema.safeParse(options.metadata)
	if (!metadataValidation.success) {
		logger.error("invalid assessment result metadata", {
			error: metadataValidation.error,
			correlationId: options.correlationId
		})
		throw errors.wrap(metadataValidation.error, "gradebook metadata validation")
	}
	const validatedMetadata = metadataValidation.data
	const finalScore = assertPercentageInteger(options.score, "gradebook score")

	const payload = {
		result: {
			assessmentLineItem: { sourcedId: options.lineItemSourcedId, type: "assessmentLineItem" as const },
			student: { sourcedId: options.userSourcedId, type: "user" as const },
			scoreStatus: "fully graded" as const,
			scoreDate: validatedMetadata.completedAt,
			score: finalScore,
			comment: options.comment,
			metadata: validatedMetadata
		}
	}

	const result = await errors.try(oneroster.putResult(options.resultSourcedId, payload))
	if (result.error) {
		logger.error("failed to save result via gradebook port", {
			resultSourcedId: options.resultSourcedId,
			error: result.error,
			correlationId: options.correlationId
		})
		throw errors.wrap(result.error, "gradebook port: save result failed")
	}

	return result.data.sourcedId
}
```


## Assistant

<thinking>


**Inspecting oneroster client**
</thinking>

**Tool Call: List /Users/bjorn/Documents/Code/nice/clients**
Status: Failed

```sh
ls: src/lib/clients: No such file or directory
```


## Assistant

<thinking>


**Searching for oneroster export**
</thinking>

**Tool Call: Run rg "oneroster" src/lib -g"*.ts" -n**
Status: Completed

Terminal:
```
src/lib/xp/service.ts:88:				onerosterUserSourcedId: options.userSourcedId,
src/lib/xp/service.ts:89:				onerosterCourseSourcedId: options.courseSourcedId,
src/lib/xp/bank.ts:19:} from "@/lib/data/fetchers/oneroster"
src/lib/xp/bank.ts:20:import { CourseMetadataSchema } from "@/lib/metadata/oneroster"
src/lib/xp/bank.ts:21:import type { Resource } from "@/lib/oneroster"
src/lib/xp/bank.ts:47:	onerosterUserSourcedId: string
src/lib/xp/bank.ts:49:	const { exerciseResourceSourcedId, onerosterUserSourcedId } = params
src/lib/xp/bank.ts:118:	const userId = extractUserSourcedId(onerosterUserSourcedId)
src/lib/xp/bank.ts:164:	onerosterUserSourcedId: string
src/lib/xp/bank.ts:165:	onerosterCourseSourcedId: string
src/lib/xp/bank.ts:172:	const userId = extractUserSourcedId(params.onerosterUserSourcedId)
src/lib/xp/bank.ts:175:	const courseResult = await errors.try(getCourse(params.onerosterCourseSourcedId))
src/lib/xp/bank.ts:179:			courseSourcedId: params.onerosterCourseSourcedId,
src/lib/xp/bank.ts:188:			courseSourcedId: params.onerosterCourseSourcedId,
src/lib/xp/bank.ts:198:			courseSourcedId: params.onerosterCourseSourcedId,
src/lib/xp/bank.ts:212:			courseSourcedId: params.onerosterCourseSourcedId,
src/lib/xp/bank.ts:221:		onerosterUserSourcedId: params.onerosterUserSourcedId
src/lib/xp/bank.ts:352:				courseSourcedId: params.onerosterCourseSourcedId,
src/lib/xp/bank.ts:407:						id: `${env.TIMEBACK_ONEROSTER_SERVER_URL}/ims/oneroster/rostering/v1p2/courses/${params.onerosterCourseSourcedId}`
src/lib/xp/bank.ts:432:	onerosterCourseSourcedId: string
src/lib/xp/bank.ts:437:		onerosterCourseSourcedId
src/lib/xp/bank.ts:444:		getComponentResourceForResourceInCourse(onerosterCourseSourcedId, quizResourceId)
src/lib/xp/bank.ts:449:			courseSourcedId: onerosterCourseSourcedId,
src/lib/xp/bank.ts:457:			courseSourcedId: onerosterCourseSourcedId,
src/lib/xp/bank.ts:490:		getComponentResourcesForCourse(onerosterCourseSourcedId)
src/lib/xp/bank.ts:495:			courseSourcedId: onerosterCourseSourcedId
src/lib/cache.ts:184:export function userProgressByCourse(userId: string, onerosterCourseSourcedId: string): string {
src/lib/cache.ts:185:	const base = ["user-progress", userId, onerosterCourseSourcedId]
src/lib/ports/analytics.ts:74:	const userPrefix = `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/users/`
src/lib/ports/analytics.ts:80:		const coursePrefix = `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/courses/`
src/lib/ports/analytics.ts:185:	const userPrefix = `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/users/`
src/lib/ports/analytics.ts:191:		const coursePrefix = `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/courses/`
src/lib/ports/analytics.ts:283:	const userPrefix = `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/users/`
src/lib/ports/analytics.ts:289:		const coursePrefix = `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/courses/`
src/lib/constants/oneroster.ts:1:export const ONEROSTER_CONCURRENCY_KEY = "oneroster-global-concurrency" as const
src/lib/oneroster.ts:212:export const ErrOneRosterAPI = errors.new("oneroster api error")
src/lib/oneroster.ts:213:export const ErrOneRosterNotFound = errors.new("oneroster resource not found")
src/lib/oneroster.ts:214:export const ErrOneRosterNotFoundAs422 = errors.new("oneroster resource not found (422)")
src/lib/oneroster.ts:397:		logger.debug("oneroster: initializing client")
src/lib/oneroster.ts:423:		logger.debug("oneroster: fetching new access token")
src/lib/oneroster.ts:438:			logger.error("oneroster auth: token fetch failed", { error: result.error })
src/lib/oneroster.ts:439:			throw errors.wrap(result.error, "oneroster token fetch")
src/lib/oneroster.ts:444:			logger.error("oneroster auth: token request rejected", { status: result.data.status, body: errorBody })
src/lib/oneroster.ts:445:			throw errors.new(`oneroster token request failed with status ${result.data.status}`)
src/lib/oneroster.ts:450:			logger.error("oneroster auth: failed to parse token response", { error: jsonResult.error })
src/lib/oneroster.ts:451:			throw errors.wrap(jsonResult.error, "oneroster token response parsing")
src/lib/oneroster.ts:456:			logger.error("oneroster auth: invalid token response schema", { error: validation.error })
src/lib/oneroster.ts:457:			throw errors.wrap(validation.error, "oneroster token response validation")
src/lib/oneroster.ts:460:		logger.info("oneroster: access token acquired")
src/lib/oneroster.ts:479:			logger.error("oneroster api request failed", { error: fetchResult.error, endpoint })
src/lib/oneroster.ts:480:			throw errors.wrap(fetchResult.error, "oneroster api request")
src/lib/oneroster.ts:492:			logger.error("oneroster api returned non-ok status", {
src/lib/oneroster.ts:516:				logger.info("oneroster auth: jwt expired, attempting to refresh token", { endpoint })
src/lib/oneroster.ts:528:					logger.error("oneroster api request failed after token refresh", { error: retryResult.error, endpoint })
src/lib/oneroster.ts:529:					throw errors.wrap(retryResult.error, "oneroster api request after token refresh")
src/lib/oneroster.ts:538:					logger.error("oneroster api returned non-ok status after token refresh", {
src/lib/oneroster.ts:547:						`oneroster jwt refresh failed: status ${retryResponse.status} on ${endpoint}`
src/lib/oneroster.ts:560:					logger.error("oneroster api: failed to parse json response after token refresh", {
src/lib/oneroster.ts:565:					throw errors.wrap(retryJsonResult.error, `oneroster api response parsing for ${endpoint} after token refresh`)
src/lib/oneroster.ts:569:					logger.error("oneroster api: invalid response schema after token refresh", {
src/lib/oneroster.ts:575:						`oneroster api response validation for ${endpoint} after token refresh`
src/lib/oneroster.ts:583:				logger.warn("oneroster api: server error detected, attempting single retry", {
src/lib/oneroster.ts:595:					logger.error("oneroster api request failed on retry after server error", {
src/lib/oneroster.ts:600:					throw errors.wrap(retryResult.error, "oneroster api request retry after server error")
src/lib/oneroster.ts:605:					logger.info("oneroster api: server error retry succeeded", {
src/lib/oneroster.ts:622:						logger.error("oneroster api: failed to parse json response after server error retry", {
src/lib/oneroster.ts:629:							`oneroster api response parsing for ${endpoint} after server error retry`
src/lib/oneroster.ts:634:						logger.error("oneroster api: invalid response schema after server error retry", {
src/lib/oneroster.ts:640:							`oneroster api response validation for ${endpoint} after server error retry`
src/lib/oneroster.ts:647:				logger.error("oneroster api: server error retry also failed", {
src/lib/oneroster.ts:658:				logger.error("oneroster api not found", { endpoint, status: response.status })
src/lib/oneroster.ts:659:				throw errors.wrap(ErrOneRosterNotFound, `oneroster api error: status 404 on ${endpoint}`)
src/lib/oneroster.ts:663:				logger.error("oneroster api not found via 422", { endpoint, status: response.status, text })
src/lib/oneroster.ts:666:					`oneroster api error: status 422 on ${endpoint} - resource not found`
src/lib/oneroster.ts:669:			logger.error("oneroster api error", { endpoint, status: response.status, text })
src/lib/oneroster.ts:687:			logger.error("oneroster api: failed to parse json response", {
src/lib/oneroster.ts:692:			throw errors.wrap(jsonResult.error, `oneroster api response parsing for ${endpoint}`)
src/lib/oneroster.ts:697:			logger.error("oneroster api: invalid response schema", { error: validation.error, endpoint })
src/lib/oneroster.ts:698:			throw errors.wrap(validation.error, `oneroster api response validation for ${endpoint}`)
src/lib/oneroster.ts:729:			`/ims/oneroster/resources/v1p2/resources/${sourcedId}`,
src/lib/oneroster.ts:740:			"/ims/oneroster/resources/v1p2/resources/",
src/lib/oneroster.ts:756:			`/ims/oneroster/resources/v1p2/resources/${sourcedId}`,
src/lib/oneroster.ts:767:		logger.info("oneroster: deleting resource", { sourcedId })
src/lib/oneroster.ts:774:		await this.#request(`/ims/oneroster/resources/v1p2/resources/${sourcedId}`, { method: "DELETE" }, z.unknown())
src/lib/oneroster.ts:776:		logger.info("oneroster: successfully deleted resource", { sourcedId })
src/lib/oneroster.ts:781:			`/ims/oneroster/rostering/v1p2/courses/${sourcedId}`,
src/lib/oneroster.ts:792:			"/ims/oneroster/rostering/v1p2/courses/",
src/lib/oneroster.ts:807:			`/ims/oneroster/rostering/v1p2/courses/${sourcedId}`,
src/lib/oneroster.ts:819:			`/ims/oneroster/rostering/v1p2/courses/components/${sourcedId}`,
src/lib/oneroster.ts:838:			`/ims/oneroster/rostering/v1p2/courses/components/${sourcedId}`,
src/lib/oneroster.ts:851:			"/ims/oneroster/rostering/v1p2/courses/components",
src/lib/oneroster.ts:860:			`/ims/oneroster/rostering/v1p2/courses/component-resources/${sourcedId}`,
src/lib/oneroster.ts:871:			"/ims/oneroster/rostering/v1p2/courses/component-resources",
src/lib/oneroster.ts:889:			`/ims/oneroster/rostering/v1p2/courses/component-resources/${sourcedId}`,
src/lib/oneroster.ts:901:			`/ims/oneroster/rostering/v1p2/classes/${sourcedId}`,
src/lib/oneroster.ts:924:			"/ims/oneroster/rostering/v1p2/classes/",
src/lib/oneroster.ts:957:			`/ims/oneroster/rostering/v1p2/classes/${sourcedId}`,
src/lib/oneroster.ts:977:			"/ims/oneroster/rostering/v1p2/users/",
src/lib/oneroster.ts:1042:		logger.info("oneroster: fetching all courses", options)
src/lib/oneroster.ts:1048:			endpoint: "/ims/oneroster/rostering/v1p2/courses",
src/lib/oneroster.ts:1054:		logger.info("oneroster: successfully fetched all courses", { count: courses.length, ...options })
src/lib/oneroster.ts:1066:		logger.info("oneroster: fetching all classes for school", { schoolSourcedId, ...options })
src/lib/oneroster.ts:1077:			endpoint: `/ims/oneroster/rostering/v1p2/schools/${schoolSourcedId}/classes`,
src/lib/oneroster.ts:1083:		logger.info("oneroster: successfully fetched all classes for school", {
src/lib/oneroster.ts:1097:		logger.info("oneroster: fetching all classes", options)
src/lib/oneroster.ts:1103:			endpoint: "/ims/oneroster/rostering/v1p2/classes",
src/lib/oneroster.ts:1109:		logger.info("oneroster: successfully fetched all classes", {
src/lib/oneroster.ts:1122:		logger.info("oneroster: fetching all users", options)
src/lib/oneroster.ts:1125:			endpoint: "/ims/oneroster/rostering/v1p2/users",
src/lib/oneroster.ts:1131:		logger.info("oneroster: successfully fetched all users", { count: users.length, ...options })
src/lib/oneroster.ts:1142:		logger.info("oneroster: fetching user by email", { email })
src/lib/oneroster.ts:1155:			logger.info("oneroster: no user found for email", { email })
src/lib/oneroster.ts:1161:			logger.info("oneroster: no user found for email", { email })
src/lib/oneroster.ts:1165:		logger.info("oneroster: successfully fetched user by email", {
src/lib/oneroster.ts:1178:		logger.info("oneroster: fetching course components", options)
src/lib/oneroster.ts:1184:			endpoint: "/ims/oneroster/rostering/v1p2/courses/components",
src/lib/oneroster.ts:1190:		logger.info("oneroster: successfully fetched course components", {
src/lib/oneroster.ts:1204:		logger.info("oneroster: fetching resources for course", { courseSourcedId, ...options })
src/lib/oneroster.ts:1212:			endpoint: `/ims/oneroster/resources/v1p2/resources/courses/${courseSourcedId}/resources`,
src/lib/oneroster.ts:1218:		logger.info("oneroster: successfully fetched resources for course", {
src/lib/oneroster.ts:1233:		logger.info("oneroster: fetching ALL resources", options)
src/lib/oneroster.ts:1236:			endpoint: "/ims/oneroster/resources/v1p2/resources",
src/lib/oneroster.ts:1242:		logger.info("oneroster: finished fetching all resources", {
src/lib/oneroster.ts:1257:		logger.info("oneroster: fetching ALL component resources", options)
src/lib/oneroster.ts:1263:			endpoint: "/ims/oneroster/rostering/v1p2/courses/component-resources",
src/lib/oneroster.ts:1269:		logger.info("oneroster: successfully fetched all component resources", {
src/lib/oneroster.ts:1285:		logger.info("oneroster: fetching classes for user", { userSourcedId, ...options })
src/lib/oneroster.ts:1287:		let endpoint = `/ims/oneroster/rostering/v1p2/users/${userSourcedId}/classes`
src/lib/oneroster.ts:1315:		logger.info("oneroster: successfully fetched classes for user", {
src/lib/oneroster.ts:1334:		logger.info("oneroster: fetching course components for course", { courseSourcedId, ...options })
src/lib/oneroster.ts:1353:		logger.info("oneroster: successfully fetched course components for course", {
src/lib/oneroster.ts:1369:		logger.info("oneroster: fetching all enrollments", options)
src/lib/oneroster.ts:1375:			endpoint: "/ims/oneroster/rostering/v1p2/enrollments",
src/lib/oneroster.ts:1381:		logger.info("oneroster: successfully fetched all enrollments", {
src/lib/oneroster.ts:1396:		logger.info("oneroster: fetching enrollments for user", { userSourcedId, ...options })
src/lib/oneroster.ts:1404:		logger.info("oneroster: successfully fetched enrollments for user", {
src/lib/oneroster.ts:1420:		logger.info("oneroster: creating enrollment", {
src/lib/oneroster.ts:1432:			"/ims/oneroster/rostering/v1p2/enrollments/",
src/lib/oneroster.ts:1445:		logger.info("oneroster: deleting enrollment", { enrollmentSourcedId })
src/lib/oneroster.ts:1451:			`/ims/oneroster/rostering/v1p2/enrollments/${enrollmentSourcedId}`,
src/lib/oneroster.ts:1458:		logger.info("oneroster: deleting course component", { sourcedId })
src/lib/oneroster.ts:1466:			`/ims/oneroster/rostering/v1p2/courses/components/${sourcedId}`,
src/lib/oneroster.ts:1471:		logger.info("oneroster: successfully deleted course component", { sourcedId })
src/lib/oneroster.ts:1475:		logger.info("oneroster: deleting course", { sourcedId })
src/lib/oneroster.ts:1482:		await this.#request(`/ims/oneroster/rostering/v1p2/courses/${sourcedId}`, { method: "DELETE" }, z.unknown())
src/lib/oneroster.ts:1484:		logger.info("oneroster: successfully deleted course", { sourcedId })
src/lib/oneroster.ts:1488:		logger.info("oneroster: deleting class", { sourcedId })
src/lib/oneroster.ts:1495:		await this.#request(`/ims/oneroster/rostering/v1p2/classes/${sourcedId}`, { method: "DELETE" }, z.unknown())
src/lib/oneroster.ts:1497:		logger.info("oneroster: successfully deleted class", { sourcedId })
src/lib/oneroster.ts:1501:		logger.info("oneroster: deleting component resource", { sourcedId })
src/lib/oneroster.ts:1509:			`/ims/oneroster/rostering/v1p2/courses/component-resources/${sourcedId}`,
src/lib/oneroster.ts:1514:		logger.info("oneroster: successfully deleted component resource", { sourcedId })
src/lib/oneroster.ts:1518:		logger.info("oneroster: deleting user", { sourcedId })
src/lib/oneroster.ts:1525:		await this.#request(`/ims/oneroster/rostering/v1p2/users/${sourcedId}`, { method: "DELETE" }, z.unknown())
src/lib/oneroster.ts:1527:		logger.info("oneroster: successfully deleted user", { sourcedId })
src/lib/oneroster.ts:1543:		logger.info("oneroster: putting assessment line item", { sourcedId })
src/lib/oneroster.ts:1552:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
src/lib/oneroster.ts:1563:			logger.error("oneroster: putAssessmentLineItem did not return the expected object")
src/lib/oneroster.ts:1581:		logger.info("oneroster: patching assessment line item", { sourcedId })
src/lib/oneroster.ts:1590:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
src/lib/oneroster.ts:1599:		logger.info("oneroster: successfully patched assessment line item", { sourcedId })
src/lib/oneroster.ts:1608:		logger.info("oneroster: getting assessment line item", { sourcedId })
src/lib/oneroster.ts:1611:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
src/lib/oneroster.ts:1626:		logger.info("oneroster: fetching ALL assessment line items", options)
src/lib/oneroster.ts:1636:			endpoint: "/ims/oneroster/gradebook/v1p2/assessmentLineItems",
src/lib/oneroster.ts:1642:		logger.info("oneroster: finished fetching all assessment line items", {
src/lib/oneroster.ts:1656:		logger.info("oneroster: deleting assessment line item", { sourcedId })
src/lib/oneroster.ts:1664:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
src/lib/oneroster.ts:1669:		logger.info("oneroster: successfully deleted assessment line item", { sourcedId })
src/lib/oneroster.ts:1690:			"/ims/oneroster/gradebook/v1p2/results/",
src/lib/oneroster.ts:1717:			`/ims/oneroster/gradebook/v1p2/assessmentResults/${sourcedId}`,
src/lib/oneroster.ts:1740:		logger.info("oneroster: getting assessment result", { sourcedId })
src/lib/oneroster.ts:1747:			`/ims/oneroster/gradebook/v1p2/assessmentResults/${sourcedId}`,
src/lib/oneroster.ts:1765:		logger.info("oneroster: fetching all results", options)
src/lib/oneroster.ts:1768:			endpoint: "/ims/oneroster/gradebook/v1p2/assessmentResults",
src/lib/oneroster.ts:1774:		logger.info("oneroster: successfully fetched all results", {
src/lib/oneroster.ts:1787:		logger.info("oneroster: deleting assessment result", { sourcedId })
src/lib/oneroster.ts:1795:			`/ims/oneroster/gradebook/v1p2/assessmentResults/${sourcedId}`,
src/lib/oneroster.ts:1800:		logger.info("oneroster: successfully deleted assessment result", { sourcedId })
src/lib/ports/gradebook.ts:3:import { oneroster } from "@/lib/clients"
src/lib/ports/gradebook.ts:45:	const result = await errors.try(oneroster.putResult(options.resultSourcedId, payload))
src/lib/dtos/assessment.ts:8:	onerosterResourceSourcedId: z.string(),
src/lib/dtos/assessment.ts:9:	onerosterComponentResourceSourcedId: z.string(),
src/lib/dtos/assessment.ts:10:	onerosterCourseSourcedId: z.string(),
src/lib/dtos/assessment.ts:11:	onerosterUserSourcedId: z.string(),
src/lib/services/attempt.ts:3:import { oneroster } from "@/lib/clients"
src/lib/services/attempt.ts:22:	logger.info("computing next attempt number from oneroster", {
src/lib/services/attempt.ts:29:	const resultsResult = await errors.try(oneroster.getAllResults({ filter }))
src/lib/services/attempt.ts:41:		logger.error("invalid oneroster results shape for attempt derivation", { lineItemId })
src/lib/clients.ts:3:import * as onerosterInternal from "@/lib/oneroster"
src/lib/clients.ts:27:export const oneroster = new onerosterInternal.Client({
src/lib/caliper/payload.ts:8:    onerosterUserSourcedId: string,
src/lib/caliper/payload.ts:10:    onerosterResourceSourcedId: string,
src/lib/caliper/payload.ts:19:    const normalizedResourceId = extractResourceIdFromCompoundId(onerosterResourceSourcedId)
src/lib/caliper/payload.ts:23:        id: constructActorId(onerosterUserSourcedId),
src/lib/schemas/caliper-article.ts:5:    onerosterUserSourcedId: z.string().min(1),
src/lib/schemas/caliper-article.ts:6:    onerosterArticleResourceSourcedId: z.string().min(1),
src/lib/schemas/caliper-article.ts:14:    onerosterUserSourcedId: z.string().min(1),
src/lib/schemas/caliper-article.ts:15:    onerosterArticleResourceSourcedId: z.string().min(1),
src/lib/caliper/utils.ts:16:	const onerosterBaseUrl = env.TIMEBACK_ONEROSTER_SERVER_URL
src/lib/caliper/utils.ts:17:	if (!onerosterBaseUrl) {
src/lib/caliper/utils.ts:21:	const uri = `${onerosterBaseUrl}/ims/oneroster/rostering/v1p2/resources/${resourceId}`
src/lib/actions/user-sync.ts:16:import { oneroster } from "@/lib/clients"
src/lib/actions/user-sync.ts:40:	logger.debug("starting user sync with oneroster")
src/lib/actions/user-sync.ts:95:		logger.info("user already synced with oneroster, updating roles", {
src/lib/actions/user-sync.ts:102:		logger.debug("fetching user data from oneroster for role update", { clerkId, email })
src/lib/actions/user-sync.ts:103:		const onerosterUserResult = await errors.try(oneroster.getUsersByEmail(email))
src/lib/actions/user-sync.ts:104:		if (onerosterUserResult.error) {
src/lib/actions/user-sync.ts:105:			logger.warn("failed to get user from oneroster for role update", {
src/lib/actions/user-sync.ts:108:				error: onerosterUserResult.error
src/lib/actions/user-sync.ts:119:		if (onerosterUserResult.data) {
src/lib/actions/user-sync.ts:120:			logger.debug("oneroster user data found for role update", {
src/lib/actions/user-sync.ts:122:				onerosterSourceId: onerosterUserResult.data.sourcedId,
src/lib/actions/user-sync.ts:123:				newRoleCount: onerosterUserResult.data.roles.length
src/lib/actions/user-sync.ts:128:				roles: onerosterUserResult.data.roles.map((role) => ({
src/lib/actions/user-sync.ts:180:		logger.debug("no oneroster user data found but user already has sourceId, returning existing", {
src/lib/actions/user-sync.ts:192:	logger.info("syncing user to oneroster - fresh sync required", {
src/lib/actions/user-sync.ts:220:	logger.debug("querying oneroster for user by email", { clerkId, email })
src/lib/actions/user-sync.ts:221:	const onerosterUserResult = await errors.try(oneroster.getUsersByEmail(email))
src/lib/actions/user-sync.ts:222:	if (onerosterUserResult.error) {
src/lib/actions/user-sync.ts:223:		logger.error("failed to get user from oneroster during fresh sync", {
src/lib/actions/user-sync.ts:226:			error: onerosterUserResult.error
src/lib/actions/user-sync.ts:231:	if (!onerosterUserResult.data) {
src/lib/actions/user-sync.ts:243:	logger.debug("oneroster user found, processing user data", {
src/lib/actions/user-sync.ts:245:		onerosterSourceId: onerosterUserResult.data.sourcedId,
src/lib/actions/user-sync.ts:246:		onerosterRoleCount: onerosterUserResult.data.roles.length
src/lib/actions/user-sync.ts:249:	publicMetadataPayload.sourceId = onerosterUserResult.data.sourcedId
src/lib/actions/user-sync.ts:250:	publicMetadataPayload.roles = onerosterUserResult.data.roles.map((role) => ({
src/lib/actions/user-sync.ts:262:	logger.info("successfully fetched sourceid and roles from oneroster", {
src/lib/actions/user-sync.ts:265:		sourceId: onerosterUserResult.data.sourcedId,
src/lib/services/assessment.ts:19:		onerosterResourceSourcedId: resourceId,
src/lib/services/assessment.ts:23:		onerosterUserSourcedId: userId,
src/lib/services/assessment.ts:24:		onerosterCourseSourcedId: courseId,
src/lib/services/assessment.ts:37:		componentResourceId: command.onerosterComponentResourceSourcedId,
src/lib/services/assessment.ts:126:		command.onerosterComponentResourceSourcedId &&
src/lib/services/assessment.ts:133:				command.onerosterComponentResourceSourcedId,
src/lib/services/assessment.ts:165:					id: `${env.TIMEBACK_ONEROSTER_SERVER_URL}/ims/oneroster/rostering/v1p2/courses/${courseId}`
src/lib/services/assessment.ts:220:	return { onerosterResultSourcedId: resultSourcedId, xp: xpResult }
src/lib/actions/user-sync-errors.ts:7:export const ErrUserNotProvisionedInOneRoster = errors.new("user not provisioned in oneroster")
src/lib/caliper/writer.ts:4:import { oneroster } from "@/lib/clients"
src/lib/caliper/writer.ts:35:    const getResult = await errors.try(oneroster.getResult(resultId))
src/lib/caliper/writer.ts:58:    logger.debug("upserting nice time spent to oneroster", {
src/lib/caliper/writer.ts:81:    const putResult = await errors.try(oneroster.putResult(resultId, updatePayload))
src/lib/caliper/writer.ts:83:        logger.error("failed to write nice_timeSpent to oneroster", {
src/lib/caliper/writer.ts:93:        logger.info("wrote nice time spent to oneroster", {
src/lib/data/assessment.ts:56:			onerosterCourseSourcedId: layoutData.courseData.id,
src/lib/data/assessment.ts:97:			onerosterCourseSourcedId: layoutData.courseData.id,
src/lib/data/assessment.ts:137:			onerosterCourseSourcedId: course.id,
src/lib/utils/actor-id.ts:9: *  - "https://.../ims/oneroster/rostering/v1p2/users/abc123" -> "abc123"
src/lib/utils/actor-id.ts:37:	return `${base}/ims/oneroster/rostering/v1p2/users/${userOrUri}`
src/lib/utils/assessment-redirect.ts:10:} from "@/lib/data/fetchers/oneroster"
src/lib/utils/assessment-redirect.ts:11:import { ComponentMetadataSchema, ResourceMetadataSchema } from "@/lib/metadata/oneroster"
src/lib/actions/assessment.ts:20:import { oneroster, qti } from "@/lib/clients"
src/lib/actions/assessment.ts:42: * (onerosterComponentResourceSourcedId) but pass it to PowerPath's "lesson" field.
src/lib/actions/assessment.ts:73: * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId - used by PowerPath
src/lib/actions/assessment.ts:81:	onerosterComponentResourceSourcedId?: string,
src/lib/actions/assessment.ts:90:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/assessment.ts:94:		onerosterUserSourcedId,
src/lib/actions/assessment.ts:95:		onerosterComponentResourceSourcedId,
src/lib/actions/assessment.ts:232:export async function getOrCreateAssessmentState(onerosterResourceSourcedId: string): Promise<AssessmentState> {
src/lib/actions/assessment.ts:238:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/assessment.ts:240:	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
src/lib/actions/assessment.ts:241:	const existingState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
src/lib/actions/assessment.ts:248:				onerosterUserSourcedId,
src/lib/actions/assessment.ts:249:				onerosterResourceSourcedId,
src/lib/actions/assessment.ts:259:		onerosterUserSourcedId,
src/lib/actions/assessment.ts:260:		onerosterResourceSourcedId,
src/lib/actions/assessment.ts:263:	return createAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber, questions.length)
src/lib/actions/assessment.ts:280:	onerosterResourceSourcedId: string,
src/lib/actions/assessment.ts:291:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/assessment.ts:293:	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
src/lib/actions/assessment.ts:294:	const state = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
src/lib/actions/assessment.ts:296:		logger.error("assessment state not found", { onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber })
src/lib/actions/assessment.ts:308:		onerosterUserSourcedId,
src/lib/actions/assessment.ts:309:		onerosterResourceSourcedId,
src/lib/actions/assessment.ts:448:	await updateStateAndQuestion(onerosterUserSourcedId, onerosterResourceSourcedId, state.attemptNumber, questionIndex, {
src/lib/actions/assessment.ts:475:	onerosterResourceSourcedId: string,
src/lib/actions/assessment.ts:484:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/assessment.ts:485:	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
src/lib/actions/assessment.ts:486:	const state = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
src/lib/actions/assessment.ts:489:			onerosterUserSourcedId,
src/lib/actions/assessment.ts:490:			onerosterResourceSourcedId,
src/lib/actions/assessment.ts:501:		onerosterUserSourcedId,
src/lib/actions/assessment.ts:502:		onerosterResourceSourcedId,
src/lib/actions/assessment.ts:517:		onerosterUserSourcedId,
src/lib/actions/assessment.ts:518:		onerosterResourceSourcedId,
src/lib/actions/assessment.ts:546:	onerosterResourceSourcedId: string,
src/lib/actions/assessment.ts:556:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/assessment.ts:557:	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
src/lib/actions/assessment.ts:559:	const currentState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
src/lib/actions/assessment.ts:562:			onerosterUserSourcedId,
src/lib/actions/assessment.ts:563:			onerosterResourceSourcedId,
src/lib/actions/assessment.ts:581:			onerosterUserSourcedId,
src/lib/actions/assessment.ts:582:			onerosterResourceSourcedId,
src/lib/actions/assessment.ts:611:	const newState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
src/lib/actions/assessment.ts:614:			onerosterUserSourcedId,
src/lib/actions/assessment.ts:615:			onerosterResourceSourcedId,
src/lib/actions/assessment.ts:634: * @param onerosterUserSourcedId - The user's OneRoster sourcedId
src/lib/actions/assessment.ts:635: * @param onerosterAssessmentSourcedId - The OneRoster assessment resource sourcedId
src/lib/actions/assessment.ts:638:export async function checkExistingProficiency(onerosterAssessmentSourcedId: string): Promise<boolean> {
src/lib/actions/assessment.ts:644:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/assessment.ts:646:		onerosterUserSourcedId,
src/lib/actions/assessment.ts:647:		onerosterAssessmentSourcedId
src/lib/actions/assessment.ts:650:	const strictLineItemId = getAssessmentLineItemId(onerosterAssessmentSourcedId)
src/lib/actions/assessment.ts:653:		oneroster.getAllResults({
src/lib/actions/assessment.ts:654:			filter: `student.sourcedId='${onerosterUserSourcedId}' AND assessmentLineItem.sourcedId='${strictLineItemId}'`
src/lib/actions/assessment.ts:659:			onerosterUserSourcedId,
src/lib/actions/assessment.ts:660:			onerosterAssessmentSourcedId,
src/lib/actions/assessment.ts:668:	const latestResult = findLatestInteractiveAttempt(resultsResult.data, onerosterUserSourcedId, strictLineItemId)
src/lib/actions/assessment.ts:672:			onerosterUserSourcedId,
src/lib/actions/assessment.ts:673:			onerosterAssessmentSourcedId
src/lib/actions/assessment.ts:680:			onerosterUserSourcedId,
src/lib/actions/assessment.ts:681:			onerosterAssessmentSourcedId,
src/lib/actions/assessment.ts:692:		onerosterUserSourcedId,
src/lib/actions/assessment.ts:693:		onerosterAssessmentSourcedId,
src/lib/actions/assessment.ts:722:	onerosterResourceSourcedId: string
src/lib/actions/assessment.ts:723:	onerosterComponentResourceSourcedId: string
src/lib/actions/assessment.ts:724:	onerosterCourseSourcedId: string
src/lib/actions/assessment.ts:737:	const onerosterUserSourcedId = await getCurrentUserSourcedId(clerkUserId)
src/lib/actions/assessment.ts:738:	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, options.onerosterResourceSourcedId)
src/lib/actions/assessment.ts:740:	const state = await getAssessmentState(onerosterUserSourcedId, options.onerosterResourceSourcedId, attemptNumber)
src/lib/actions/assessment.ts:743:			onerosterUserSourcedId,
src/lib/actions/assessment.ts:744:			onerosterResourceSourcedId: options.onerosterResourceSourcedId,
src/lib/actions/assessment.ts:765:			onerosterUserSourcedId,
src/lib/actions/assessment.ts:766:			options.onerosterResourceSourcedId,
src/lib/actions/assessment.ts:775:					onerosterUserSourcedId,
src/lib/actions/assessment.ts:776:					onerosterResourceSourcedId: options.onerosterResourceSourcedId,
src/lib/actions/assessment.ts:804:			userSourcedId: onerosterUserSourcedId,
src/lib/actions/assessment.ts:805:			resourceSourcedId: options.onerosterResourceSourcedId,
src/lib/actions/assessment.ts:850:			onerosterUserSourcedId,
src/lib/actions/assessment.ts:872:				resourceSourcedId: options.onerosterResourceSourcedId
src/lib/actions/assessment.ts:917:			onerosterUserSourcedId,
src/lib/actions/assessment.ts:918:			options.onerosterResourceSourcedId,
src/lib/actions/assessment.ts:936:			onerosterUserSourcedId,
src/lib/actions/assessment.ts:937:			options.onerosterResourceSourcedId,
src/lib/actions/assessment.ts:1015: * @param onerosterResourceSourcedId - The OneRoster resource ID for the assessment
src/lib/actions/assessment.ts:1018:export async function startNewAssessmentAttempt(onerosterResourceSourcedId: string): Promise<{ success: boolean }> {
src/lib/actions/assessment.ts:1024:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/assessment.ts:1025:	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
src/lib/actions/assessment.ts:1027:	const existingState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
src/lib/actions/assessment.ts:1035:		await deleteAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
src/lib/actions/assessment.ts:1037:			onerosterUserSourcedId,
src/lib/actions/assessment.ts:1038:			onerosterResourceSourcedId,
src/lib/types/page.ts:53:		onerosterCourseSourcedId: string // The ID of the parent course for cache invalidation
src/lib/types/page.ts:68:		onerosterCourseSourcedId: string // The ID of the parent course for cache invalidation
src/lib/types/page.ts:84:		onerosterCourseSourcedId: string // The ID of the parent course for cache invalidation
src/lib/types/page.ts:100:		onerosterCourseSourcedId: string // The ID of the parent course for cache invalidation
src/lib/payloads/oneroster/supplementary-builder.ts:230:	logger.info("generating supplementary oneroster payload", {
src/lib/data/metrics.ts:3:import { caliper, oneroster } from "@/lib/clients"
src/lib/data/metrics.ts:4:import type { CourseReadSchemaType } from "@/lib/oneroster"
src/lib/data/metrics.ts:38:	const courses = await oneroster.getAllCourses({ filter: "status='active'" })
src/lib/data/metrics.ts:61:			const cls = await oneroster.getClass(classId)
src/lib/data/metrics.ts:75:	const enrollments = await oneroster.getAllEnrollments({ filter: "status='active'" })
src/lib/data/metrics.ts:86:	const result = await errors.try(oneroster.getAllUsers())
src/lib/data/metrics.ts:246:	const allClasses = await oneroster.getAllClasses({ filter: "status='active'" })
src/lib/authorization.ts:7:import { getActiveEnrollmentsForUser, getClass } from "@/lib/data/fetchers/oneroster"
src/lib/authorization.ts:27:	const onerosterUserSourcedId = metadata.sourceId
src/lib/authorization.ts:29:	if (!onerosterUserSourcedId) {
src/lib/authorization.ts:34:	return onerosterUserSourcedId
src/lib/authorization.ts:69:	const onerosterCourseSourcedId = `nice_${courseId}`
src/lib/authorization.ts:98:	const isEnrolled = classes.some((c) => c.course.sourcedId === onerosterCourseSourcedId)
src/lib/authorization.ts:103:		targetCourseId: onerosterCourseSourcedId,
src/lib/services/caliper-article.ts:12:import { getAllCoursesBySlug } from "@/lib/data/fetchers/oneroster"
src/lib/services/caliper-article.ts:21:    onerosterArticleResourceSourcedId: string,
src/lib/services/caliper-article.ts:30:    const existingState = await getCaliperArticleReadState(userSourcedId, onerosterArticleResourceSourcedId)
src/lib/services/caliper-article.ts:45:        logger.debug("article already finalized, skipping accumulate", { articleId: onerosterArticleResourceSourcedId })
src/lib/services/caliper-article.ts:74:        articleId: onerosterArticleResourceSourcedId,
src/lib/services/caliper-article.ts:78:    await setCaliperArticleReadState(userSourcedId, onerosterArticleResourceSourcedId, newState)
src/lib/services/caliper-article.ts:83:    onerosterArticleResourceSourcedId: string,
src/lib/services/caliper-article.ts:88:    const state = await getCaliperArticleReadState(userSourcedId, onerosterArticleResourceSourcedId)
src/lib/services/caliper-article.ts:90:        logger.debug("article partial finalize: no state found", { articleId: onerosterArticleResourceSourcedId })
src/lib/services/caliper-article.ts:94:        logger.debug("article partial finalize: already finalized", { articleId: onerosterArticleResourceSourcedId })
src/lib/services/caliper-article.ts:106:        onerosterArticleResourceSourcedId,
src/lib/services/caliper-article.ts:112:        articleId: onerosterArticleResourceSourcedId,
src/lib/services/caliper-article.ts:128:    await setCaliperArticleReadState(userSourcedId, onerosterArticleResourceSourcedId, newState)
src/lib/services/caliper-article.ts:132:        logger.info("writing article time spent to oneroster", {
src/lib/services/caliper-article.ts:134:            resourceSourcedId: onerosterArticleResourceSourcedId,
src/lib/services/caliper-article.ts:141:            resourceSourcedId: onerosterArticleResourceSourcedId,
src/lib/services/caliper-article.ts:146:        logger.warn("skipping oneroster time spent write: course not found", {
src/lib/services/caliper-article.ts:149:            resourceSourcedId: onerosterArticleResourceSourcedId
src/lib/services/caliper-article.ts:156:    onerosterArticleResourceSourcedId: string,
src/lib/services/caliper-article.ts:165:    const lockKey = getArticleFinalizationLockKey(userSourcedId, onerosterArticleResourceSourcedId)
src/lib/services/caliper-article.ts:173:            articleId: onerosterArticleResourceSourcedId,
src/lib/services/caliper-article.ts:191:        getCaliperArticleReadState(userSourcedId, onerosterArticleResourceSourcedId)
src/lib/services/caliper-article.ts:200:        logger.debug("article finalize: no state found", { articleId: onerosterArticleResourceSourcedId })
src/lib/services/caliper-article.ts:205:        logger.debug("article finalize: already finalized", { articleId: onerosterArticleResourceSourcedId })
src/lib/services/caliper-article.ts:217:                onerosterArticleResourceSourcedId,
src/lib/services/caliper-article.ts:231:            articleId: onerosterArticleResourceSourcedId,
src/lib/services/caliper-article.ts:249:        setCaliperArticleReadState(userSourcedId, onerosterArticleResourceSourcedId, finalState)
src/lib/services/caliper-article.ts:261:        logger.info("writing article time spent to oneroster", {
src/lib/services/caliper-article.ts:263:            resourceSourcedId: onerosterArticleResourceSourcedId,
src/lib/services/caliper-article.ts:270:            resourceSourcedId: onerosterArticleResourceSourcedId,
src/lib/services/caliper-article.ts:275:        logger.warn("skipping oneroster time spent write: course not found", {
src/lib/services/caliper-article.ts:278:            resourceSourcedId: onerosterArticleResourceSourcedId
src/lib/data/resource-redirect.ts:8:} from "@/lib/data/fetchers/oneroster"
src/lib/data/resource-redirect.ts:9:import { ComponentMetadataSchema, CourseMetadataSchema, ResourceMetadataSchema } from "@/lib/metadata/oneroster"
src/lib/services/proficiency.ts:3:import { oneroster, qti } from "@/lib/clients"
src/lib/services/proficiency.ts:4:import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
src/lib/services/proficiency.ts:29: * @param onerosterUserSourcedId - The user's OneRoster sourcedId
src/lib/services/proficiency.ts:30: * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId
src/lib/services/proficiency.ts:33: * @param onerosterCourseSourcedId - The sourcedId of the course for cache invalidation.
src/lib/services/proficiency.ts:37:	onerosterUserSourcedId: string,
src/lib/services/proficiency.ts:38:	onerosterComponentResourceSourcedId: string,
src/lib/services/proficiency.ts:41:	onerosterCourseSourcedId: string,
src/lib/services/proficiency.ts:45:		onerosterUserSourcedId,
src/lib/services/proficiency.ts:46:		onerosterComponentResourceSourcedId,
src/lib/services/proficiency.ts:53:	const componentResourceResult = await errors.try(oneroster.getComponentResource(onerosterComponentResourceSourcedId))
src/lib/services/proficiency.ts:56:			onerosterComponentResourceSourcedId,
src/lib/services/proficiency.ts:63:		logger.error("component resource data is null", { onerosterComponentResourceSourcedId, correlationId })
src/lib/services/proficiency.ts:68:	const resourceResult = await errors.try(oneroster.getResource(resourceSourcedId))
src/lib/services/proficiency.ts:124:		const onerosterResourceSourcedId = `nice_${khanExerciseId}`
src/lib/services/proficiency.ts:128:			onerosterResourceSourcedId,
src/lib/services/proficiency.ts:131:		return { qtiItemId: question.id, onerosterResourceSourcedId }
src/lib/services/proficiency.ts:137:			qtiItemIdToOneRosterResourceSourcedIdMap.set(result.qtiItemId, result.onerosterResourceSourcedId)
src/lib/services/proficiency.ts:142:		logger.info("no questions could be mapped to exercises", { onerosterComponentResourceSourcedId, correlationId })
src/lib/services/proficiency.ts:150:		const onerosterResourceSourcedIds = Array.from(new Set(qtiItemIdToOneRosterResourceSourcedIdMap.values()))
src/lib/services/proficiency.ts:153:		const currentResultsPromises = onerosterResourceSourcedIds.map(async (onerosterResourceSourcedId) => {
src/lib/services/proficiency.ts:155:				oneroster.getAllResults({
src/lib/services/proficiency.ts:156:					filter: `student.sourcedId='${onerosterUserSourcedId}' AND assessmentLineItem.sourcedId='${getAssessmentLineItemId(onerosterResourceSourcedId)}'`
src/lib/services/proficiency.ts:162:					onerosterResourceSourcedId,
src/lib/services/proficiency.ts:170:			const strictLineItemId = getAssessmentLineItemId(onerosterResourceSourcedId)
src/lib/services/proficiency.ts:171:			const baseIdPrefix = `nice_${onerosterUserSourcedId}_${strictLineItemId}_attempt_`
src/lib/services/proficiency.ts:186:					return { onerosterResourceSourcedId, currentScore: normalized }
src/lib/services/proficiency.ts:196:				currentProficiencyMap.set(result.onerosterResourceSourcedId, result.currentScore)
src/lib/services/proficiency.ts:205:		const onerosterResourceSourcedId = qtiItemIdToOneRosterResourceSourcedIdMap.get(question.id)
src/lib/services/proficiency.ts:206:		if (!onerosterResourceSourcedId) {
src/lib/services/proficiency.ts:209:				onerosterComponentResourceSourcedId,
src/lib/services/proficiency.ts:215:		if (!performanceMap.has(onerosterResourceSourcedId)) {
src/lib/services/proficiency.ts:216:			performanceMap.set(onerosterResourceSourcedId, {
src/lib/services/proficiency.ts:217:				exerciseId: onerosterResourceSourcedId,
src/lib/services/proficiency.ts:223:		const performance = performanceMap.get(onerosterResourceSourcedId)
src/lib/services/proficiency.ts:233:				onerosterResourceSourcedId,
src/lib/services/proficiency.ts:244:			onerosterComponentResourceSourcedId,
src/lib/services/proficiency.ts:283:			const resultSourcedId = generateResultSourcedId(onerosterUserSourcedId, exerciseId, false)
src/lib/services/proficiency.ts:295:				courseSourcedId: onerosterCourseSourcedId
src/lib/services/proficiency.ts:302:					userSourcedId: onerosterUserSourcedId,
src/lib/services/proficiency.ts:304:					comment: `Proficiency updated from assessment ${onerosterComponentResourceSourcedId}`,
src/lib/services/proficiency.ts:316:		onerosterComponentResourceSourcedId,
src/lib/utils/assessment-results.ts:1:import type { AssessmentResult } from "@/lib/oneroster"
src/lib/actions/course-progression.ts:9:import { getActiveEnrollmentsForUser } from "@/lib/data/fetchers/oneroster"
src/lib/actions/course-progression.ts:29:	const { getClass } = await import("@/lib/data/fetchers/oneroster")
src/lib/payloads/oneroster/course.ts:174:	.prepare("src_lib_payloads_oneroster_course_get_course_by_id")
src/lib/payloads/oneroster/course.ts:182:	.prepare("src_lib_payloads_oneroster_course_get_all_subjects")
src/lib/payloads/oneroster/course.ts:192:	logger.info("starting oneroster payload generation", { courseId })
src/lib/payloads/oneroster/course.ts:396:	logger.debug("transforming database entities to oneroster objects", { courseId })
src/lib/payloads/oneroster/course.ts:424:	const onerosterPayload: OneRosterPayload = {
src/lib/payloads/oneroster/course.ts:536:		onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:557:		onerosterPayload.courseComponents.push({
src/lib/payloads/oneroster/course.ts:574:			onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:593:			onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:615:					onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:636:			onerosterPayload.courseComponents.push({
src/lib/payloads/oneroster/course.ts:764:					onerosterPayload.resources.push({
src/lib/payloads/oneroster/course.ts:781:						onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:800:							onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:830:					onerosterPayload.componentResources.push({
src/lib/payloads/oneroster/course.ts:878:				onerosterPayload.resources.push({
src/lib/payloads/oneroster/course.ts:908:			onerosterPayload.courseComponents.push({
src/lib/payloads/oneroster/course.ts:924:			onerosterPayload.componentResources.push({
src/lib/payloads/oneroster/course.ts:944:		onerosterPayload.courseComponents.push({
src/lib/payloads/oneroster/course.ts:983:				onerosterPayload.resources.push({
src/lib/payloads/oneroster/course.ts:1011:			onerosterPayload.componentResources.push({
src/lib/payloads/oneroster/course.ts:1037:	const resourceById = new Map(onerosterPayload.resources.map((r) => [r.sourcedId, r]))
src/lib/payloads/oneroster/course.ts:1038:	for (const cr of onerosterPayload.componentResources) {
src/lib/payloads/oneroster/course.ts:1083:	const courseMetadata: Record<string, unknown> = onerosterPayload.course.metadata ?? {}
src/lib/payloads/oneroster/course.ts:1085:	onerosterPayload.course.metadata = courseMetadata
src/lib/payloads/oneroster/course.ts:1089:	const lessonComponents = onerosterPayload.courseComponents.filter((cc) => cc.parent !== undefined)
src/lib/payloads/oneroster/course.ts:1091:		const componentResources = onerosterPayload.componentResources.filter(
src/lib/payloads/oneroster/course.ts:1106:	const unitComponents = onerosterPayload.courseComponents.filter((cc) => cc.parent === undefined)
src/lib/payloads/oneroster/course.ts:1108:		const childComponents = onerosterPayload.courseComponents.filter(
src/lib/payloads/oneroster/course.ts:1121:	logger.info("oneroster payload generation complete", { courseId })
src/lib/payloads/oneroster/course.ts:1122:	return onerosterPayload
src/lib/actions/courses.ts:8:import { oneroster } from "@/lib/clients"
src/lib/actions/courses.ts:14:} from "@/lib/data/fetchers/oneroster"
src/lib/actions/courses.ts:16:import { CourseMetadataSchema } from "@/lib/metadata/oneroster"
src/lib/actions/courses.ts:131:			oneroster.createEnrollment({
src/lib/actions/courses.ts:153:		createCacheKey(["oneroster-getEnrollmentsForUser", sourceId]),
src/lib/actions/courses.ts:154:		createCacheKey(["oneroster-getActiveEnrollmentsForUser", sourceId])
src/lib/actions/courses.ts:230:			oneroster.createEnrollment({
src/lib/actions/courses.ts:251:		delOps.push(oneroster.deleteEnrollment(enrollment.sourcedId))
src/lib/actions/courses.ts:266:		createCacheKey(["oneroster-getEnrollmentsForUser", sourceId]),
src/lib/actions/courses.ts:267:		createCacheKey(["oneroster-getActiveEnrollmentsForUser", sourceId])
src/lib/actions/courses.ts:307:function mapFromOneRosterSubjects(onerosterSubjects: string[]): string {
src/lib/actions/courses.ts:309:	if (onerosterSubjects.includes("Reading") || onerosterSubjects.includes("Vocabulary")) {
src/lib/actions/courses.ts:314:	return onerosterSubjects[0] || "Other"
src/lib/actions/courses.ts:323:	logger.info("fetching explore dropdown data from oneroster api", { orgId: ONEROSTER_ORG_ID })
src/lib/actions/courses.ts:371:		logger.error("failed to fetch classes from oneroster", { error: classesResult.error })
src/lib/actions/courses.ts:372:		throw errors.wrap(classesResult.error, "oneroster class fetch")
src/lib/actions/courses.ts:375:		logger.error("failed to fetch courses from oneroster", { error: coursesResult.error })
src/lib/actions/courses.ts:376:		throw errors.wrap(coursesResult.error, "oneroster course fetch")
src/lib/data/course.ts:9:} from "@/lib/data/fetchers/oneroster"
src/lib/data/course.ts:11:import { ComponentMetadataSchema, CourseMetadataSchema, ResourceMetadataSchema } from "@/lib/metadata/oneroster"
src/lib/actions/proficiency.ts:8:import { oneroster, qti } from "@/lib/clients"
src/lib/actions/proficiency.ts:9:import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
src/lib/actions/proficiency.ts:32: * @param onerosterUserSourcedId - The user's OneRoster sourcedId
src/lib/actions/proficiency.ts:33: * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId
src/lib/actions/proficiency.ts:36: * @param onerosterCourseSourcedId - The sourcedId of the course for cache invalidation.
src/lib/actions/proficiency.ts:39:	onerosterComponentResourceSourcedId: string,
src/lib/actions/proficiency.ts:42:	onerosterCourseSourcedId: string
src/lib/actions/proficiency.ts:49:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/proficiency.ts:51:		onerosterUserSourcedId,
src/lib/actions/proficiency.ts:52:		onerosterComponentResourceSourcedId,
src/lib/actions/proficiency.ts:58:	const componentResourceResult = await errors.try(oneroster.getComponentResource(onerosterComponentResourceSourcedId))
src/lib/actions/proficiency.ts:61:			onerosterComponentResourceSourcedId,
src/lib/actions/proficiency.ts:67:		logger.error("component resource data is null", { componentResourceId: onerosterComponentResourceSourcedId })
src/lib/actions/proficiency.ts:72:	const resourceResult = await errors.try(oneroster.getResource(resourceSourcedId))
src/lib/actions/proficiency.ts:125:		const onerosterResourceSourcedId = `nice_${khanExerciseId}`
src/lib/actions/proficiency.ts:129:			onerosterResourceSourcedId
src/lib/actions/proficiency.ts:131:		return { qtiItemId: question.id, onerosterResourceSourcedId }
src/lib/actions/proficiency.ts:137:			qtiItemIdToOneRosterResourceSourcedIdMap.set(result.qtiItemId, result.onerosterResourceSourcedId)
src/lib/actions/proficiency.ts:142:		logger.info("no questions could be mapped to exercises", { onerosterComponentResourceSourcedId })
src/lib/actions/proficiency.ts:150:		const onerosterResourceSourcedIds = Array.from(new Set(qtiItemIdToOneRosterResourceSourcedIdMap.values()))
src/lib/actions/proficiency.ts:153:		const currentResultsPromises = onerosterResourceSourcedIds.map(async (onerosterResourceSourcedId) => {
src/lib/actions/proficiency.ts:155:				oneroster.getAllResults({
src/lib/actions/proficiency.ts:156:					filter: `student.sourcedId='${onerosterUserSourcedId}' AND assessmentLineItem.sourcedId='${getAssessmentLineItemId(onerosterResourceSourcedId)}'`
src/lib/actions/proficiency.ts:162:					onerosterResourceSourcedId,
src/lib/actions/proficiency.ts:169:			const strictLineItemId = getAssessmentLineItemId(onerosterResourceSourcedId)
src/lib/actions/proficiency.ts:170:			const baseIdPrefix = `nice_${onerosterUserSourcedId}_${strictLineItemId}_attempt_`
src/lib/actions/proficiency.ts:185:					return { onerosterResourceSourcedId, currentScore: normalized }
src/lib/actions/proficiency.ts:195:				currentProficiencyMap.set(result.onerosterResourceSourcedId, result.currentScore)
src/lib/actions/proficiency.ts:204:		const onerosterResourceSourcedId = qtiItemIdToOneRosterResourceSourcedIdMap.get(question.id)
src/lib/actions/proficiency.ts:205:		if (!onerosterResourceSourcedId) {
src/lib/actions/proficiency.ts:206:			logger.warn("could not map question to exercise", { qtiItemId: question.id, onerosterComponentResourceSourcedId })
src/lib/actions/proficiency.ts:210:		if (!performanceMap.has(onerosterResourceSourcedId)) {
src/lib/actions/proficiency.ts:211:			performanceMap.set(onerosterResourceSourcedId, {
src/lib/actions/proficiency.ts:212:				exerciseId: onerosterResourceSourcedId,
src/lib/actions/proficiency.ts:218:		const performance = performanceMap.get(onerosterResourceSourcedId)
src/lib/actions/proficiency.ts:228:				onerosterResourceSourcedId,
src/lib/actions/proficiency.ts:237:		logger.info("no exercises found with answered questions to update", { onerosterComponentResourceSourcedId })
src/lib/actions/proficiency.ts:274:					onerosterResourceSourcedId: exerciseId,
src/lib/actions/proficiency.ts:278:					onerosterCourseSourcedId
src/lib/actions/proficiency.ts:288:		onerosterComponentResourceSourcedId,
src/lib/payloads/oneroster/course-only.ts:95:	.prepare("src_lib_payloads_oneroster_course_only_get_course_by_id")
src/lib/payloads/oneroster/course-only.ts:103:	.prepare("src_lib_payloads_oneroster_course_only_get_all_subjects")
src/lib/payloads/oneroster/course-only.ts:113:	logger.info("starting oneroster course object generation", { courseId })
src/lib/payloads/oneroster/course-only.ts:167:	const onerosterCourse: OneRosterCourse = {
src/lib/payloads/oneroster/course-only.ts:190:	logger.info("oneroster course object generation complete", {
src/lib/payloads/oneroster/course-only.ts:192:		sourcedId: onerosterCourse.sourcedId,
src/lib/payloads/oneroster/course-only.ts:193:		subjects: onerosterCourse.subjects,
src/lib/payloads/oneroster/course-only.ts:194:		grades: onerosterCourse.grades
src/lib/payloads/oneroster/course-only.ts:197:	return onerosterCourse
src/lib/data/progress.ts:8:import { oneroster } from "@/lib/clients"
src/lib/data/progress.ts:38: * @param onerosterCourseSourcedId - The course sourcedId
src/lib/data/progress.ts:43:	onerosterCourseSourcedId: string
src/lib/data/progress.ts:47:			logger.info("fetching user unit progress from API", { userId, onerosterCourseSourcedId })
src/lib/data/progress.ts:66:				oneroster.getAllResults({
src/lib/data/progress.ts:124:				onerosterCourseSourcedId,
src/lib/data/progress.ts:132:		["user-progress", userId, onerosterCourseSourcedId], // keyParts array
src/lib/actions/tracking.ts:18:import { oneroster } from "@/lib/clients"
src/lib/actions/tracking.ts:21:import { getAllCoursesBySlug } from "@/lib/data/fetchers/oneroster"
src/lib/actions/tracking.ts:41:	onerosterVideoResourceSourcedId: string,
src/lib/actions/tracking.ts:67:	const currentState = (await getCaliperVideoWatchState(serverSourcedId, onerosterVideoResourceSourcedId)) ?? {
src/lib/actions/tracking.ts:116:	await setCaliperVideoWatchState(serverSourcedId, onerosterVideoResourceSourcedId, newState)
src/lib/actions/tracking.ts:134:        await finalizeCaliperTimeSpentEvent(serverSourcedId, onerosterVideoResourceSourcedId, videoTitle, courseInfo, userEmail)
src/lib/actions/tracking.ts:166:    onerosterVideoResourceSourcedId: string,
src/lib/actions/tracking.ts:182:    const state = await getCaliperVideoWatchState(serverSourcedId, onerosterVideoResourceSourcedId)
src/lib/actions/tracking.ts:186:			videoId: onerosterVideoResourceSourcedId
src/lib/actions/tracking.ts:193:			videoId: onerosterVideoResourceSourcedId
src/lib/actions/tracking.ts:203:			videoId: onerosterVideoResourceSourcedId
src/lib/actions/tracking.ts:211:		onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:217:		videoId: onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:234:        setCaliperVideoWatchState(serverSourcedId, onerosterVideoResourceSourcedId, newState)
src/lib/actions/tracking.ts:238:			videoId: onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:247:		videoId: onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:255:		logger.info("writing video time spent to oneroster", {
src/lib/actions/tracking.ts:257:			resourceSourcedId: onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:264:			resourceSourcedId: onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:269:		logger.warn("skipping oneroster time spent write: course not found", {
src/lib/actions/tracking.ts:272:			resourceSourcedId: onerosterVideoResourceSourcedId
src/lib/actions/tracking.ts:278:    onerosterUserSourcedId: string,
src/lib/actions/tracking.ts:279:    onerosterVideoResourceSourcedId: string,
src/lib/actions/tracking.ts:294:    if (onerosterUserSourcedId !== serverSourcedId) {
src/lib/actions/tracking.ts:295:        logger.error("caliper finalize: sourcedId mismatch", { clientUserSourcedId: onerosterUserSourcedId, serverSourcedId })
src/lib/actions/tracking.ts:298:	const lockKey = getCaliperFinalizationLockKey(onerosterUserSourcedId, onerosterVideoResourceSourcedId)
src/lib/actions/tracking.ts:307:	const state = await getCaliperVideoWatchState(onerosterUserSourcedId, onerosterVideoResourceSourcedId)
src/lib/actions/tracking.ts:320:		onerosterUserSourcedId,
src/lib/actions/tracking.ts:322:		onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:329:			videoId: onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:330:			user: onerosterUserSourcedId,
src/lib/actions/tracking.ts:350:	await setCaliperVideoWatchState(onerosterUserSourcedId, onerosterVideoResourceSourcedId, finalState)
src/lib/actions/tracking.ts:354:		logger.info("writing video time spent to oneroster", {
src/lib/actions/tracking.ts:355:			userSourcedId: onerosterUserSourcedId,
src/lib/actions/tracking.ts:356:			resourceSourcedId: onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:362:			userSourcedId: onerosterUserSourcedId,
src/lib/actions/tracking.ts:363:			resourceSourcedId: onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:368:		logger.warn("skipping oneroster time spent write: course not found", {
src/lib/actions/tracking.ts:370:			userSourcedId: onerosterUserSourcedId,
src/lib/actions/tracking.ts:371:			resourceSourcedId: onerosterVideoResourceSourcedId
src/lib/actions/tracking.ts:385: * @param onerosterUserSourcedId - The user's OneRoster sourcedId
src/lib/actions/tracking.ts:386: * @param onerosterArticleResourceSourcedId - The OneRoster resource sourcedId for the article
src/lib/actions/tracking.ts:390:	onerosterArticleResourceSourcedId: string,
src/lib/actions/tracking.ts:398:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/tracking.ts:399:	logger.info("tracking article view", { onerosterUserSourcedId, onerosterArticleResourceSourcedId })
src/lib/actions/tracking.ts:402:	const onerosterLineItemSourcedId = getAssessmentLineItemId(onerosterArticleResourceSourcedId)
src/lib/actions/tracking.ts:405:	const onerosterResultSourcedId = `nice_${onerosterUserSourcedId}_${onerosterLineItemSourcedId}`
src/lib/actions/tracking.ts:409:			assessmentLineItem: { sourcedId: onerosterLineItemSourcedId, type: "assessmentLineItem" as const },
src/lib/actions/tracking.ts:410:			student: { sourcedId: onerosterUserSourcedId, type: "user" as const },
src/lib/actions/tracking.ts:419:	const result = await errors.try(oneroster.putResult(onerosterResultSourcedId, resultPayload))
src/lib/actions/tracking.ts:422:			onerosterUserSourcedId,
src/lib/actions/tracking.ts:423:			onerosterArticleResourceSourcedId,
src/lib/actions/tracking.ts:432:	const onerosterCourseSourcedId = await resolveCourseSourcedId(courseInfo.courseSlug)
src/lib/actions/tracking.ts:433:	if (onerosterCourseSourcedId) {
src/lib/actions/tracking.ts:434:		const cacheKey = cacheUtils.userProgressByCourse(onerosterUserSourcedId, onerosterCourseSourcedId)
src/lib/actions/tracking.ts:440:		onerosterUserSourcedId,
src/lib/actions/tracking.ts:441:		onerosterArticleResourceSourcedId,
src/lib/actions/tracking.ts:442:		onerosterResultSourcedId
src/lib/actions/tracking.ts:453: * @param onerosterUserSourcedId - The user's OneRoster sourcedId
src/lib/actions/tracking.ts:454: * @param onerosterVideoResourceSourcedId - The OneRoster resource sourcedId for the video
src/lib/actions/tracking.ts:460:	onerosterVideoResourceSourcedId: string,
src/lib/actions/tracking.ts:470:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/tracking.ts:474:			onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:487:		onerosterUserSourcedId,
src/lib/actions/tracking.ts:488:		onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:505:			onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:506:			onerosterUserSourcedId,
src/lib/actions/tracking.ts:512:	const onerosterLineItemSourcedId = getAssessmentLineItemId(onerosterVideoResourceSourcedId)
src/lib/actions/tracking.ts:514:	const onerosterResultSourcedId = `nice_${onerosterUserSourcedId}_${onerosterLineItemSourcedId}`
src/lib/actions/tracking.ts:520:	const existingResult = await errors.try(oneroster.getResult(onerosterResultSourcedId))
src/lib/actions/tracking.ts:525:				onerosterResultSourcedId,
src/lib/actions/tracking.ts:531:		logger.debug("no existing video result, proceeding with completion", { onerosterResultSourcedId })
src/lib/actions/tracking.ts:548:			assessmentLineItem: { sourcedId: onerosterLineItemSourcedId, type: "assessmentLineItem" as const },
src/lib/actions/tracking.ts:549:			student: { sourcedId: onerosterUserSourcedId, type: "user" as const },
src/lib/actions/tracking.ts:557:		onerosterResultSourcedId,
src/lib/actions/tracking.ts:560:		onerosterVideoResourceSourcedId
src/lib/actions/tracking.ts:563:	const result = await errors.try(oneroster.putResult(onerosterResultSourcedId, resultPayload))
src/lib/actions/tracking.ts:568:			onerosterUserSourcedId,
src/lib/actions/tracking.ts:569:			onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:579:	const onerosterCourseSourcedId = await resolveCourseSourcedId(courseInfo.courseSlug)
src/lib/actions/tracking.ts:580:	if (onerosterCourseSourcedId) {
src/lib/actions/tracking.ts:581:		const cacheKey = cacheUtils.userProgressByCourse(onerosterUserSourcedId, onerosterCourseSourcedId)
src/lib/actions/tracking.ts:587:		onerosterUserSourcedId,
src/lib/actions/tracking.ts:588:		onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:598:	onerosterResourceSourcedId: string
src/lib/actions/tracking.ts:602:	onerosterCourseSourcedId: string
src/lib/actions/tracking.ts:613:	onerosterComponentResourceSourcedId?: string
src/lib/actions/tracking.ts:638:	const onerosterUserSourcedId = await getCurrentUserSourcedId(clerkUserId)
src/lib/actions/tracking.ts:642:		onerosterResourceSourcedId: resourceId,
src/lib/actions/tracking.ts:646:		onerosterCourseSourcedId: courseId,
src/lib/actions/tracking.ts:650:		onerosterComponentResourceSourcedId,
src/lib/actions/tracking.ts:679:	const onerosterLineItemSourcedId = getAssessmentLineItemId(resourceId)
src/lib/actions/tracking.ts:680:	const baseResultSourcedId = `nice_${onerosterUserSourcedId}_${onerosterLineItemSourcedId}`
src/lib/actions/tracking.ts:681:	const onerosterResultSourcedId =
src/lib/actions/tracking.ts:722:				userSourcedId: onerosterUserSourcedId,
src/lib/actions/tracking.ts:724:				componentResourceId: onerosterComponentResourceSourcedId ?? resourceId,
src/lib/actions/tracking.ts:804:			assessmentLineItem: { sourcedId: onerosterLineItemSourcedId, type: "assessmentLineItem" as const },
src/lib/actions/tracking.ts:805:			student: { sourcedId: onerosterUserSourcedId, type: "user" as const },
src/lib/actions/tracking.ts:817:	const result = await errors.try(oneroster.putResult(onerosterResultSourcedId, resultPayload))
src/lib/actions/tracking.ts:824:	const cacheKey = cacheUtils.userProgressByCourse(onerosterUserSourcedId, courseId)
src/lib/actions/tracking.ts:831:		onerosterResultSourcedId,
src/lib/actions/tracking.ts:854:				id: constructActorId(onerosterUserSourcedId),
src/lib/actions/tracking.ts:865:					id: `${env.TIMEBACK_ONEROSTER_SERVER_URL}/ims/oneroster/rostering/v1p2/courses/${courseId}`
src/lib/actions/tracking.ts:897:	if (isInteractiveAssessment && onerosterComponentResourceSourcedId && sessionResults && attemptNumber) {
src/lib/actions/tracking.ts:899:			onerosterComponentResourceSourcedId,
src/lib/actions/tracking.ts:903:			updateProficiencyFromAssessment(onerosterComponentResourceSourcedId, attemptNumber, sessionResults, courseId)
src/lib/actions/tracking.ts:908:				onerosterComponentResourceSourcedId
src/lib/actions/tracking.ts:915:		onerosterResultSourcedId,
src/lib/actions/tracking.ts:924: * @param onerosterUserSourcedId - The user's OneRoster sourcedId
src/lib/actions/tracking.ts:925: * @param onerosterVideoResourceSourcedId - The OneRoster resource sourcedId for the video
src/lib/actions/tracking.ts:929:	onerosterVideoResourceSourcedId: string
src/lib/actions/tracking.ts:936:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/tracking.ts:938:		onerosterUserSourcedId,
src/lib/actions/tracking.ts:939:		onerosterVideoResourceSourcedId
src/lib/actions/tracking.ts:943:	const onerosterLineItemSourcedId = getAssessmentLineItemId(onerosterVideoResourceSourcedId)
src/lib/actions/tracking.ts:944:	const onerosterResultSourcedId = `nice_${onerosterUserSourcedId}_${onerosterLineItemSourcedId}`
src/lib/actions/tracking.ts:946:	const result = await errors.try(oneroster.getResult(onerosterResultSourcedId))
src/lib/actions/tracking.ts:949:			onerosterUserSourcedId,
src/lib/actions/tracking.ts:950:			onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:959:			onerosterUserSourcedId,
src/lib/actions/tracking.ts:960:			onerosterVideoResourceSourcedId
src/lib/actions/tracking.ts:970:		onerosterUserSourcedId,
src/lib/actions/tracking.ts:971:		onerosterVideoResourceSourcedId,
src/lib/actions/tracking.ts:989:	onerosterUserSourcedId: string,
src/lib/actions/tracking.ts:990:	onerosterArticleResourceSourcedId: string,
src/lib/actions/tracking.ts:999:	if (onerosterUserSourcedId !== serverSourcedId) {
src/lib/actions/tracking.ts:1001:			clientUserSourcedId: onerosterUserSourcedId,
src/lib/actions/tracking.ts:1013:	const existingState = await getCaliperArticleReadState(serverSourcedId, onerosterArticleResourceSourcedId)
src/lib/actions/tracking.ts:1028:		logger.debug("article already finalized, skipping accumulate", { articleId: onerosterArticleResourceSourcedId })
src/lib/actions/tracking.ts:1057:		articleId: onerosterArticleResourceSourcedId,
src/lib/actions/tracking.ts:1061:	await setCaliperArticleReadState(serverSourcedId, onerosterArticleResourceSourcedId, newState)
src/lib/actions/tracking.ts:1065:    onerosterUserSourcedId: string,
src/lib/actions/tracking.ts:1066:    onerosterArticleResourceSourcedId: string,
src/lib/actions/tracking.ts:1071:    const state = await getCaliperArticleReadState(onerosterUserSourcedId, onerosterArticleResourceSourcedId)
src/lib/actions/tracking.ts:1073:		logger.debug("article partial finalize: no state found", { articleId: onerosterArticleResourceSourcedId })
src/lib/actions/tracking.ts:1077:		logger.debug("article partial finalize: already finalized", { articleId: onerosterArticleResourceSourcedId })
src/lib/actions/tracking.ts:1087:        onerosterUserSourcedId,
src/lib/actions/tracking.ts:1089:        onerosterArticleResourceSourcedId,
src/lib/actions/tracking.ts:1095:		articleId: onerosterArticleResourceSourcedId,
src/lib/actions/tracking.ts:1096:		user: onerosterUserSourcedId,
src/lib/actions/tracking.ts:1111:    await setCaliperArticleReadState(onerosterUserSourcedId, onerosterArticleResourceSourcedId, newState)
src/lib/actions/tracking.ts:1116:		logger.info("writing article time spent to oneroster", {
src/lib/actions/tracking.ts:1117:			userSourcedId: onerosterUserSourcedId,
src/lib/actions/tracking.ts:1118:			resourceSourcedId: onerosterArticleResourceSourcedId,
src/lib/actions/tracking.ts:1124:            userSourcedId: onerosterUserSourcedId,
src/lib/actions/tracking.ts:1125:			resourceSourcedId: onerosterArticleResourceSourcedId,
src/lib/actions/tracking.ts:1130:		logger.warn("skipping oneroster time spent write: course not found", {
src/lib/actions/tracking.ts:1132:			userSourcedId: onerosterUserSourcedId,
src/lib/actions/tracking.ts:1133:			resourceSourcedId: onerosterArticleResourceSourcedId
src/lib/actions/tracking.ts:1139:    onerosterUserSourcedId: string,
src/lib/actions/tracking.ts:1140:    onerosterArticleResourceSourcedId: string,
src/lib/actions/tracking.ts:1149:	const lockKey = getArticleFinalizationLockKey(onerosterUserSourcedId, onerosterArticleResourceSourcedId)
src/lib/actions/tracking.ts:1157:			articleId: onerosterArticleResourceSourcedId,
src/lib/actions/tracking.ts:1158:			user: onerosterUserSourcedId
src/lib/actions/tracking.ts:1175:		getCaliperArticleReadState(onerosterUserSourcedId, onerosterArticleResourceSourcedId)
src/lib/actions/tracking.ts:1184:		logger.debug("article finalize: no state found", { articleId: onerosterArticleResourceSourcedId })
src/lib/actions/tracking.ts:1189:		logger.debug("article finalize: already finalized", { articleId: onerosterArticleResourceSourcedId })
src/lib/actions/tracking.ts:1199:                onerosterUserSourcedId,
src/lib/actions/tracking.ts:1201:                onerosterArticleResourceSourcedId,
src/lib/actions/tracking.ts:1215:			articleId: onerosterArticleResourceSourcedId,
src/lib/actions/tracking.ts:1233:		setCaliperArticleReadState(onerosterUserSourcedId, onerosterArticleResourceSourcedId, finalState)
src/lib/actions/tracking.ts:1245:		logger.info("writing article time spent to oneroster", {
src/lib/actions/tracking.ts:1246:			userSourcedId: onerosterUserSourcedId,
src/lib/actions/tracking.ts:1247:			resourceSourcedId: onerosterArticleResourceSourcedId,
src/lib/actions/tracking.ts:1253:			userSourcedId: onerosterUserSourcedId,
src/lib/actions/tracking.ts:1254:			resourceSourcedId: onerosterArticleResourceSourcedId,
src/lib/actions/tracking.ts:1259:		logger.warn("skipping oneroster time spent write: course not found", {
src/lib/actions/tracking.ts:1261:			userSourcedId: onerosterUserSourcedId,
src/lib/actions/tracking.ts:1262:			resourceSourcedId: onerosterArticleResourceSourcedId
src/lib/data/profile.ts:5:import { oneroster } from "@/lib/clients"
src/lib/data/profile.ts:6:import { getActiveEnrollmentsForUser, getClass, getCourse, getUnitsForCourses } from "@/lib/data/fetchers/oneroster"
src/lib/data/profile.ts:8:import { CourseMetadataSchema } from "@/lib/metadata/oneroster"
src/lib/data/profile.ts:12:import type { ClassReadSchemaType } from "../oneroster"
src/lib/data/profile.ts:120:		oneroster.getAllResults({
src/lib/data/profile.ts:175:	const { CourseMetadataSchema } = await import("@/lib/metadata/oneroster")
src/lib/data/profile.ts:176:	const { getCourse } = await import("@/lib/data/fetchers/oneroster")
src/lib/data/profile.ts:254:		oneroster.getAllResults({
src/lib/data/profile.ts:443:			import("@/lib/data/fetchers/oneroster").then(({ getAllResources }) => errors.try(getAllResources()))
src/lib/data/profile.ts:452:			const { ComponentMetadataSchema, ResourceMetadataSchema } = await import("@/lib/metadata/oneroster")
src/lib/data/profile.ts:453:			const { getAllComponentResources } = await import("@/lib/data/fetchers/oneroster")
src/lib/data/content.ts:10:import { getResourcesBySlugAndType } from "@/lib/data/fetchers/oneroster"
src/lib/data/content.ts:11:import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
src/lib/data/content.ts:119:			onerosterCourseSourcedId: layoutData.courseData.id,
src/lib/data/fetchers/oneroster.ts:4:import { oneroster } from "@/lib/clients"
src/lib/data/fetchers/oneroster.ts:6:import type { ClassReadSchemaType } from "@/lib/oneroster"
src/lib/data/fetchers/oneroster.ts:92:		const course = await oneroster.getCourse(sourcedId)
src/lib/data/fetchers/oneroster.ts:96:	return redisCache(operation, ["oneroster-getCourse", sourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:102:		const resource = await oneroster.getResource(sourcedId)
src/lib/data/fetchers/oneroster.ts:106:	return redisCache(operation, ["oneroster-getResource", sourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:112:		const classEntity = await oneroster.getClass(classSourcedId)
src/lib/data/fetchers/oneroster.ts:116:	return redisCache(operation, ["oneroster-getClass", classSourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:126:		const courses = await oneroster.getAllCourses({ filter: NICE_PREFIX_FILTER })
src/lib/data/fetchers/oneroster.ts:131:	return redisCache(operation, ["oneroster-getAllCourses"], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:137:		const courses = await oneroster.getAllCourses({ filter: `metadata.khanSlug='${slug}' AND status='active'` })
src/lib/data/fetchers/oneroster.ts:141:	return redisCache(operation, ["oneroster-getAllCoursesBySlug", slug], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:147:		const components = await oneroster.getCourseComponents({
src/lib/data/fetchers/oneroster.ts:153:	return redisCache(operation, ["oneroster-getCourseComponentsByCourseId", courseSourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:159:		const components = await oneroster.getCourseComponents({
src/lib/data/fetchers/oneroster.ts:165:	return redisCache(operation, ["oneroster-getCourseComponentsByParentId", parentSourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:171:		const components = await oneroster.getCourseComponents({
src/lib/data/fetchers/oneroster.ts:177:	return redisCache(operation, ["oneroster-getCourseComponentBySlug", slug], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:185:		const components = await oneroster.getCourseComponents({
src/lib/data/fetchers/oneroster.ts:193:	return redisCache(operation, ["oneroster-getCourseComponentByCourseAndSlug", courseSourcedId, slug], {
src/lib/data/fetchers/oneroster.ts:203:		const components = await oneroster.getCourseComponents({
src/lib/data/fetchers/oneroster.ts:211:	return redisCache(operation, ["oneroster-getCourseComponentByParentAndSlug", parentSourcedId, slug], {
src/lib/data/fetchers/oneroster.ts:222:		const components = await oneroster.getCourseComponents({ filter })
src/lib/data/fetchers/oneroster.ts:226:	return redisCache(operation, ["oneroster-getUnitsForCourses", ...courseSourcedIds], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:234:		const resources = await oneroster.getAllResources({ filter: NICE_PREFIX_FILTER })
src/lib/data/fetchers/oneroster.ts:239:	return redisCache(operation, ["oneroster-getAllResources"], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:252:		const resources = await oneroster.getAllResources({ filter })
src/lib/data/fetchers/oneroster.ts:295:		? ["oneroster-getResourcesBySlugAndType", slug, type, khanActivityType]
src/lib/data/fetchers/oneroster.ts:296:		: ["oneroster-getResourcesBySlugAndType", slug, type]
src/lib/data/fetchers/oneroster.ts:307:		const resources = await oneroster.getAllComponentResources({ filter: NICE_PREFIX_FILTER })
src/lib/data/fetchers/oneroster.ts:312:	return redisCache(operation, ["oneroster-getAllComponentResources"], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:318:		const classes = await oneroster.getAllClasses({
src/lib/data/fetchers/oneroster.ts:324:	return redisCache(operation, ["oneroster-getClassesForSchool", schoolSourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:330:		const enrollments = await oneroster.getEnrollmentsForUser(userSourcedId)
src/lib/data/fetchers/oneroster.ts:335:	return redisCache(operation, ["oneroster-getEnrollmentsForUser", userSourcedId], { revalidate: 10 }) // 10 seconds cache
src/lib/data/fetchers/oneroster.ts:343:		const allEnrollments = await oneroster.getAllEnrollments({
src/lib/data/fetchers/oneroster.ts:376:	return redisCache(operation, ["oneroster-getActiveEnrollmentsForUser", userSourcedId], { revalidate: 10 }) // 10 seconds cache
src/lib/data/fetchers/oneroster.ts:398:		const componentResources = await oneroster.getAllComponentResources({
src/lib/data/fetchers/oneroster.ts:405:	return redisCache(operation, ["oneroster-getComponentResourcesForCourse", courseSourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:446:	return redisCache(operation, ["oneroster-getComponentResourceForResourceInCourse", courseSourcedId, resourceSourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:460:		const resources = await oneroster.getAllResources({
src/lib/data/fetchers/oneroster.ts:470:	return redisCache(operation, ["oneroster-getResourcesByIds", ...sortedIds], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:484:		const componentResources = await oneroster.getAllComponentResources({
src/lib/data/fetchers/oneroster.ts:494:	return redisCache(operation, ["oneroster-getComponentResourcesByLessonIds", ...sortedIds], { revalidate: 3600 * 24 }) // 24-hour cache
src/lib/data/fetchers/oneroster.ts:504:        const components = await oneroster.getCourseComponents({
src/lib/data/fetchers/oneroster.ts:509:    return redisCache(operation, ["oneroster-getCourseComponentsBySourcedId", sourcedId], { revalidate: 3600 * 24 })
src/lib/data/fetchers/oneroster.ts:519:    return oneroster.getResult(sourcedId)
src/lib/data/fetchers/interactive-helpers.ts:11:} from "@/lib/data/fetchers/oneroster"
src/lib/data/fetchers/interactive-helpers.ts:15:import { type ResourceMetadata, ResourceMetadataSchema } from "@/lib/metadata/oneroster"
src/lib/data/fetchers/interactive-helpers.ts:16:import type { Resource } from "@/lib/oneroster"
src/lib/data/fetchers/interactive-helpers.ts:137:		const { getCourseComponentsByParentId } = await import("@/lib/data/fetchers/oneroster")
src/lib/data/fetchers/interactive-helpers.ts:251:	onerosterCourseSourcedId: string
src/lib/data/fetchers/interactive-helpers.ts:266:	const onerosterCourseSourcedId = course.sourcedId
src/lib/data/fetchers/interactive-helpers.ts:270:		getCourseComponentByCourseAndSlug(onerosterCourseSourcedId, "course-challenge")
src/lib/data/fetchers/interactive-helpers.ts:275:			onerosterCourseSourcedId
src/lib/data/fetchers/interactive-helpers.ts:282:		logger.warn("course challenge component not found for course", { onerosterCourseSourcedId })
src/lib/data/fetchers/interactive-helpers.ts:289:		onerosterCourseSourcedId
src/lib/data/fetchers/interactive-helpers.ts:322:			onerosterCourseSourcedId
src/lib/data/fetchers/interactive-helpers.ts:352:			onerosterCourseSourcedId
src/lib/data/fetchers/interactive-helpers.ts:359:		logger.error("no matching resources remain after filtering", { slug: params.test, onerosterCourseSourcedId })
src/lib/data/fetchers/interactive-helpers.ts:399:		onerosterCourseSourcedId

```


## Assistant

<thinking>


**Inspecting assessment-cache directory**
</thinking>

**Tool Call: Read assessment-cache.ts**
Status: Completed

```ts
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { redis } from "@/lib/redis"

const ASSESSMENT_STATE_TTL_SECONDS = 60 * 60 * 24 * 7 // 1 week

// --- Exported Errors for Type-Safe Handling ---
export const ErrAssessmentStateNotFound = errors.new("assessment state not found")
export const ErrRedisUnavailable = errors.new("assessment service unavailable")

// --- State Shape ---
export interface AssessmentQuestionState {
	isCorrect: boolean | null // null for reported questions
	response: unknown
	isReported?: boolean
}

export interface AssessmentState {
	attemptNumber: number
	currentQuestionIndex: number
	totalQuestions: number
	startedAt: string // ISO 8601
	questions: Record<number, AssessmentQuestionState>
	isFinalized: boolean
	finalizationError: string | null
	finalSummary: {
		score: number
		correctAnswersCount: number | null
		totalQuestions: number | null
		xpPenaltyInfo?: { penaltyXp: number; reason: string; avgSecondsPerQuestion?: number }
	} | null
}

// --- Zod Schemas for Runtime Validation ---
const AssessmentQuestionStateSchema = z.object({
	isCorrect: z.boolean().nullable(),
	response: z.unknown(),
	isReported: z.boolean().optional()
})

const AssessmentStateWithoutQuestionsSchema = z.object({
	attemptNumber: z.number(),
	currentQuestionIndex: z.number(),
	totalQuestions: z.number(),
	startedAt: z.string(),
	isFinalized: z.boolean(),
	finalizationError: z.string().nullable(),
	finalSummary: z
		.object({
			score: z.number(),
			correctAnswersCount: z.number().nullable(),
			totalQuestions: z.number().nullable(),
			xpPenaltyInfo: z
				.object({
					penaltyXp: z.number(),
					reason: z.string(),
					avgSecondsPerQuestion: z.number().optional()
				})
				.optional()
		})
		.nullable()
})

// --- Key Schema ---
function getCacheKey(userId: string, assessmentId: string, attemptNumber: number): string {
	// Key Schema: assess:state:{userId}:{assessmentId}:{attempt}
	return `assess:state:${userId}:${assessmentId}:${attemptNumber}`
}

function getQuestionsHashKey(userId: string, assessmentId: string, attemptNumber: number): string {
	// Key Schema: assess:questions:{userId}:{assessmentId}:{attempt}
	return `assess:questions:${userId}:${assessmentId}:${attemptNumber}`
}

export async function getAssessmentState(
	userId: string,
	assessmentId: string,
	attemptNumber: number
): Promise<AssessmentState | null> {
	if (!redis) {
		logger.error("redis not available for getAssessmentState")
		throw ErrRedisUnavailable
	}

	const key = getCacheKey(userId, assessmentId, attemptNumber)
	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)

	const stateResult = await errors.try(redis.get(key))
	if (stateResult.error) {
		logger.error("failed to get assessment state from redis", { key, error: stateResult.error })
		throw errors.wrap(stateResult.error, "redis get state")
	}

	if (!stateResult.data) {
		return null
	}

	const stateData = stateResult.data
	const parsedState = errors.trySync(() => JSON.parse(stateData))
	if (parsedState.error) {
		logger.error("failed to parse assessment state JSON", { error: parsedState.error })
		throw errors.wrap(parsedState.error, "parse assessment state")
	}

	const stateValidation = AssessmentStateWithoutQuestionsSchema.safeParse(parsedState.data)
	if (!stateValidation.success) {
		logger.error("invalid assessment state format", { error: stateValidation.error })
		throw errors.wrap(stateValidation.error, "validate assessment state")
	}

	const state = stateValidation.data

	// Get all questions from the hash
	const questionsResult = await errors.try(redis.hGetAll(questionsKey))
	if (questionsResult.error) {
		logger.error("failed to get assessment questions from redis", { questionsKey, error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "redis get questions")
	}

	const questions: Record<number, AssessmentQuestionState> = {}
	for (const [index, value] of Object.entries(questionsResult.data)) {
		const parsedQuestion = errors.trySync(() => JSON.parse(value))
		if (parsedQuestion.error) {
			logger.error("failed to parse question JSON", { index, error: parsedQuestion.error })
			throw errors.wrap(parsedQuestion.error, `parse question ${index}`)
		}

		const questionValidation = AssessmentQuestionStateSchema.safeParse(parsedQuestion.data)
		if (!questionValidation.success) {
			logger.error("invalid question state format", { index, error: questionValidation.error })
			throw errors.wrap(questionValidation.error, `validate question ${index}`)
		}

		// After successful validation, we know the data conforms to AssessmentQuestionState
		const validatedQuestion: AssessmentQuestionState = {
			isCorrect: questionValidation.data.isCorrect,
			response: questionValidation.data.response,
			isReported: questionValidation.data.isReported
		}
		questions[Number(index)] = validatedQuestion
	}

	// Refresh TTL on read
	await redis.expire(key, ASSESSMENT_STATE_TTL_SECONDS)
	await redis.expire(questionsKey, ASSESSMENT_STATE_TTL_SECONDS)

	return { ...state, questions }
}

export async function createAssessmentState(
	userId: string,
	assessmentId: string,
	attemptNumber: number,
	totalQuestions: number
): Promise<AssessmentState> {
	if (!redis) {
		logger.error("redis not available")
		throw ErrRedisUnavailable
	}
	const key = getCacheKey(userId, assessmentId, attemptNumber)
	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)

	const newState: Omit<AssessmentState, "questions"> = {
		attemptNumber,
		currentQuestionIndex: 0,
		totalQuestions,
		startedAt: new Date().toISOString(),
		isFinalized: false,
		finalizationError: null,
		finalSummary: null
	}

	const multi = redis.multi()
	multi.set(key, JSON.stringify(newState), { EX: ASSESSMENT_STATE_TTL_SECONDS })
	multi.expire(questionsKey, ASSESSMENT_STATE_TTL_SECONDS) // Ensure hash key also has TTL

	const result = await errors.try(multi.exec())
	if (result.error) {
		logger.error("failed to create assessment state in redis", { key, error: result.error })
		throw errors.wrap(result.error, "redis create state transaction")
	}

	return { ...newState, questions: {} }
}

export async function updateStateAndQuestion(
	userId: string,
	assessmentId: string,
	attemptNumber: number,
	questionIndex: number,
	questionState: AssessmentQuestionState,
	overwrite = false
): Promise<{ wasWritten: boolean }> {
	if (!redis) {
		logger.error("redis not available")
		throw ErrRedisUnavailable
	}

	const stateKey = getCacheKey(userId, assessmentId, attemptNumber)
```


## Assistant

<thinking>


**Continuing to understand**
</thinking>

**Tool Call: Read assessment-cache.ts**
Status: Completed

```ts
	const stateKey = getCacheKey(userId, assessmentId, attemptNumber)
	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)

	let attempts = 0
	while (attempts < 3) {
		await redis.watch(stateKey)

		const stateResult = await errors.try(redis.get(stateKey))
		if (stateResult.error) {
			await redis.unwatch() // Ensure unwatch on failure
			logger.error("redis get failed for atomic update", { stateKey, error: stateResult.error })
			throw errors.wrap(stateResult.error, "redis get for atomic update")
		}
		if (!stateResult.data) {
			await redis.unwatch() // Ensure unwatch on failure
			logger.error("assessment state not found for atomic update", { stateKey })
			throw ErrAssessmentStateNotFound
		}

		// (Existing parsing and validation logic remains unchanged)
		const stateData = stateResult.data
		const parsedState = errors.trySync(() => JSON.parse(stateData))
		if (parsedState.error) {
			await redis.unwatch()
			logger.error("failed to parse assessment state JSON for update", { error: parsedState.error })
			throw errors.wrap(parsedState.error, "parse assessment state for update")
		}

		const stateValidation = AssessmentStateWithoutQuestionsSchema.safeParse(parsedState.data)
		if (!stateValidation.success) {
			await redis.unwatch()
			logger.error("invalid assessment state format for update", { error: stateValidation.error })
			throw errors.wrap(stateValidation.error, "validate assessment state for update")
		}

		const state = stateValidation.data

		// CRITICAL CHECK: Ensure we are not processing an out-of-order request
		if (state.currentQuestionIndex !== questionIndex) {
			await redis.unwatch()
			logger.error("out-of-order answer submission detected during atomic update", {
				stateKey,
				currentIndex: state.currentQuestionIndex,
				submittedIndex: questionIndex
			})
			throw errors.new("out-of-order answer submission")
		}

		state.currentQuestionIndex = questionIndex + 1

		const multi = redis.multi()
		if (overwrite) {
			multi.hSet(questionsKey, String(questionIndex), JSON.stringify(questionState))
		} else {
			multi.hSetNX(questionsKey, String(questionIndex), JSON.stringify(questionState))
		}
		multi.set(stateKey, JSON.stringify(state), { EX: ASSESSMENT_STATE_TTL_SECONDS })
		multi.expire(questionsKey, ASSESSMENT_STATE_TTL_SECONDS)

		const execResult = await errors.try(multi.exec())

		if (execResult.data !== null) {
			if (execResult.error) {
				logger.error("atomic state/question update failed", { error: execResult.error })
				throw errors.wrap(execResult.error, "redis multi exec")
			}
			const wasWritten = overwrite ? true : Boolean(execResult.data?.[0] && Number(execResult.data[0]) === 1)
			return { wasWritten }
		}

		// If execResult.data is null, WATCH conflict occurred. Retry.
		await redis.unwatch()
		attempts++
		if (attempts < 3) {
			const delay = 2 ** attempts * 50 // Exponential backoff: 100ms, 200ms
			await new Promise((resolve) => setTimeout(resolve, delay))
		}
	}

	// If loop finishes, all retries failed.
	logger.error("failed to update assessment state due to concurrent modification after retries", { stateKey })
	throw errors.new("concurrent modification after retries")
}

export async function markAssessmentFinalized(
	userId: string,
	assessmentId: string,
	attemptNumber: number,
	summary: AssessmentState["finalSummary"]
): Promise<void> {
	if (!redis) {
		logger.error("redis not available for markAssessmentFinalized")
		throw ErrRedisUnavailable
	}

	const key = getCacheKey(userId, assessmentId, attemptNumber)
	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)

	const stateResult = await errors.try(redis.get(key))
	if (stateResult.error) {
		logger.error("failed to get assessment state for finalization", { key, error: stateResult.error })
		throw errors.wrap(stateResult.error, "redis get state for finalization")
	}
	if (!stateResult.data) {
		logger.warn("assessment state not found, cannot mark as finalized", { key })
		// Do not throw; the absence of state implies it might have been cleaned up already.
		return
	}

	const stateData = stateResult.data
	const parsedState = errors.trySync(() => JSON.parse(stateData))
	if (parsedState.error) {
		logger.error("failed to parse assessment state JSON for finalization", { error: parsedState.error })
		throw errors.wrap(parsedState.error, "parse assessment state for finalization")
	}

	const stateValidation = AssessmentStateWithoutQuestionsSchema.safeParse(parsedState.data)
	if (!stateValidation.success) {
		logger.error("invalid assessment state format for finalization", { error: stateValidation.error })
		throw errors.wrap(stateValidation.error, "validate assessment state for finalization")
	}

	const state = stateValidation.data
	state.isFinalized = true
	state.finalSummary = summary

	// Use a pipeline to set the state and refresh TTL on both keys
	const multi = redis.multi()
	multi.set(key, JSON.stringify(state), { EX: ASSESSMENT_STATE_TTL_SECONDS }) // Reset TTL
	multi.expire(questionsKey, ASSESSMENT_STATE_TTL_SECONDS)

	const result = await errors.try(multi.exec())
	if (result.error) {
		logger.error("failed to mark assessment state as finalized in redis", { key, error: result.error })
		throw errors.wrap(result.error, "redis set finalized state")
	}

	logger.info("assessment state marked as finalized", { userId, assessmentId, attemptNumber })
}

export async function deleteAssessmentState(
	userId: string,
	assessmentId: string,
	attemptNumber: number
): Promise<void> {
	if (!redis) {
		logger.error("redis not available")
		throw ErrRedisUnavailable
	}

	const stateKey = getCacheKey(userId, assessmentId, attemptNumber)
	const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)

	const multi = redis.multi()
	multi.del(stateKey)
	multi.del(questionsKey)

	const result = await errors.try(multi.exec())
	if (result.error) {
		logger.error("failed to delete assessment state from redis", { stateKey, questionsKey, error: result.error })
		throw errors.wrap(result.error, "redis delete state")
	}

	logger.info("assessment state deleted", { userId, assessmentId, attemptNumber })
}

export async function markAssessmentFinalizationFailed(
	userId: string,
	assessmentId: string,
	attemptNumber: number,
	errorMessage: string
): Promise<void> {
	if (!redis) {
		logger.error("redis not available for markAssessmentFinalizationFailed")
		throw ErrRedisUnavailable
	}

	const key = getCacheKey(userId, assessmentId, attemptNumber)
	const stateResult = await errors.try(redis.get(key))
	if (stateResult.error || !stateResult.data) {
		logger.error("failed to get assessment state to mark as failed", { key, error: stateResult.error })
		// Do not throw; if state is gone, there's nothing to mark.
		return
	}

	const stateData = stateResult.data
	const parsedState = errors.trySync(() => JSON.parse(stateData))
	const stateValidation = AssessmentStateWithoutQuestionsSchema.safeParse(parsedState.data)

	if (parsedState.error || !stateValidation.success) {
		logger.error("failed to parse existing state to mark as failed", { key })
		return // Cannot safely modify, so we abort.
	}

	const state = stateValidation.data
	state.finalizationError = errorMessage

	const setResult = await errors.try(redis.set(key, JSON.stringify(state), { KEEPTTL: true }))
	if (setResult.error) {
		logger.error("failed to set finalizationError in redis", { key, error: setResult.error })
		throw errors.wrap(setResult.error, "redis set finalizationError")
```


## Assistant

<thinking>


**Inspecting assessment-line-items utility**
</thinking>

**Tool Call: Read assessment-line-items.ts**
Status: Completed

```ts
/**
 * Utility functions for converting between resource IDs and assessment line item IDs.
 *
 * This module handles the conversion logic in one place to ensure consistency
 * across the entire application when working with OneRoster assessment line items.
 */

/**
 * Converts a resource ID to its corresponding assessment line item ID.
 *
 * @param resourceId - The OneRoster resource sourcedId (e.g., "nice_xa3cbcc67cc56d4a1")
 * @returns The assessment line item sourcedId (e.g., "nice_xa3cbcc67cc56d4a1_ali")
 */
export function getAssessmentLineItemId(resourceId: string): string {
	return `${resourceId}_ali`
}

/**
 * Converts an assessment line item ID back to its original resource ID.
 *
 * @param lineItemId - The assessment line item sourcedId (e.g., "nice_xa3cbcc67cc56d4a1_ali")
 * @returns The original resource sourcedId (e.g., "nice_xa3cbcc67cc56d4a1")
 */
export function getResourceIdFromLineItem(lineItemId: string): string {
	return lineItemId.replace("_ali", "")
}

/**
 * Checks if a given ID is an assessment line item ID (ends with '_ali').
 *
 * @param id - The ID to check
 * @returns True if the ID appears to be an assessment line item ID
 */
export function isAssessmentLineItemId(id: string): boolean {
	return id.endsWith("_ali")
}

/**
 * Converts an array of resource IDs to their corresponding assessment line item IDs.
 *
 * @param resourceIds - Array of resource sourcedIds
 * @returns Array of assessment line item sourcedIds
 */
export function getAssessmentLineItemIds(resourceIds: string[]): string[] {
	return resourceIds.map(getAssessmentLineItemId)
}
```


## Assistant

<thinking>


**Exploring SaveAssessmentResultCommand definition**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
import { z } from "zod"
import { SUBJECT_SLUGS } from "@/lib/constants/subjects"
import type { Unit } from "@/lib/types/domain"

export const SaveAssessmentResultCommandSchema = z.object({
	clerkUserId: z.string(),
	correlationId: z.string().uuid(),
	onerosterResourceSourcedId: z.string(),
	onerosterComponentResourceSourcedId: z.string(),
	onerosterCourseSourcedId: z.string(),
	onerosterUserSourcedId: z.string(),
	sessionResults: z.array(
		z.object({ qtiItemId: z.string(), isCorrect: z.boolean().nullable(), isReported: z.boolean().optional() })
	),
	attemptNumber: z.number().int().min(1),
	durationInSeconds: z.number().optional(),
	expectedXp: z.number(),
	assessmentTitle: z.string(),
	assessmentPath: z.string(),
	unitData: z.custom<Unit>().optional(),
	userEmail: z.string().email(), // CHANGED: Made required for Caliper analytics
	contentType: z.enum(["Exercise", "Quiz", "Test", "CourseChallenge"]),
	score: z.number().int().min(0).max(100),
	correctAnswers: z.number().int(),
	totalQuestions: z.number().int(),
	isInteractiveAssessment: z.boolean(),
	subjectSlug: z.enum(SUBJECT_SLUGS),
	courseSlug: z.string(),
	userPublicMetadata: z.unknown().optional()
})

export type SaveAssessmentResultCommand = z.infer<typeof SaveAssessmentResultCommandSchema>
```


## Assistant

<thinking>


**Tracing assessment stepper flow**
</thinking>

**Tool Call: Search startNewAssessmentAttempt in assessment.ts**
Status: Completed

```sh
1018:export async function startNewAssessmentAttempt(onerosterResourceSourcedId: string): Promise<{ success: boolean }> {
1021:		logger.error("startNewAssessmentAttempt failed: user not authenticated")
```


**Tool Call: Read assessment.ts**
Status: Completed

```ts
			reportedBy: clerkUserId
		}

		logger.info("updating question metadata", { questionId, updatedMetadata })

		const updatePayload = {
			identifier: existingItem.identifier,
			xml: existingItem.rawXml,
			metadata: updatedMetadata
		}

		await qti.updateAssessmentItem(updatePayload)
	}

	const flagResult = await errors.try(flagQuestionOperation())
	if (flagResult.error) {
		logger.error("failed to flag question in qti api", { clerkUserId, questionId, error: flagResult.error })
		throw errors.wrap(flagResult.error, "flagging question in qti api")
	}

	logger.info("successfully flagged question as reported", { clerkUserId, questionId })
	return { success: true }
}

/**
 * Clears the current assessment state from Redis for a user, allowing getOrCreateAssessmentState
 * to generate a new attempt on the next page load.
 *
 * CRITICAL BUSINESS LOGIC:
 * This action clears ANY existing assessment state from Redis, regardless of finalization status.
 * The purpose is to clear the way for a new attempt. Since Redis is our ephemeral progress cache
 * and finalized attempts are already persisted in OneRoster (the source of truth), it's safe
 * to clear even finalized states from Redis. This makes the action's behavior consistent and
 * less brittle - it always succeeds in clearing the way for a new attempt.
 *
 * @param onerosterResourceSourcedId - The OneRoster resource ID for the assessment
 * @returns Success status (always true unless an error occurs)
 */
export async function startNewAssessmentAttempt(onerosterResourceSourcedId: string): Promise<{ success: boolean }> {
	const { userId } = await auth()
	if (!userId) {
		logger.error("startNewAssessmentAttempt failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)

	const existingState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)

	// FIX: Remove the !existingState.isFinalized check.
	// The purpose of this action is to clear the way for a new attempt.
	// If a state exists in Redis (our ephemeral progress cache), it should be cleared.
	// The finalized attempt is already persisted in OneRoster, which is the source of truth.
	// This makes the action's behavior consistent and less brittle.
	if (existingState) {
		await deleteAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
		logger.info("cleared previous assessment state to start new one", {
			onerosterUserSourcedId,
			onerosterResourceSourcedId,
			attemptNumber,
			wasFinalized: existingState.isFinalized
		})
		return { success: true }
	}

	// If no state exists, there's nothing to do.
	return { success: true }
}
```


## Assistant

<thinking>


**Searching for getOrCreateAssessmentState**
</thinking>

**Tool Call: Search getOrCreateAssessmentState in assessment.ts**
Status: Completed

```sh
232:export async function getOrCreateAssessmentState(onerosterResourceSourcedId: string): Promise<AssessmentState> {
235:		logger.error("getOrCreateAssessmentState failed: user not authenticated")
1005: * Clears the current assessment state from Redis for a user, allowing getOrCreateAssessmentState
```


**Tool Call: Read assessment.ts**
Status: Completed

```ts
		} as const
	}

	// Single response or array response (multi-select)
	if (!allowedIds.has(responseIdentifier)) {
		logger.error("undeclared response identifier for single response", {
			qtiItemId,
			responseIdentifier,
			allowedIdentifiers: Array.from(allowedIds)
		})
		throw errors.new("undeclared response identifier")
	}

	const qtiResult = await errors.try(qti.processResponse(qtiItemId, { responseIdentifier, value: selectedResponse }))
	if (qtiResult.error) {
		logger.error("qti response processing failed", { error: qtiResult.error, qtiItemId })
		throw errors.wrap(qtiResult.error, "qti response processing")
	}

	const isCorrect = qtiResult.data.score > 0
	return {
		isCorrect,
		score: isCorrect ? 1 : 0,
		feedback: isCorrect ? "Correct!" : "Not quite right. Try again."
	} as const
}

/**
 * Gets or creates the assessment state in Redis.
 * If the assessment is already finalized or completed, triggers finalization and returns the finalized state.
 * Otherwise returns the current state to resume from.
 */
export async function getOrCreateAssessmentState(onerosterResourceSourcedId: string): Promise<AssessmentState> {
	const { userId } = await auth()
	if (!userId) {
		logger.error("getOrCreateAssessmentState failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)

	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
	const existingState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)

	if (existingState) {
		// If the state exists and is already finalized, simply return it.
		// The client will use this to display the summary screen.
		if (existingState.isFinalized) {
			logger.info("resuming an already finalized assessment state", {
				onerosterUserSourcedId,
				onerosterResourceSourcedId,
				attemptNumber
			})
			return existingState
		}
		// This is a valid, in-progress state that can be resumed.
		return existingState
	}

	const questions = await getDeterministicQuestionList(
		onerosterUserSourcedId,
		onerosterResourceSourcedId,
		attemptNumber
	)
	return createAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber, questions.length)
}

/**
 * Submits the **first and only graded answer** for a question.
 *
 * This action is central to the assessment's integrity. It is called only on the user's
 * first attempt for a given question. It determines correctness, records the result and response
 * into the Redis state, and then **atomically advances the server's `currentQuestionIndex`**.
 *
 * This immediate advancement ensures that even if the user refreshes the page, their first
 * answer is locked in, preventing any attempts to "game" the system. Subsequent attempts on the
 * client-side are for formative feedback only and use the compute-only `processQuestionResponse` function.
 *
 * @returns An object containing the new, advanced `AssessmentState` and the `isCorrect` boolean.
 */
export async function submitAnswer(
	onerosterResourceSourcedId: string,
	questionId: string,
	questionIndex: number,
	responseValue: string | unknown[] | Record<string, unknown>,
	responseIdentifier: string
): Promise<{ state: AssessmentState; isCorrect: boolean }> {
	const { userId } = await auth()
	if (!userId) {
		logger.error("submitAnswer failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)

	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
	const state = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
	if (!state) {
		logger.error("assessment state not found", { onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber })
		throw ErrAssessmentStateNotFound
	}
	if (state.currentQuestionIndex !== questionIndex) {
		logger.error("out-of-order answer submission", {
			currentIndex: state.currentQuestionIndex,
			submittedIndex: questionIndex
		})
		throw errors.new("out-of-order answer submission")
	}

	const questionList = await getDeterministicQuestionList(
		onerosterUserSourcedId,
		onerosterResourceSourcedId,
		state.attemptNumber
	)
	if (questionList[questionIndex]?.id !== questionId) {
		logger.error("question id mismatch", {
			expectedId: questionList[questionIndex]?.id,
			receivedId: questionId,
			questionIndex
		})
		throw errors.new("question id mismatch")
	}
```


## Assistant

<thinking>


**Continuing state update exploration**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts

	// Process the response to determine correctness
	/**
	 * IMPORTANT: Temporary compatibility with AE Studios' OTI/QTI service
	 *
	 * See note in `processQuestionResponse` above. The same migration work applies
	 * here when we remove reliance on provider JSON and parse `rawXml` instead
	 * to obtain declared response identifiers and cardinalities.
	 */
	let isCorrect = false

	// Fetch authoritative response declarations to validate identifiers
	/**
	 * IMPORTANT: Temporary compatibility with AE Studios' OTI/QTI service
	 *
	 * We currently rely on the provider's JSON representation of assessment items
	 * (e.g., `responseDeclarations` on the GET /assessment-items/:id response) to
	 * derive the set of declared response identifiers for validation and filtering.
	 * This is necessary to harden against the iframe/player emitting undeclared
	 * identifiers (e.g., a stray "RESPONSE").
	 *
	 * TODO(migration): When we migrate off the current AE Studios implementation
	 * of OTI/QTI, REWRITE this logic to parse the raw XML (`rawXml`) directly
	 * to extract response declarations, their identifiers, cardinalities, and
	 * base types. Do not depend on provider-specific JSON shapes. The XML parse
	 * must be the single source of truth to avoid vendor lock-in and drift.
	 *
	 * Migration acceptance criteria:
	 * - Parse <qti-response-declaration> nodes from XML and compute `allowedIds`
	 * - Respect record vs single/multiple/ordered cardinality for how we submit
	 * - Keep unknown identifiers strictly rejected (no fallbacks)
	 * - Preserve the behavior documented by tests in
	 *   `tests/actions/assessment/response-filtering.test.ts`
	 */
	const itemResult = await errors.try(qti.getAssessmentItem(questionId))
	if (itemResult.error) {
		logger.error("failed to get qti assessment item for submit", { error: itemResult.error, questionId })
		throw errors.wrap(itemResult.error, "qti get assessment item")
	}
	const declarations = itemResult.data.responseDeclarations ?? []
	const allowedIds = new Set(declarations.map((d) => d.identifier))
	if (allowedIds.size === 0) {
		logger.error("qti item has no response declarations", { questionId })
		throw errors.new("qti item: no response declarations")
	}

	// Handle fill-in-the-blank questions with multiple responses
	if (typeof responseValue === "object" && !Array.isArray(responseValue) && responseValue !== null) {
		const originalEntries = Object.entries(responseValue)
		const responseEntries = originalEntries.filter(([id]) => allowedIds.has(id))

		logger.info("processing multi-input question", {
			qtiItemId: questionId,
			responseCount: responseEntries.length,
			responseIdentifiers: responseEntries.map(([id]) => id),
			ignoredIdentifiers: originalEntries.filter(([id]) => !allowedIds.has(id)).map(([id]) => id)
		})

		if (responseEntries.length === 0) {
			logger.error("no declared response identifiers present in selected response", {
				qtiItemId: questionId,
				allowedIdentifiers: Array.from(allowedIds),
				originalIdentifiers: originalEntries.map(([id]) => id)
			})
			throw errors.new("no declared response identifiers")
		}

		const results = await Promise.all(
			responseEntries.map(async ([identifier, value]) => {
				const normalizedValue = Array.isArray(value) ? value : String(value)
				const result = await errors.try(
					qti.processResponse(questionId, {
						responseIdentifier: identifier,
						value: normalizedValue
					})
				)
				if (result.error) {
					return result
				}
				return result
			})
		)

		const anyErrors = results.some((r) => r.error)
		if (anyErrors) {
			const failedResponses = results.filter((r) => r.error)
			logger.error("one or more qti response processing calls failed for multi-input question", {
				failedResponses: failedResponses.map((r, _idx) => ({
					identifier: responseEntries[results.indexOf(r)]?.[0],
					error: r.error
				})),
				qtiItemId: questionId,
				selectedResponse: responseValue
			})
			throw errors.new("qti response processing failed for multi-input question")
		}

		// The entire question is correct only if ALL individual responses are correct.
		isCorrect = results.every((r) => r.data && r.data.score > 0)

		logger.info("multi-input question processing complete", {
			qtiItemId: questionId,
			isCorrect,
			individualScores: results.map((r, idx) => ({
				identifier: responseEntries[idx]?.[0],
				score: r.data?.score
			}))
		})
	} else {
		// Single response or array response (multi-select)
		if (!allowedIds.has(responseIdentifier)) {
			logger.error("undeclared response identifier for single response", {
				qtiItemId: questionId,
				responseIdentifier,
				allowedIdentifiers: Array.from(allowedIds)
			})
			throw errors.new("undeclared response identifier")
		}

		const qtiResult = await errors.try(qti.processResponse(questionId, { responseIdentifier, value: responseValue }))
		if (qtiResult.error) {
			logger.error("qti response processing failed", { error: qtiResult.error, qtiItemId: questionId })
			throw errors.wrap(qtiResult.error, "qti response processing")
		}

		isCorrect = qtiResult.data.score > 0
	}

	await updateStateAndQuestion(onerosterUserSourcedId, onerosterResourceSourcedId, state.attemptNumber, questionIndex, {
		isCorrect,
		response: responseValue,
		isReported: false
	})

	// Refresh local state object based on what was just written
	state.questions[questionIndex] = { isCorrect, response: responseValue, isReported: false }
	state.currentQuestionIndex = questionIndex + 1

	// Note: We don't auto-finalize here since we don't have all required params
	// The client will need to call finalizeAssessment when ready
```


## Assistant

<thinking>


**Searching for function definition**
</thinking>

**Tool Call: Search getNextAttemptNumber in assessment.ts**
Status: Completed

```sh
240:	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
293:	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
485:	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
557:	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
628:export const getNextAttemptNumber = attempt.getNext
738:	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, options.onerosterResourceSourcedId)
1025:	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
```


## Assistant

<thinking>


**Reviewing import for attempt module**
</thinking>

**Tool Call: Read attempt.ts**
Status: Completed

```ts
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
import { filterInteractiveAttemptResults } from "@/lib/utils/assessment-results"

/**
 * Service for managing assessment attempt numbers.
 * This module is responsible for determining the next attempt number
 * for a user's assessment based on their previous attempts.
 */

/**
 * Computes the next attempt number for a user's assessment.
 * Queries OneRoster to find existing attempts and returns the next sequential number.
 *
 * @param userSourcedId - The OneRoster user sourcedId
 * @param resourceSourcedId - The OneRoster resource sourcedId
 * @returns The next attempt number (1-based)
 */
export async function getNext(userSourcedId: string, resourceSourcedId: string): Promise<number> {
	logger.info("computing next attempt number from oneroster", {
		userSourcedId,
		resourceSourcedId
	})

	const lineItemId = getAssessmentLineItemId(resourceSourcedId)
	const filter = `status='active' AND student.sourcedId='${userSourcedId}' AND assessmentLineItem.sourcedId='${lineItemId}'`
	const resultsResult = await errors.try(oneroster.getAllResults({ filter }))
	if (resultsResult.error) {
		logger.error("failed to fetch results for attempt derivation", {
			error: resultsResult.error,
			lineItemId
		})
		// Fail fast per no-fallbacks policy
		throw errors.wrap(resultsResult.error, "attempt number derivation")
	}

	// Use the centralized utility to filter results
	if (!Array.isArray(resultsResult.data)) {
		logger.error("invalid oneroster results shape for attempt derivation", { lineItemId })
		throw errors.new("attempt number derivation: invalid results shape")
	}
	const validAttempts = filterInteractiveAttemptResults(resultsResult.data, userSourcedId, lineItemId)

	const count = validAttempts.length
	const nextAttempt = count + 1
	logger.info("derived next attempt number", { lineItemId, existingResults: count, nextAttempt })

	return nextAttempt
}
```


## Assistant

<thinking>


**Checking utils for assessment-results**
</thinking>

**Tool Call: Read assessment-results.ts**
Status: Completed

```ts
import type { AssessmentResult } from "@/lib/oneroster"

/**
 * Checks if a result's sourcedId strictly matches the attempt-based ID pattern
 * for interactive assessments (Quizzes, Tests, Exercises).
 *
 * Pattern: `nice_${userSourcedId}_${lineItemId}_attempt_${n}`
 *
 * This is the single source of truth for identifying interactive assessment attempts.
 *
 * @param result The OneRoster result object.
 * @param userSourcedId The OneRoster user sourcedId.
 * @param lineItemId The OneRoster assessment line item sourcedId.
 * @returns True if the result matches the interactive attempt pattern.
 */
export function isInteractiveAttemptResult(
	result: AssessmentResult,
	userSourcedId: string,
	lineItemId: string
): boolean {
	const id = result.sourcedId
	if (typeof id !== "string") {
		return false
	}

	const baseIdPrefix = `nice_${userSourcedId}_${lineItemId}_attempt_`
	if (!id.startsWith(baseIdPrefix)) {
		return false
	}

	const suffix = id.slice(baseIdPrefix.length)
	return /^\d+$/.test(suffix)
}

/**
 * Checks if a result's sourcedId strictly matches the base ID pattern for
 * passive content (Articles, Videos).
 *
 * Pattern: `nice_${userSourcedId}_${lineItemId}`
 *
 * @param result The OneRoster result object.
 * @param userSourcedId The OneRoster user sourcedId.
 * @param lineItemId The OneRoster assessment line item sourcedId.
 * @returns True if the result matches the passive content pattern.
 */
export function isPassiveContentResult(result: AssessmentResult, userSourcedId: string, lineItemId: string): boolean {
	const id = result.sourcedId
	if (typeof id !== "string") {
		return false
	}

	const baseId = `nice_${userSourcedId}_${lineItemId}`
	return id === baseId
}

/**
 * Filters a list of OneRoster results to find only those matching the strict,
 * attempt-based ID pattern for a specific user and line item.
 *
 * @param results An array of OneRoster results.
 * @param userSourcedId The OneRoster user sourcedId.
 * @param lineItemId The OneRoster assessment line item sourcedId.
 * @returns A filtered array of results representing interactive attempts.
 */
export function filterInteractiveAttemptResults(
	results: AssessmentResult[],
	userSourcedId: string,
	lineItemId: string
): AssessmentResult[] {
	return results.filter((r) => isInteractiveAttemptResult(r, userSourcedId, lineItemId))
}

/**
 * Finds the most recent, valid assessment result for an *interactive assessment*
 * from a list, based on scoreDate.
 *
 * @param allUserResults An array of all results for a user.
 * @param userSourcedId The OneRoster user sourcedId.
 * @param lineItemId The specific OneRoster assessment line item sourcedId to check.
 * @returns The latest result object for that line item, or undefined if none found.
 */
export function findLatestInteractiveAttempt(
	allUserResults: AssessmentResult[],
	userSourcedId: string,
	lineItemId: string
): AssessmentResult | undefined {
	const validAttempts = filterInteractiveAttemptResults(allUserResults, userSourcedId, lineItemId)

	if (validAttempts.length === 0) {
		return undefined
	}

	// Sort by scoreDate descending to find the most recent result.
	const sortedAttempts = [...validAttempts].sort(
		(a, b) => new Date(b.scoreDate || 0).getTime() - new Date(a.scoreDate || 0).getTime()
	)

	return sortedAttempts[0]
}
```


## Assistant

<thinking>


**Checking assessment.identifiers**
</thinking>

**Tool Call: Read assessment-identifiers.ts**
Status: Completed

```ts
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"

/**
 * Centralized policy for all assessment-related identifiers.
 */

// Attempt Policy: All attempt numbers must be integers greater than or equal to 1.
const AttemptPolicy = {
	validate: (attempt: number) => {
		if (!Number.isInteger(attempt) || attempt < 1) {
			logger.error("invalid attempt number", { attempt, isInteger: Number.isInteger(attempt) })
			throw errors.new("attempt number must be a positive integer")
		}
	}
}

/**
 * Generates the sourcedId for an assessment result.
 * Interactive assessments (exercises, quizzes, tests) must have an attempt number.
 * Passive content (videos, articles) do not have an attempt number.
 *
 * @returns The final result sourcedId for the gradebook.
 */
export function generateResultSourcedId(
	userSourcedId: string,
	resourceSourcedId: string,
	isInteractive: boolean,
	attemptNumber?: number
): string {
	const lineItemId = getAssessmentLineItemId(resourceSourcedId)
	const baseId = `nice_${userSourcedId}_${lineItemId}`

	if (isInteractive) {
		if (typeof attemptNumber !== "number") {
			logger.error("attempt number required for interactive assessments", {
				userSourcedId,
				lineItemId,
				attemptNumber,
				attemptType: typeof attemptNumber
			})
			throw errors.new("attempt number required for interactive assessments")
		}
		AttemptPolicy.validate(attemptNumber)
		return `${baseId}_attempt_${attemptNumber}`
	}

	return baseId
}
```


## Assistant

<thinking>


**Searching for redis module usage**
</thinking>

**Tool Call: Read redis.ts**
Status: Completed

```ts
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { createClient } from "redis"
import { env } from "@/env"

declare global {
	var redisClient: ReturnType<typeof createClient> | undefined
	var redisConnectionPromise: Promise<ReturnType<typeof createClient>> | undefined
}

// Create client once, reuse globally
if (!globalThis.redisClient) {
	globalThis.redisClient = createClient({
		url: env.REDIS_URL,
		socket: {
			connectTimeout: 5000,
			reconnectStrategy: (retries: number) => {
				if (retries > 10) {
					logger.error("redis reconnection limit exceeded", { retries })
					return false
				}
				const delay = Math.min(retries * 100, 3000)
				logger.info("redis reconnecting", { retries, delayMs: delay })
				return delay
			}
		},
		pingInterval: 30000
	})
}

const redis = globalThis.redisClient

// Create connection promise once, reuse globally
if (!globalThis.redisConnectionPromise) {
	redis.on("error", (err) => logger.error("redis client error", { error: err }))
	redis.on("connect", () => logger.info("redis client connected"))
	redis.on("ready", () => logger.info("redis client ready"))

	// Only connect if not already connected
	if (redis.isOpen || redis.isReady) {
		logger.info("redis client already connected or ready")
		globalThis.redisConnectionPromise = Promise.resolve(redis)
	} else {
		globalThis.redisConnectionPromise = redis.connect()
	}
}

// Await connection at module load time - fail fast if Redis unavailable
const connectResult = await errors.try(globalThis.redisConnectionPromise!)
if (connectResult.error) {
	logger.error("redis connection failed", { error: connectResult.error })
	throw errors.wrap(connectResult.error, "redis connection")
}

export { redis }
```


## Assistant

<thinking>


**Reviewing assessment-stepper writes**
</thinking>

**Tool Call: Read assessment-stepper.tsx**
Status: Completed

```tsx
	expectedXp: number
	layoutData?: LessonLayoutData
	// Callback invoked when user starts a new interactive attempt (quiz/test retake)
	onRetake?: (newAttemptNumber: number) => void
	// Optional authoritative expected identifiers list for each question
	expectedIdentifiersPromises?: Promise<string[]>[]
}

export function AssessmentStepper({
	questions,
	contentType,
	onComplete,
	onerosterComponentResourceSourcedId,
	onerosterResourceSourcedId,
	onerosterCourseSourcedId, // Destructure the new prop
	assessmentTitle,
	assessmentPath,
	unitData,
	expectedXp, // Will be used when caliper action is updated
	onRetake,
	expectedIdentifiersPromises
}: AssessmentStepperProps) {
	const { user } = useUser()
	const router = useRouter()

	const [serverState, setServerState] = React.useState<AssessmentState | null>(null)
	const [visibleQuestionIndex, setVisibleQuestionIndex] = React.useState(0)
	const [isLoading, setIsLoading] = React.useState(true)

	const [selectedResponses, setSelectedResponses] = React.useState<Record<string, unknown>>({})
	const [expectedResponses, setExpectedResponses] = React.useState<string[]>([])
	const [showFeedback, setShowFeedback] = React.useState(false)
	const [isAnswerCorrect, setIsAnswerCorrect] = React.useState(false)
	const [isAnswerChecked, setIsAnswerChecked] = React.useState(false)
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [attemptCount, setAttemptCount] = React.useState(0)
	const [showSummary, setShowSummary] = React.useState(false)

	const [isReportPopoverOpen, setIsReportPopoverOpen] = React.useState(false)
	const [reportText, setReportText] = React.useState("")

	// Store summary data from the server's finalization response
	const [summaryData, setSummaryData] = React.useState<{
		score: number
		correctAnswersCount: number | null
		totalQuestions: number | null
		xpPenaltyInfo?: { penaltyXp: number; reason: string; avgSecondsPerQuestion?: number }
	} | null>(null)

	const [nextItem, setNextItem] = React.useState<{ id?: string; text: string; path: string; type?: string } | null>(
		null
	)
	const [debugClickCount, setDebugClickCount] = React.useState(0)
	// Track when all finalization operations are fully completed
	const [isFinalizationComplete, setIsFinalizationComplete] = React.useState(false)
	const [isFinalizing, setIsFinalizing] = React.useState(false)
	const [loadError, setLoadError] = React.useState(false)

	const assessmentStartTimeRef = React.useRef<Date | null>(null)

	// Guard: ensure summary sfx (sound/confetti) only plays once per attempt
	const hasAnnouncedSummaryRef = React.useRef(false)
	React.useEffect(() => {
		if (showSummary && !hasAnnouncedSummaryRef.current) {
			hasAnnouncedSummaryRef.current = true
			const audio = new Audio("/summary-sound.mp3")
			audio.play().catch(() => { })
		}
	}, [showSummary])

	// Removed cache-busting logic; no longer needed

	/**
	 * Ensures all per-question state is reset whenever the visible question changes.
	 *
	 * CRITICAL BUSINESS LOGIC:
	 * This useEffect hook serves as the SINGLE SOURCE OF TRUTH for resetting per-question state.
	 * It fixes a bug where state from a previous question could "bleed" into the next one after
	 * a page refresh, leaving the submit button permanently disabled.
	 *
	 * This hook is triggered whenever `visibleQuestionIndex` changes, which happens:
	 * - When navigating to the next question after answering
	 * - When skipping a question
	 * - When reporting a question (which auto-skips)
	 * - When the page is refreshed and re-hydrates with the server's current question index
	 *
	 * DO NOT add manual state resets in other navigation functions. This centralized approach
	 * ensures consistency and prevents state management bugs.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: visibleQuestionIndex dependency is required to reset state on question change
	React.useEffect(() => {
		setSelectedResponses({})
		setExpectedResponses([])
		setShowFeedback(false)
		setIsAnswerCorrect(false)
		setIsAnswerChecked(false)
		setAttemptCount(0)
	}, [visibleQuestionIndex])

	// Read authoritative expected identifiers for the current question when provided
	const serverExpectedForCurrent =
		expectedIdentifiersPromises && expectedIdentifiersPromises[visibleQuestionIndex]
			? React.use(expectedIdentifiersPromises[visibleQuestionIndex]!)
			: undefined

	React.useEffect(() => {
		if (serverExpectedForCurrent && Array.isArray(serverExpectedForCurrent) && serverExpectedForCurrent.length > 0) {
			setExpectedResponses(serverExpectedForCurrent)
		}
	}, [serverExpectedForCurrent])

	// Admin-only: practice header lock toggle (far right)
	const { resourceLockStatus, setResourceLockStatus, initialResourceLockStatus, storageKey } = useCourseLockStatus()
	const { setProgressForResource, beginProgressUpdate, endProgressUpdate } = useLessonProgress()
	const allUnlocked = Object.values(resourceLockStatus).every((isLocked) => !isLocked)
	// Parse Clerk metadata using errors.trySync (no client logging)
	let canUnlockAll = false
	const parsedMetaResult = errors.trySync(() => parseUserPublicMetadata(user?.publicMetadata))
	if (parsedMetaResult.error) {
		canUnlockAll = false
	} else {
		canUnlockAll = parsedMetaResult.data.roles.some((r) => r.role !== "student")
	}

	const handleToggleLockAll = () => {
		if (!canUnlockAll || !storageKey) return
		if (allUnlocked) {
			setResourceLockStatus(initialResourceLockStatus)
			if (typeof window !== "undefined") {
				window.localStorage.removeItem(storageKey)
			}
			toast.success("Lock state restored to natural progression.")
			return
		}
		const unlockedStatus = Object.fromEntries(Object.keys(resourceLockStatus).map((key) => [key, false]))
		setResourceLockStatus(unlockedStatus)
		if (typeof window !== "undefined") {
			window.localStorage.setItem(storageKey, "1")
		}
		toast.success("All activities have been unlocked.")
	}
	const audioRef = React.useRef<HTMLAudioElement | null>(null)
	const wrongAudioRef = React.useRef<HTMLAudioElement | null>(null)

	// Store init function in a ref to avoid stale closures
	const initStateRef = React.useRef<(retries?: number) => Promise<void>>(null)

	/**
	 * Initializes and synchronizes the assessment state with the server.
	 *
	 * CRITICAL BUSINESS LOGIC:
	 * - This effect is responsible for fetching the server-side assessment state on mount
	 * - The dependency array MUST NOT include `questions.length` because the `questions` prop
	 *   is a new array object on every render, causing infinite re-renders
	 * - The assessment's identity is tied to `onerosterResourceSourcedId`, which is sufficient
	 *   to trigger a re-fetch when the assessment itself changes
	 * - DO NOT add `questions.length` back to dependencies - it will cause infinite loops
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: questions.length intentionally omitted to prevent infinite re-render loop
	React.useEffect(() => {
		let timeoutId: number | null = null

		async function initState(retries = 3): Promise<void> {
			// Guard: ensure init runs once per mount; also if summary already visible or we're finalizing, skip
			if (didInitRef.current || showSummary || isFinalizationComplete || isFinalizing) {
				return
			}
			didInitRef.current = true
			setLoadError(false)
			setIsLoading(true)
			const result = await errors.try(getOrCreateAssessmentState(onerosterResourceSourcedId))
			if (result.error) {
				if (retries > 0) {
					// Avoid stacking toasts in retries
					if (!loadError) toast.info("Retrying load in 5s...")
					// Use window.setTimeout which returns a number in browser environments
					timeoutId = window.setTimeout(() => void initState(retries - 1), 5000)
					return
				}
				toast.error("Could not load assessment after retries.")
				setIsLoading(false)
				setLoadError(true)
				return
			}
			const state = result.data
			setServerState(state)
			const isComplete = state.currentQuestionIndex >= questions.length
			if (!isComplete) {
				// Only set a visible question when in-progress to avoid flashing the last question on completed attempts
				const clampedIndex = Math.max(0, Math.min(state.currentQuestionIndex, questions.length - 1))
				setVisibleQuestionIndex(clampedIndex)
			}

			// NEW: Check for a persistent finalization error first.
			if (state.finalizationError) {
				toast.error(`Could not complete assessment: ${state.finalizationError}`)
				setIsLoading(false)
				setLoadError(true)
				return
			}
```


## Assistant

<thinking>


**Highlighting finalize call**
</thinking>

**Tool Call: Read assessment-stepper.tsx**
Status: Completed

```tsx

			if (state.currentQuestionIndex >= questions.length && !state.isFinalized) {
				setIsFinalizing(true)
				const finalizeResult = await errors.try(
					finalizeAssessment({
						onerosterResourceSourcedId,
						onerosterComponentResourceSourcedId,
						onerosterCourseSourcedId,
						expectedXp,
						assessmentTitle,
						assessmentPath,
						unitData,
						contentType
					})
				)
				if (finalizeResult.error) {
					toast.error("Failed to complete assessment. Retry or contact support.")
					setIsFinalizing(false)
					setIsLoading(false)
					setLoadError(true)
					return
				}
				const finalSummaryData = finalizeResult.data
				setSummaryData({
					score: finalSummaryData.score,
					correctAnswersCount: finalSummaryData.correctAnswersCount,
					totalQuestions: finalSummaryData.totalQuestions,
					xpPenaltyInfo: finalSummaryData.xpPenaltyInfo
						? {
							penaltyXp:
								typeof finalSummaryData.xpPenaltyInfo.penaltyXp === "number"
									? finalSummaryData.xpPenaltyInfo.penaltyXp
									: 0,
							reason:
								typeof finalSummaryData.xpPenaltyInfo.reason === "string"
									? finalSummaryData.xpPenaltyInfo.reason
									: "Unknown penalty reason",
							avgSecondsPerQuestion: finalSummaryData.xpPenaltyInfo.avgSecondsPerQuestion
						}
						: undefined
				})
				setShowSummary(true)
				setIsFinalizationComplete(true)
				setIsFinalizing(false)
				setIsLoading(false)
				return
			}

			// Handle already-finalized assessment on refresh
			if (state.currentQuestionIndex >= questions.length && state.isFinalized) {
				if (state.finalSummary) {
					setSummaryData(state.finalSummary)
					setShowSummary(true)
					setIsFinalizationComplete(true)
					setIsLoading(false)
					return
				}
				// Avoid re-finalizing a new attempt; briefly poll for summary to appear to handle propagation
				for (let i = 0; i < 3; i++) {
					await new Promise((r) => setTimeout(r, 200 * (i + 1)))
					const refetch = await errors.try(getOrCreateAssessmentState(onerosterResourceSourcedId))
					if (!refetch.error && refetch.data && refetch.data.finalSummary) {
						setSummaryData(refetch.data.finalSummary)
						setShowSummary(true)
						setIsFinalizationComplete(true)
						setIsLoading(false)
						break
					}
				}
				// If still no summary after retries, keep loading skeleton to avoid flashing question
				return
			}
			// In-progress path: safe to render question now
			setIsLoading(false)
		}

		initStateRef.current = initState
		void initState()

		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId)
			}
		}
	}, [
		onerosterResourceSourcedId,
		onerosterComponentResourceSourcedId,
		onerosterCourseSourcedId,
		assessmentPath,
		assessmentTitle,
		contentType,
		expectedXp,
		// questions.length has been removed to prevent an infinite re-render loop
		unitData
	])

	// Navigation race-condition guards (must be declared before any conditional returns)
	const isNavigatingRef = React.useRef(false)
	const skipTimeoutRef = React.useRef<number | null>(null)
	// Ensure we only refresh once after showing the summary to update shared layouts/locks
	const hasRefreshedAfterSummaryRef = React.useRef(false)

	// After summary appears, refresh once to update server-rendered sidebar/proficiency
	React.useEffect(() => {
		if (showSummary && !hasRefreshedAfterSummaryRef.current) {
			hasRefreshedAfterSummaryRef.current = true
			// Non-blocking refresh to update layout/sidebars
			router.refresh()
		}
	}, [showSummary, router])
	// Guard to ensure init executes only once per mount (avoid Strict Mode double-effect)
	const didInitRef = React.useRef(false)

	// Interactive assessments include Exercises as well
	const MAX_ATTEMPTS = 3

	// Ensure attempt is initialized for all assessments (now always interactive)

	function triggerConfetti() {
		const canvas = document.createElement("canvas")
		canvas.style.position = "fixed"
		canvas.style.bottom = "0"
		canvas.style.right = "0"
		canvas.style.width = "200px"
		canvas.style.height = "200px"
		canvas.style.pointerEvents = "none"
		canvas.style.zIndex = "1000"
		document.body.appendChild(canvas)

		const myConfetti = confetti.create(canvas, {
			resize: true,
			useWorker: true
		})

		const confettiPromise = myConfetti({
			particleCount: 50,
			spread: 70,
			origin: { y: 1, x: 1 },
			angle: 135,
			startVelocity: 30,
			scalar: 0.8,
			ticks: 150,
			colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42"]
		})

		// In modern browsers, confettiPromise will always be a Promise
		// The null case is for old browsers without Promise support
		if (confettiPromise) {
			confettiPromise.then(() => {
				document.body.removeChild(canvas)
			})
		} else {
			// Fallback for browsers without Promise support
			// Remove canvas after animation duration
			setTimeout(() => {
				document.body.removeChild(canvas)
			}, 3000)
		}
	}

	function handleCorrectAnswer() {
		if (audioRef.current) {
			audioRef.current.play().catch(() => {
				// Ignore audio play errors (e.g., autoplay policy)
			})
		}
		triggerConfetti()
	}

	function handleWrongAnswer() {
		// 1 in 5000 chance of playing the wrong answer sound
		const shouldPlaySound = Math.random() < 1 / 5000

		if (shouldPlaySound && wrongAudioRef.current) {
			wrongAudioRef.current.play().catch(() => {
				// Ignore audio play errors (e.g., autoplay policy)
			})
		}
	}

	// Record start time when assessment begins
	React.useEffect(() => {
		if (!assessmentStartTimeRef.current && questions.length > 0) {
			assessmentStartTimeRef.current = new Date()
		}
	}, [questions.length])

	// Cleanup any pending timers on unmount
	React.useEffect(() => {
		return () => {
			if (skipTimeoutRef.current !== null) {
				clearTimeout(skipTimeoutRef.current)
				skipTimeoutRef.current = null
			}
		}
	}, [])

	// Cleanup any pending timers on unmount

	React.useEffect(() => {
		// When the summary screen is shown, determine the next piece of content.
```


## Assistant

<thinking>


**Inspecting server interaction functions**
</thinking>

**Tool Call: Search skipQuestion in assessment.ts**
Status: Completed

```sh
474:export async function skipQuestion(
481:		logger.error("skipQuestion failed: user not authenticated")
```


**Tool Call: Read assessment.ts**
Status: Completed

```ts

	return { state, isCorrect }
}

/**
 * Skips the current question, marking it as INCORRECT
 *
 * This action records the question with `isCorrect: false` in the Redis state.
 * The question will count towards the denominator (total questions) and will
 * negatively impact the final score, which is consistent with the user-facing
 * messaging. This behavior is distinct from reporting a question.
 *
 * @returns An object containing the new, advanced `AssessmentState`.
 */
export async function skipQuestion(
	onerosterResourceSourcedId: string,
	questionId: string,
	questionIndex: number
): Promise<{ state: AssessmentState }> {
	const { userId } = await auth()
	if (!userId) {
		logger.error("skipQuestion failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
	const state = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
	if (!state) {
		logger.error("assessment state not found for skip", {
			onerosterUserSourcedId,
			onerosterResourceSourcedId,
			attemptNumber
		})
		throw ErrAssessmentStateNotFound
	}
	if (state.currentQuestionIndex !== questionIndex) {
		logger.error("out-of-order skip", { currentIndex: state.currentQuestionIndex, submittedIndex: questionIndex })
		throw errors.new("out-of-order skip")
	}

	const questionList = await getDeterministicQuestionList(
		onerosterUserSourcedId,
		onerosterResourceSourcedId,
		state.attemptNumber
	)
	if (questionList[questionIndex]?.id !== questionId) {
		logger.error("question id mismatch on skip", {
			expectedId: questionList[questionIndex]?.id,
			receivedId: questionId,
			questionIndex
		})
		throw errors.new("question id mismatch")
	}

	// This is the key business logic change. A skipped question is an incorrect question.
	const skipState: AssessmentQuestionState = { isCorrect: false, response: null, isReported: false }
	await updateStateAndQuestion(
		onerosterUserSourcedId,
		onerosterResourceSourcedId,
		state.attemptNumber,
		questionIndex,
		skipState
	)

	// Update local state
	state.questions[questionIndex] = skipState
	state.currentQuestionIndex = questionIndex + 1

	logger.info("question skipped", { questionId, questionIndex })
	return { state }
}

/**
 * Reports an issue with a question and advances the user past it, EXCLUDING it from the final score.
 *
 * This action implements the "report and skip" business logic:
 * 1. It atomically updates the question's state in Redis, setting `isReported: true` and `isCorrect: null`.
 * 2. It advances the `currentQuestionIndex`, removing the question from the user's active assessment path.
 * 3. It then flags the question in an external service with the user's report.
 *
 * During finalization, any question with `isReported: true` or `isCorrect: null` is
 * excluded from both the numerator (correct answers) and the denominator (total questions) of the score.
 *
 * @returns An object containing the new, advanced `AssessmentState`.
 */
export async function reportQuestion(
	onerosterResourceSourcedId: string,
	questionId: string,
	questionIndex: number,
	report: string
): Promise<{ state: AssessmentState }> {
	const { userId } = await auth()
	if (!userId) {
		logger.error("reportQuestion failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
	const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)

	const currentState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
	if (!currentState) {
```


## Assistant

<thinking>


**Investigating user ID retrieval**
</thinking>

**Tool Call: Run rg "getCurrentUserSourcedId" -n src/lib -g"*.ts"**
Status: Completed

Terminal:
```
src/lib/authorization.ts:18:export async function getCurrentUserSourcedId(clerkId: string): Promise<string> {
src/lib/actions/assessment.ts:19:import { getCurrentUserSourcedId, isUserAuthorizedForQuestion } from "@/lib/authorization"
src/lib/actions/assessment.ts:90:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/assessment.ts:238:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/assessment.ts:291:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/assessment.ts:484:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/assessment.ts:556:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/assessment.ts:644:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/assessment.ts:737:	const onerosterUserSourcedId = await getCurrentUserSourcedId(clerkUserId)
src/lib/actions/assessment.ts:962:	const userSourcedId = await getCurrentUserSourcedId(clerkUserId)
src/lib/actions/assessment.ts:1024:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/caliper.ts:35:import { getCurrentUserSourcedId } from "@/lib/authorization"
src/lib/actions/caliper.ts:73:	const derivedUserId = await getCurrentUserSourcedId(userId)
src/lib/actions/caliper.ts:159:	const derivedUserId = await getCurrentUserSourcedId(userId)
src/lib/actions/caliper.ts:223:	const derivedUserId = await getCurrentUserSourcedId(userId)
src/lib/actions/proficiency.ts:7:import { getCurrentUserSourcedId } from "@/lib/authorization"
src/lib/actions/proficiency.ts:49:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/tracking.ts:15:import { getCurrentUserSourcedId } from "@/lib/authorization"
src/lib/actions/tracking.ts:53:	const serverSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/tracking.ts:176:    const serverSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/tracking.ts:293:    const serverSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/tracking.ts:398:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/tracking.ts:470:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/tracking.ts:638:	const onerosterUserSourcedId = await getCurrentUserSourcedId(clerkUserId)
src/lib/actions/tracking.ts:936:	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
src/lib/actions/tracking.ts:998:	const serverSourcedId = await getCurrentUserSourcedId(userId)

















```


**Tool Call: Read authorization.ts**
Status: Completed

```ts
import { clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { getActiveEnrollmentsForUser, getClass } from "@/lib/data/fetchers/oneroster"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"

/**
 * Gets the OneRoster sourcedId for the currently authenticated user.
 * This is the unified way to get user sourcedId from Clerk session.
 *
 * @param clerkId The Clerk user ID to resolve to a OneRoster sourcedId
 * @returns The user's OneRoster sourcedId
 * @throws Error if clerkId is missing or the user is not synced with OneRoster
 */
export async function getCurrentUserSourcedId(clerkId: string): Promise<string> {
	if (!clerkId) {
		logger.error("clerkId is required to get user sourcedId")
		throw errors.new("clerkId is required")
	}

	const clerk = await clerkClient()
	const user = await clerk.users.getUser(clerkId)
	const metadata = parseUserPublicMetadata(user.publicMetadata)
	const onerosterUserSourcedId = metadata.sourceId

	if (!onerosterUserSourcedId) {
		logger.error("user not synced with OneRoster", { clerkId })
		throw errors.new("user not synced with OneRoster")
	}

	return onerosterUserSourcedId
}

async function getCourseIdForQuestion(questionId: string): Promise<string | null> {
	const result = await errors.try(
		db
			.select({ courseId: schema.niceCourses.id })
			.from(schema.niceQuestions)
			.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
			.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
			.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
			.innerJoin(schema.niceUnits, eq(schema.niceLessons.unitId, schema.niceUnits.id))
			.innerJoin(schema.niceCourses, eq(schema.niceUnits.courseId, schema.niceCourses.id))
			.where(and(eq(schema.niceQuestions.id, questionId), eq(schema.niceLessonContents.contentType, "Exercise")))
			.limit(1)
	)

	if (result.error) {
		logger.error("failed to get course for question", { questionId, error: result.error })
		throw errors.wrap(result.error, "get course for question")
	}

	return result.data[0]?.courseId ?? null
}

export async function isUserAuthorizedForQuestion(userSourcedId: string, questionId: string): Promise<boolean> {
	logger.debug("checking user authorization for question", { userSourcedId, questionId })

	// Step 1: Find the course the question belongs to.
	const courseId = await getCourseIdForQuestion(questionId)
	if (!courseId) {
		logger.warn("could not find course for question, denying authorization", { questionId })
		return false
	}

	const onerosterCourseSourcedId = `nice_${courseId}`

	// Step 2: Get the user's enrolled courses.
	const enrollmentsResult = await errors.try(getActiveEnrollmentsForUser(userSourcedId))
	if (enrollmentsResult.error) {
		logger.error("failed to get user enrollments for auth check", { userSourcedId, error: enrollmentsResult.error })
		throw errors.wrap(enrollmentsResult.error, "get user enrollments for auth check")
	}

	const enrollments = enrollmentsResult.data
	if (enrollments.length === 0) {
		logger.debug("user has no active enrollments, denying authorization", { userSourcedId })
		return false
	}

	const uniqueClassIds = [...new Set(enrollments.map((e) => e.class.sourcedId))]

	// Step 3: Check if any of the user's enrolled classes belong to the target course.
	const classPromises = uniqueClassIds.map(async (classId) => {
		const classResult = await errors.try(getClass(classId))
		if (classResult.error) {
			logger.error("failed to get class details for auth check", { classId, error: classResult.error })
			return null // Skip this class on error
		}
		return classResult.data
	})

	const classes = (await Promise.all(classPromises)).filter((c): c is NonNullable<typeof c> => c !== null)

	const isEnrolled = classes.some((c) => c.course.sourcedId === onerosterCourseSourcedId)

	logger.info("user authorization check complete", {
		userSourcedId,
		questionId,
		targetCourseId: onerosterCourseSourcedId,
		isEnrolled
	})

	return isEnrolled
}
```


## Assistant

<thinking>


**Summarizing assessment pipeline and Redis integration**

I'll explain how the front-end stepper interacts with Redis for progress tracking, how answer submissions and question skips update the Redis state, and how completion triggers finalization that calculates scores and saves results to OneRoster. I need to clarify the role of `generateResultSourcedId`, `getAssessmentLineItemId`, and the `oneroster.putResult` method to show how results map to gradebook entries. I'll also inspect Redis key patterns, TTL, and ordering logic from `getDeterministicQuestionList`, plus the attempt computation from existing OneRoster results. This will give a clear picture of the entire assessment flow with Redis and metadata retrieval.
</thinking>

**Tool Call: Search putResult in oneroster.ts**
Status: Completed

```sh
1706:	async putResult(
1712:			logger.error("putResult input validation failed", { sourcedId, payload, error: validation.error })
1713:			throw errors.wrap(validation.error, "putResult input validation")
1727:			logger.error("invalid response from putResult", { sourcedId, response })
1728:			throw errors.new("invalid response from putResult")
```


**Tool Call: Read oneroster.ts**
Status: Completed

```ts
			throw errors.new("sourcedId cannot be empty")
		}

		await this.#request(
			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
			{ method: "DELETE" },
			z.unknown()
		)

		logger.info("oneroster: successfully deleted assessment line item", { sourcedId })
	}

	/**
	 * Creates a new Assessment Result in the gradebook.
	 * @param {CreateResultInput} payload - The result data to create.
	 * @returns {Promise<unknown>} The API response.
	 */
	async createResult(payload: CreateResultInput): Promise<unknown> {
		const validationResult = CreateResultInputSchema.safeParse(payload)
		if (!validationResult.success) {
			logger.error("invalid input for createResult", { error: validationResult.error, input: payload })
			throw errors.wrap(validationResult.error, "invalid input for createResult")
		}

		logger.info("creating assessment result", {
			studentId: payload.result.student.sourcedId,
			lineItemId: payload.result.assessmentLineItem.sourcedId
		})

		return this.#request(
			"/ims/oneroster/gradebook/v1p2/results/",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validationResult.data)
			},
			z.unknown() // The response for a single creation is not critical here.
		)
	}

	/**
	 * Creates or updates an Assessment Result.
	 * @param sourcedId The unique identifier for the result.
	 * @param payload The result data.
	 * @returns The created or updated result.
	 */
	async putResult(
		sourcedId: string,
		payload: { result: z.infer<typeof CreateResultInputSchema>["result"] }
	): Promise<AssessmentResult> {
		const validation = CreateResultInputSchema.safeParse(payload)
		if (!validation.success) {
			logger.error("putResult input validation failed", { sourcedId, payload, error: validation.error })
			throw errors.wrap(validation.error, "putResult input validation")
		}

		const response = await this.#request(
			`/ims/oneroster/gradebook/v1p2/assessmentResults/${sourcedId}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ assessmentResult: validation.data.result })
			},
			z.object({ assessmentResult: AssessmentResultSchema })
		)

		if (!response?.assessmentResult) {
			logger.error("invalid response from putResult", { sourcedId, response })
			throw errors.new("invalid response from putResult")
		}

		return response.assessmentResult
	}

	/**
	 * Retrieves a specific Assessment Result by its identifier.
	 * @param {string} sourcedId - The unique identifier of the assessment result.
	 * @returns {Promise<AssessmentResult | null>} The assessment result object, or null if not found.
	 */
	async getResult(sourcedId: string): Promise<AssessmentResult | null> {
		logger.info("oneroster: getting assessment result", { sourcedId })

		const GetResultResponseSchema = z.object({
			assessmentResult: AssessmentResultSchema.optional()
		})

		const response = await this.#request(
			`/ims/oneroster/gradebook/v1p2/assessmentResults/${sourcedId}`,
			{ method: "GET" },
			GetResultResponseSchema,
			{ swallow404: true } // Return null if not found
```


## Assistant

<thinking>


**Examining AssessmentResult schema**
</thinking>

**Tool Call: Search AssessmentResultSchema in oneroster.ts**
Status: Completed

```sh
361:const AssessmentResultSchema = z.object({
375:export type AssessmentResult = z.infer<typeof AssessmentResultSchema>
1723:			z.object({ assessmentResult: AssessmentResultSchema })
1743:			assessmentResult: AssessmentResultSchema.optional()
1770:			schema: z.object({ assessmentResults: z.array(AssessmentResultSchema) }),
```


**Tool Call: Read oneroster.ts**
Status: Completed

```ts
	status: z.enum(["active", "tobedeleted", "inactive"]).default("active"),
	role: z.enum(["student", "teacher", "proctor", "administrator"]),
	user: GUIDRefWriteSchema,
	class: GUIDRefWriteSchema,
	primary: z.boolean().optional()
})
export type CreateEnrollmentInput = z.infer<typeof CreateEnrollmentInputSchema>

// --- NEW: Schemas for AssessmentLineItem (Gradebook) ---
const AssessmentLineItemSchema = z.object({
	sourcedId: z.string(),
	status: z.string().optional(),
	title: z.string(),
	category: GUIDRefReadSchema.optional(), // Made optional - API may not return it
	componentResource: GUIDRefReadSchema.optional(),
	description: z.string().optional(),
	resultValueMin: z.number().optional(),
	resultValueMax: z.number().optional()
})
export type AssessmentLineItem = z.infer<typeof AssessmentLineItemSchema>

const CreateAssessmentLineItemInputSchema = z.object({
	sourcedId: z.string(),
	status: z.literal("active"),
	title: z.string(),
	componentResource: z
		.object({
			sourcedId: z.string()
		})
		.optional(),
	course: z.object({
		sourcedId: z.string()
	}),
	metadata: z.record(z.string(), z.any()).optional(),
	parentAssessmentLineItem: z.null().optional() // Allow explicit null to remove field
})
export type CreateAssessmentLineItemInput = z.infer<typeof CreateAssessmentLineItemInputSchema>

// --- NEW: Schemas for AssessmentResult ---
const ScoreStatusEnum = z.enum(["exempt", "fully graded", "not submitted", "partially graded", "submitted"])

const AssessmentResultSchema = z.object({
	sourcedId: z.string(),
	status: z.enum(["active", "tobedeleted"]),
	dateLastModified: z.string().datetime(),
	assessmentLineItem: GUIDRefReadSchema,
	student: GUIDRefReadSchema,
	scoreStatus: ScoreStatusEnum,
	// MODIFIED: score is no longer a required number.
	// It can be a number, null, or undefined.
	score: z.number().nullable().optional(),
	scoreDate: z.string().datetime(),
	comment: z.string().nullable().optional(),
	metadata: z.record(z.string(), z.any()).optional()
})
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>

const CreateResultInputSchema = z.object({
	result: z.object({
		assessmentLineItem: GUIDRefWriteSchema,
		student: GUIDRefWriteSchema,
```


## Assistant

<thinking>


**Investigating Redis progress tracking**
</thinking>

**Tool Call: Read powerpath-progress.ts**
Status: Completed

```ts
import type { CourseProgressResult, LessonPlanTreeResult } from "@/lib/powerpath"

// --- CONSTANTS ---
export const HARDCODED_SCIENCE_COURSE_IDS = [
	"nice_x0c5bb03129646fd6", // ms-biology
    "nice_xc370bc422b7f75fc", // ms-chemistry
    "nice_x1baed5db7c1bb50b", // ms-physics
    "nice_x87d03b443efbea0a", // middle-school-earth-and-space-science
] as const

export const MASTERY_THRESHOLD = 95 as const

// --- TYPES ---
export type ProgressStatus = "not_started" | "in_progress" | "completed"

export type ComponentProgress = {
	sourcedId: string
	progress: number
	status: ProgressStatus
	results: Array<Record<string, unknown>>
	title?: string
	assessmentLineItemSourcedId?: string
}

export type ResourceProgress = {
	sourcedId: string
	progress: number
	status: ProgressStatus
	results: Array<Record<string, unknown>>
}

export type ProcessedResource = {
	sourcedId: string
	title?: string
	sortOrder?: string
	componentProgress: ResourceProgress
	[key: string]: unknown
}

export type ProcessedComponent = {
	sourcedId: string
	title: string
	sortOrder?: string
	componentProgress: ComponentProgress
	componentResources?: ProcessedResource[]
	items?: ProcessedComponent[]
	[key: string]: unknown
}

export type MergedLessonPlan = {
	id?: string
	course: Record<string, unknown>
	components: ProcessedComponent[]
}

// --- ID TRANSFORMATION ---
function buildCompoundResourceId(componentId: string, resourceSourcedId: string): string {
	const resourceSuffix = resourceSourcedId.split("_").pop()
	if (!resourceSuffix) {
		throw new Error(`invalid resource sourcedId format: ${resourceSourcedId}`)
	}
	return `${componentId}_${resourceSuffix}`
}

// --- PROGRESS CALCULATION ---
function calculateProgressFromResults(results: Array<Record<string, unknown>>): number {
	if (results.length === 0) return 0
	if (results.some((r) => r.inProgress === "true")) return 50

	const latestResult = results[results.length - 1]
	if (latestResult && typeof latestResult.score === "number") {
		return latestResult.score
	}

	return results.length > 0 ? 100 : 0
}

function determineStatusFromResults(results: Array<Record<string, unknown>>): ProgressStatus {
	if (results.length === 0) return "not_started"
	if (results.some((r) => r.inProgress === "true")) return "in_progress"

	const latestResult = results[results.length - 1]
	if (latestResult && typeof latestResult.score === "number") {
		return "completed"
	}

	return "in_progress"
}

// --- PROGRESS MAPS ---
function buildProgressMaps(progressData: CourseProgressResult): {
	componentMap: Map<string, ComponentProgress>
	resourceMap: Map<string, ResourceProgress>
} {
	const componentMap = new Map<string, ComponentProgress>()
	const resourceMap = new Map<string, ResourceProgress>()

	for (const item of progressData.lineItems) {
		if (item.type === "component") {
			componentMap.set(item.courseComponentSourcedId, {
				sourcedId: item.courseComponentSourcedId,
				progress: calculateProgressFromResults(item.results),
				status: determineStatusFromResults(item.results),
				results: item.results,
				title: item.title,
				assessmentLineItemSourcedId: item.assessmentLineItemSourcedId
			})
		} else if (item.type === "resource") {
			resourceMap.set(item.courseComponentResourceSourcedId, {
				sourcedId: item.courseComponentResourceSourcedId,
				progress: calculateProgressFromResults(item.results),
				status: determineStatusFromResults(item.results),
				results: item.results
			})
		}
	}

	return { componentMap, resourceMap }
}

// --- AGGREGATION ---
function aggregateResourceProgress(
	resourceIds: string[],
	resourceMap: Map<string, ResourceProgress>
): { progress: number; status: ProgressStatus; results: Array<Record<string, unknown>> } {
	const progresses = resourceIds
		.map((id) => resourceMap.get(id))
		.filter((p): p is ResourceProgress => p !== undefined)

	if (progresses.length === 0) {
		return { progress: 0, status: "not_started", results: [] }
	}

	const avgProgress = progresses.reduce((sum, p) => sum + p.progress, 0) / progresses.length
	const allCompleted = progresses.every((p) => p.status === "completed")
	const anyInProgress = progresses.some((p) => p.status === "in_progress")

	return {
		progress: avgProgress,
		status: allCompleted ? "completed" : anyInProgress ? "in_progress" : "not_started",
		results: progresses.flatMap((p) => p.results)
	}
}

function aggregateChildProgress(
	children: ProcessedComponent[]
): { progress: number; status: ProgressStatus; results: Array<Record<string, unknown>> } {
	if (children.length === 0) {
		return { progress: 0, status: "not_started", results: [] }
	}

	const avgProgress = children.reduce((sum, c) => sum + c.componentProgress.progress, 0) / children.length
	const allCompleted = children.every((c) => c.componentProgress.status === "completed")
	const anyInProgress = children.some((c) => c.componentProgress.status === "in_progress")

	return {
		progress: avgProgress,
		status: allCompleted ? "completed" : anyInProgress ? "in_progress" : "not_started",
		results: children.flatMap((c) => c.componentProgress.results)
	}
}

// --- RESOURCE PROCESSING ---
function processResource(
	resource: Record<string, unknown>,
	componentId: string,
	resourceMap: Map<string, ResourceProgress>
): ProcessedResource {
	const resourceObj = resource.resource as Record<string, unknown> | undefined
	const resourceSourcedId = resourceObj?.sourcedId as string | undefined

	const compoundId = resourceSourcedId ? buildCompoundResourceId(componentId, resourceSourcedId) : undefined
	const progress = compoundId ? resourceMap.get(compoundId) : undefined

	return {
		sourcedId: resource.id as string,
		title: (resourceObj?.title as string) ?? undefined,
		sortOrder: (resource.sortOrder as string | null) ?? undefined,
		componentProgress:
			progress ?? {
				sourcedId: resource.id as string,
				progress: 0,
				status: "not_started",
				results: []
			},
		...resource
	}
}

// --- COMPONENT PROCESSING ---
function computeLeafProgress(
	componentId: string,
	resources: Array<Record<string, unknown>>,
	componentMap: Map<string, ComponentProgress>,
	resourceMap: Map<string, ResourceProgress>
): ComponentProgress {
	const directProgress = componentMap.get(componentId)
	if (directProgress) return directProgress

	const compoundIds = resources
```


## Assistant

<thinking>


**Investigating data sourcing for Stepper**
</thinking>

**Tool Call: Run sed -n '1,200p' src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/quiz/[quiz]/components/content.tsx**
Status: Failed

Terminal:
```
bash: -c: line 0: syntax error near unexpected token `('
bash: -c: line 0: `sed -n '1,200p' src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/quiz/[quiz]/components/content.tsx'



```


## Assistant

<thinking>


**Handling paths with parentheses in commands**
</thinking>

**Tool Call: Read content.tsx**
Status: Completed

```tsx
"use client"

import Image from "next/image"
import * as React from "react"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import quizIllustration from "@/components/practice/course/unit/quiz/images/quiz-illustration.png"
import type { QuizPageData } from "@/lib/types/page"

export function Content({ quizPromise, expectedIdentifiersPromisesPromise }: { quizPromise: Promise<QuizPageData>; expectedIdentifiersPromisesPromise: Promise<Promise<string[]>[]> }) {
	const { quiz, questions, layoutData } = React.use(quizPromise)
	const expectedIdentifiersPromises = React.use(expectedIdentifiersPromisesPromise)
	const { resourceLockStatus } = useCourseLockStatus()
	const isLocked = resourceLockStatus[quiz.componentResourceSourcedId] === true
	const [hasStarted, setHasStarted] = React.useState(false)
	const [retakeKey, setRetakeKey] = React.useState(0)

	if (hasStarted) {
		return (
			<AssessmentStepper
				key={`${quiz.id}:${retakeKey}`}
				questions={questions}
				contentType="Quiz"
				onerosterComponentResourceSourcedId={quiz.componentResourceSourcedId} // The componentResource sourcedId that PowerPath uses
				onerosterResourceSourcedId={quiz.id} // The quiz resource sourcedId for OneRoster results
				onerosterCourseSourcedId={quiz.onerosterCourseSourcedId} // Pass the onerosterCourseSourcedId
				assessmentTitle={quiz.title}
				assessmentPath={quiz.path}
				unitData={layoutData.unitData}
				expectedXp={quiz.expectedXp}
				layoutData={layoutData}
				expectedIdentifiersPromises={expectedIdentifiersPromises}
				onRetake={(_newAttemptNumber) => {
					// Return to start screen to make retake explicit and ensure full reset
					setHasStarted(false)
					// Bump key so the assessment stepper remounts on next start
					setRetakeKey((k) => k + 1)
					// Force a route data refresh to get a newly rotated question set
					// Use location.reload to guarantee a full reload since replace/refresh are client navigations
					if (typeof window !== "undefined") {
						window.location.reload()
					}
				}}
			/>
		)
	}

	return (
		<div className="relative h-full">
			<AssessmentStartScreen
				headerTitle={quiz.title}
				title="Time for a quiz?"
				subtitle="Get ready for questions on the unit so far."
				subtitleColorClass="text-blue-100"
				questionsCount={questions.length}
				expectedXp={quiz.expectedXp}
				onStart={() => setHasStarted(true)}
				bgClass="bg-blue-950"
				contentType="Quiz"
				textPositioning="justify-start pt-24"
				isLocked={isLocked}
			>
				{/* Quiz Illustration - Slightly Smaller */}
				<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 justify-center items-center overflow-hidden h-1/2 max-h-80 w-full hidden [@media(min-height:600px)]:block">
					<Image src={quizIllustration} alt="Quiz illustration" className="w-full h-full object-contain" />
				</div>
			</AssessmentStartScreen>
		</div>
	)
}
```


## Assistant

<thinking>


**Searching for QuizPageData type**
</thinking>

**Tool Call: Search QuizPageData in src**
Status: Completed

```sh
src/lib/data/assessment.ts:17:	QuizPageData,
src/lib/data/assessment.ts:27:export async function fetchQuizPageData(params: {
src/lib/data/assessment.ts:33:}): Promise<QuizPageData> {
src/lib/data/assessment.ts:37:	assertNoEncodedColons(params.quiz, "fetchQuizPageData quiz parameter")
src/lib/data/assessment.ts:38:	logger.info("fetchQuizPageData called", { params })
src/lib/types/page.ts:64:export interface QuizPageData {
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/quiz/[quiz]/page.tsx:3:import { fetchQuizPageData } from "@/lib/data/assessment"
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/quiz/[quiz]/page.tsx:4:import type { QuizPageData } from "@/lib/types/page"
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/quiz/[quiz]/page.tsx:9:// --- REMOVED: The local QuizPageData type definition ---
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/quiz/[quiz]/page.tsx:18:	const quizPromise: Promise<QuizPageData> = normalizedParamsPromise.then(fetchQuizPageData)
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/quiz/[quiz]/components/content.tsx:9:import type { QuizPageData } from "@/lib/types/page"
src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/quiz/[quiz]/components/content.tsx:11:export function Content({ quizPromise, expectedIdentifiersPromisesPromise }: { quizPromise: Promise<QuizPageData>; expectedIdentifiersPromisesPromise: Promise<Promise<string[]>[]> }) {
```


**Tool Call: Read assessment.ts**
Status: Completed

```ts
import * as logger from "@superbuilders/slog"
// PowerPath removed; attempt number derived via server action in prepareInteractiveAssessment
import {
	fetchAndResolveQuestions,
	findAndValidateResource,
	findComponentResourceWithContext,
	findCourseChallenge,
	prepareUserQuestionSet
} from "@/lib/data/fetchers/interactive-helpers"
// import type { AssessmentTest, TestQuestionsResponse } from "@/lib/qti"
import { applyQtiSelectionAndOrdering as applyQtiSelectionAndOrderingCommon } from "@/lib/qti-selection"
// NOTE: selection util now returns domain Question; direct type import not required here
// import type { Question } from "@/lib/types/domain"
import type {
	CourseChallengeLayoutData,
	CourseChallengePageData,
	QuizPageData,
	UnitTestPageData
} from "@/lib/types/page"
import { assertNoEncodedColons } from "@/lib/utils"
import { findAssessmentRedirectPath } from "@/lib/utils/assessment-redirect"
import { fetchCoursePageData } from "./course"
import { fetchLessonLayoutData } from "./lesson"

export const applyQtiSelectionAndOrdering = applyQtiSelectionAndOrderingCommon

export async function fetchQuizPageData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	quiz: string
}): Promise<QuizPageData> {
	const layoutData = await fetchLessonLayoutData(params)

	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.quiz, "fetchQuizPageData quiz parameter")
	logger.info("fetchQuizPageData called", { params })

	const resource = await findAndValidateResource(params.quiz, "Quiz")
	const componentResource = await findComponentResourceWithContext(resource.sourcedId, layoutData.unitData.id)
	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
	const questions = await prepareUserQuestionSet({
		resourceSourcedId: resource.sourcedId,
		componentResourceSourcedId: componentResource.sourcedId,
		assessmentTest,
		resolvedQuestions
	})

	const resourceMetadata = resource.metadata

	return {
		quiz: {
			id: resource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			onerosterCourseSourcedId: layoutData.courseData.id,
			title: resource.title,
			path: `/${params.subject}/${params.course}/${params.unit}/${params.lesson}/quiz/${resourceMetadata.khanSlug}`,
			description: resourceMetadata.khanDescription,
			type: "Quiz" as const,
			expectedXp: resourceMetadata.xp
		},
		questions,
		layoutData
	}
}

export async function fetchUnitTestPageData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	test: string
}): Promise<UnitTestPageData> {
	const layoutData = await fetchLessonLayoutData(params)

	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.test, "fetchUnitTestPageData test parameter")
	logger.info("fetchUnitTestPageData called", { params })

	const resource = await findAndValidateResource(params.test, "UnitTest")
	const componentResource = await findComponentResourceWithContext(resource.sourcedId, layoutData.unitData.id)
	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
	const questions = await prepareUserQuestionSet({
		resourceSourcedId: resource.sourcedId,
		componentResourceSourcedId: componentResource.sourcedId,
		assessmentTest,
		resolvedQuestions
	})

	const resourceMetadata = resource.metadata

	return {
		test: {
			id: resource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			onerosterCourseSourcedId: layoutData.courseData.id,
			title: resource.title,
			path: `/${params.subject}/${params.course}/${params.unit}/${params.lesson}/test/${resourceMetadata.khanSlug}`,
			description: resourceMetadata.khanDescription,
			type: "UnitTest" as const,
			expectedXp: resourceMetadata.xp
		},
		questions,
		layoutData
	}
}

export async function fetchCourseChallengePage_TestData(params: {
	test: string
	course: string
	subject: string
}): Promise<CourseChallengePageData> {
	logger.info("fetchCourseChallengePage_TestData called", { params })

	const { resource, componentResource } = await findCourseChallenge(params)
	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
	const questions = await prepareUserQuestionSet({
		resourceSourcedId: resource.sourcedId,
		componentResourceSourcedId: componentResource.sourcedId,
		assessmentTest,
		resolvedQuestions
	})

	// Course Challenges require fetching some top-level course data.
	const { course } = await fetchCoursePageData(
		{ subject: params.subject, course: params.course },
		{ skip: { questions: true } }
	)

	const resourceMetadata = resource.metadata

	return {
		test: {
			id: resource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			onerosterCourseSourcedId: course.id,
			type: "CourseChallenge",
			title: resource.title,
			slug: params.test,
			path: `/${params.subject}/${params.course}/test/${resourceMetadata.khanSlug}`,
			description: resourceMetadata.khanDescription,
			expectedXp: resourceMetadata.xp
		},
		questions
	}
}

export async function fetchCourseChallengePage_LayoutData(params: {
	course: string
	subject: string
}): Promise<CourseChallengeLayoutData> {
	// dynamic opt-in is handled at the page level

	const coursePageData = await fetchCoursePageData({ subject: params.subject, course: params.course })

	// The CourseSidebar component needs the full course object with units,
	// the lesson count, and any challenges.
	return {
		course: coursePageData.course,
		lessonCount: coursePageData.lessonCount,
		challenges: coursePageData.course.challenges
	}
}

export async function fetchQuizRedirectPath(params: {
	subject: string
	course: string
	unit: string
	quiz: string
}): Promise<string> {
	return findAssessmentRedirectPath({
		...params,
		assessment: params.quiz,
		assessmentType: "quiz"
	})
}

export async function fetchTestRedirectPath(params: {
	subject: string
	course: string
	unit: string
	test: string
}): Promise<string> {
	return findAssessmentRedirectPath({
		...params,
		assessment: params.test,
		assessmentType: "unittest"
	})
}
```


## Assistant

<thinking>


**Inspecting data preparation function**
</thinking>

**Tool Call: Search prepareUserQuestionSet in src**
Status: Completed

```sh
src/lib/data/assessment.ts:8:	prepareUserQuestionSet
src/lib/data/assessment.ts:43:	const questions = await prepareUserQuestionSet({
src/lib/data/assessment.ts:84:	const questions = await prepareUserQuestionSet({
src/lib/data/assessment.ts:118:	const questions = await prepareUserQuestionSet({
src/lib/data/content.ts:8:	prepareUserQuestionSet
src/lib/data/content.ts:108:	const questions = await prepareUserQuestionSet({
src/lib/data/fetchers/interactive-helpers.ts:216:export async function prepareUserQuestionSet(options: {
```


**Tool Call: Read interactive-helpers.ts**
Status: Completed

```ts
export async function prepareUserQuestionSet(options: {
	resourceSourcedId: string
	componentResourceSourcedId: string
	assessmentTest: AssessmentTest
	resolvedQuestions: TestQuestionsResponse["questions"]
}): Promise<Question[]> {
	const user = await currentUser()
	if (!user) {
		logger.error("user authentication required for interactive assessment")
		throw errors.new("user authentication required")
	}
	const userMeta = parseUserPublicMetadata(user.publicMetadata)
	if (!userMeta.sourceId) {
		logger.error("user source id missing for interactive assessment", { userId: user.id })
		throw errors.new("user source id missing")
	}

	const preparedAssessment = await prepareInteractiveAssessment({
		userSourceId: userMeta.sourceId,
		resourceSourcedId: options.resourceSourcedId,
		componentResourceSourcedId: options.componentResourceSourcedId,
		assessmentTest: options.assessmentTest,
		resolvedQuestions: options.resolvedQuestions
	})

	return preparedAssessment.questions
}

/**
 * Special helper for finding course challenge resources which require complex lookup logic.
 * @internal
 */
export async function findCourseChallenge(params: { test: string; course: string; subject: string }): Promise<{
	resource: Resource & { metadata: ResourceMetadata }
	componentResource: ComponentResourceFromAPI
	onerosterCourseSourcedId: string
}> {
	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.test, "findCourseChallenge test parameter")

	// Step 1: Find the course by its slug to get its sourcedId
	const courseResult = await errors.try(getAllCoursesBySlug(params.course))
	if (courseResult.error) {
		logger.error("failed to fetch course by slug", { error: courseResult.error, slug: params.course })
		throw errors.wrap(courseResult.error, "fetch course")
	}
	const course = courseResult.data[0]
	if (!course) {
		notFound()
	}
	const onerosterCourseSourcedId = course.sourcedId

	// Step 2: Find the "dummy" course component that holds course challenges
	const challengeComponentResult = await errors.try(
		getCourseComponentByCourseAndSlug(onerosterCourseSourcedId, "course-challenge")
	)
	if (challengeComponentResult.error) {
		logger.error("failed to fetch course challenge component", {
			error: challengeComponentResult.error,
			onerosterCourseSourcedId
		})
		throw errors.wrap(challengeComponentResult.error, "fetch course challenge component")
	}

	const candidateComponents = challengeComponentResult.data
	if (candidateComponents.length === 0) {
		logger.warn("course challenge component not found for course", { onerosterCourseSourcedId })
		notFound()
	}

	logger.info("found course challenge component candidates", {
		count: candidateComponents.length,
		candidates: candidateComponents.map((c) => ({ sourcedId: c.sourcedId, title: c.title })),
		onerosterCourseSourcedId
	})

	// Step 3: Find all component-resource links to determine which component to use
	const allComponentResourcesResult = await errors.try(getAllComponentResources())
	if (allComponentResourcesResult.error) {
		logger.error("failed to fetch all component resources", { error: allComponentResourcesResult.error })
		throw errors.wrap(allComponentResourcesResult.error, "fetch all component resources")
	}

	// Find which candidate component actually has resources
	let challengeComponent = null
	let relevantComponentResources: typeof allComponentResourcesResult.data = []

	for (const candidate of candidateComponents) {
		const candidateResources = allComponentResourcesResult.data.filter(
			(cr) => cr.courseComponent.sourcedId === candidate.sourcedId
		)

		if (candidateResources.length > 0) {
			challengeComponent = candidate
			relevantComponentResources = candidateResources
			logger.info("selected course challenge component with resources", {
				componentSourcedId: candidate.sourcedId,
				resourceCount: candidateResources.length
			})
			break
		}
	}

	if (!challengeComponent || relevantComponentResources.length === 0) {
		logger.warn("no course challenge component with resources found", {
			candidateCount: candidateComponents.length,
			onerosterCourseSourcedId
		})
		notFound()
	}

	// Step 4: Find the specific resource that matches the test slug
	const allRelevantResourceIds = new Set(relevantComponentResources.map((cr) => cr.resource.sourcedId))
	const allResourcesResult = await errors.try(getAllResources())
	if (allResourcesResult.error) {
		logger.error("failed to fetch all resources", { error: allResourcesResult.error })
		throw errors.wrap(allResourcesResult.error, "fetch all resources")
	}

	logger.info("searching for resource with slug", { slug: params.test })

	// Legacy behavior: accept interactive or qti test resources by slug
	const matching = allResourcesResult.data
		.filter((res) => allRelevantResourceIds.has(res.sourcedId))
		.filter((res) => {
			const meta = ResourceMetadataSchema.safeParse(res.metadata)
			if (!meta.success) return false
			if (meta.data.khanSlug !== params.test) return false
			if (meta.data.type === "interactive") return true
			if (meta.data.type === "qti" && meta.data.subType === "qti-test") return true
			return false
		})

	if (matching.length === 0) {
		logger.error("could not find a matching course challenge resource for slug", {
			slug: params.test,
			onerosterCourseSourcedId
		})
		notFound()
	}

	const testResource = matching[0]
	if (!testResource) {
		logger.error("no matching resources remain after filtering", { slug: params.test, onerosterCourseSourcedId })
		notFound()
```


## Assistant

<thinking>


**Detailing OneRoster backend write process**

I'm mapping out how the stepper writes quiz results to the OneRoster backend, including the metadata crafted by `assessment.saveResult` and passed through `gradebook.saveResult` to `oneroster.putResult`. I'll gather how attempt numbers are fetched with `getNextAttemptNumber`, inspect the ID patterns for user and line item IDs, and explain the linkage between resource IDs and line items. I'll also explore how session results from Redis contribute metadata fields, the role of TTL, and any connection to asynchronous components like PowerPath to fully answer the user's questions.
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
import { z } from "zod"

/**
 * Defines the canonical structure for metadata stored with an assessment result in the gradebook.
 * This schema is the single source of truth for validating and creating result metadata.
 * Required fields have no defaults to enforce explicit calculation.
 */
export const AssessmentResultMetadataSchema = z
	.object({
		masteredUnits: z.number().int(),
		totalQuestions: z.number().int(),
		correctQuestions: z.number().int(),
		accuracy: z.number().int().min(0).max(100),
		xp: z.number().int(),
		multiplier: z.number(),
		attempt: z.number().int().optional(),
		startedAt: z.string().datetime().optional(),
		completedAt: z.string().datetime(),
		// Optional per-content metadata
		// nice_timeSpent captures watched seconds for passive content (e.g., video)
		nice_timeSpent: z.number().int().optional(),
		lessonType: z.string().optional(),
		courseSourcedId: z.string(),
		durationInSeconds: z.number().optional(),
		penaltyApplied: z.boolean(),
		xpReason: z.string()
	})
	.refine((data) => !(data.penaltyApplied && !data.xpReason), {
		message: "xpReason must be provided when a penalty is applied."
	})

export type AssessmentResultMetadata = z.infer<typeof AssessmentResultMetadataSchema>
```


## Assistant

<thinking>


**Preparing references for xp metadata investigation**
</thinking>

**Tool Call: Read assessment-stepper.tsx**
Status: Completed

```tsx
   360			let timeoutId: number | null = null
   361
   362			async function initState(retries = 3): Promise<void> {
   363				// Guard: ensure init runs once per mount; also if summary already visible or we're finalizing, skip
   364				if (didInitRef.current || showSummary || isFinalizationComplete || isFinalizing) {
   365					return
   366				}
   367				didInitRef.current = true
   368				setLoadError(false)
   369				setIsLoading(true)
   370				const result = await errors.try(getOrCreateAssessmentState(onerosterResourceSourcedId))
   371				if (result.error) {
   372					if (retries > 0) {
   373						// Avoid stacking toasts in retries
   374						if (!loadError) toast.info("Retrying load in 5s...")
   375						// Use window.setTimeout which returns a number in browser environments
   376						timeoutId = window.setTimeout(() => void initState(retries - 1), 5000)
   377						return
   378					}
   379					toast.error("Could not load assessment after retries.")
   380					setIsLoading(false)
   381					setLoadError(true)
   382					return
   383				}
   384				const state = result.data
   385				setServerState(state)
   386				const isComplete = state.currentQuestionIndex >= questions.length
   387				if (!isComplete) {
   388					// Only set a visible question when in-progress to avoid flashing the last question on completed attempts
   389					const clampedIndex = Math.max(0, Math.min(state.currentQuestionIndex, questions.length - 1))
   390					setVisibleQuestionIndex(clampedIndex)
   391				}
   392
   393				// NEW: Check for a persistent finalization error first.
   394				if (state.finalizationError) {
   395					toast.error(`Could not complete assessment: ${state.finalizationError}`)
   396					setIsLoading(false)
   397					setLoadError(true)
   398					return
   399				}
   400
   401				if (state.currentQuestionIndex >= questions.length && !state.isFinalized) {
   402					setIsFinalizing(true)
   403					const finalizeResult = await errors.try(
   404						finalizeAssessment({
   405							onerosterResourceSourcedId,
   406							onerosterComponentResourceSourcedId,
   407							onerosterCourseSourcedId,
   408							expectedXp,
   409							assessmentTitle,
   410							assessmentPath,
   411							unitData,
   412							contentType
   413						})
   414					)
   415					if (finalizeResult.error) {
   416						toast.error("Failed to complete assessment. Retry or contact support.")
   417						setIsFinalizing(false)
   418						setIsLoading(false)
   419						setLoadError(true)
   420						return
   421					}
   422					const finalSummaryData = finalizeResult.data
   423					setSummaryData({
   424						score: finalSummaryData.score,
   425						correctAnswersCount: finalSummaryData.correctAnswersCount,
   426						totalQuestions: finalSummaryData.totalQuestions,
   427						xpPenaltyInfo: finalSummaryData.xpPenaltyInfo
   428							? {
   429								penaltyXp:
   430									typeof finalSummaryData.xpPenaltyInfo.penaltyXp === "number"
   431										? finalSummaryData.xpPenaltyInfo.penaltyXp
   432										: 0,
   433								reason:
   434									typeof finalSummaryData.xpPenaltyInfo.reason === "string"
   435										? finalSummaryData.xpPenaltyInfo.reason
   436										: "Unknown penalty reason",
   437								avgSecondsPerQuestion: finalSummaryData.xpPenaltyInfo.avgSecondsPerQuestion
   438							}
   439							: undefined
   440					})
   441					setShowSummary(true)
   442					setIsFinalizationComplete(true)
   443					setIsFinalizing(false)
   444					setIsLoading(false)
   445					return
   446				}
   447
   448				// Handle already-finalized assessment on refresh
   449				if (state.currentQuestionIndex >= questions.length && state.isFinalized) {
   450					if (state.finalSummary) {
```


## Assistant

<thinking>


**Referencing getOrCreateAssessmentState**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
   220		return {
   221			isCorrect,
   222			score: isCorrect ? 1 : 0,
   223			feedback: isCorrect ? "Correct!" : "Not quite right. Try again."
   224		} as const
   225	}
   226
   227	/**
   228	 * Gets or creates the assessment state in Redis.
   229	 * If the assessment is already finalized or completed, triggers finalization and returns the finalized state.
   230	 * Otherwise returns the current state to resume from.
   231	 */
   232	export async function getOrCreateAssessmentState(onerosterResourceSourcedId: string): Promise<AssessmentState> {
   233		const { userId } = await auth()
   234		if (!userId) {
   235			logger.error("getOrCreateAssessmentState failed: user not authenticated")
   236			throw errors.new("user not authenticated")
   237		}
   238		const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
   239
   240		const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
   241		const existingState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
   242
   243		if (existingState) {
   244			// If the state exists and is already finalized, simply return it.
   245			// The client will use this to display the summary screen.
   246			if (existingState.isFinalized) {
   247				logger.info("resuming an already finalized assessment state", {
   248					onerosterUserSourcedId,
   249					onerosterResourceSourcedId,
   250					attemptNumber
   251				})
   252				return existingState
   253			}
   254			// This is a valid, in-progress state that can be resumed.
   255			return existingState
   256		}
   257
   258		const questions = await getDeterministicQuestionList(
   259			onerosterUserSourcedId,
   260			onerosterResourceSourcedId,
   261			attemptNumber
   262		)
   263		return createAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber, questions.length)
   264	}
   265
   266	/**
   267	 * Submits the **first and only graded answer** for a question.
   268	 *
   269	 * This action is central to the assessment's integrity. It is called only on the user's
   270	 * first attempt for a given question. It determines correctness, records the result and response
   271	 * into the Redis state, and then **atomically advances the server's `currentQuestionIndex`**.
   272	 *
   273	 * This immediate advancement ensures that even if the user refreshes the page, their first
   274	 * answer is locked in, preventing any attempts to "game" the system. Subsequent attempts on the
   275	 * client-side are for formative feedback only and use the compute-only `processQuestionResponse` function.
   276	 *
   277	 * @returns An object containing the new, advanced `AssessmentState` and the `isCorrect` boolean.
   278	 */
   279	export async function submitAnswer(
   280		onerosterResourceSourcedId: string,
   281		questionId: string,
   282		questionIndex: number,
   283		responseValue: string | unknown[] | Record<string, unknown>,
   284		responseIdentifier: string
   285	): Promise<{ state: AssessmentState; isCorrect: boolean }> {
   286		const { userId } = await auth()
   287		if (!userId) {
   288			logger.error("submitAnswer failed: user not authenticated")
   289			throw errors.new("user not authenticated")
   290		}
   291		const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
   292
   293		const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
   294		const state = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
   295		if (!state) {
   296			logger.error("assessment state not found", { onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber })
   297			throw ErrAssessmentStateNotFound
   298		}
   299		if (state.currentQuestionIndex !== questionIndex) {
   300			logger.error("out-of-order answer submission", {
   301				currentIndex: state.currentQuestionIndex,
   302				submittedIndex: questionIndex
   303			})
   304			throw errors.new("out-of-order answer submission")
   305		}
   306
   307		const questionList = await getDeterministicQuestionList(
   308			onerosterUserSourcedId,
   309			onerosterResourceSourcedId,
   310			state.attemptNumber
   311		)
   312		if (questionList[questionIndex]?.id !== questionId) {
   313			logger.error("question id mismatch", {
   314				expectedId: questionList[questionIndex]?.id,
   315				receivedId: questionId,
   316				questionIndex
   317			})
   318			throw errors.new("question id mismatch")
   319		}
   320
   321		// Process the response to determine correctness
   322		/**
   323		 * IMPORTANT: Temporary compatibility with AE Studios' OTI/QTI service
   324		 *
   325		 * See note in `processQuestionResponse` above. The same migration work applies
   326		 * here when we remove reliance on provider JSON and parse `rawXml` instead
   327		 * to obtain declared response identifiers and cardinalities.
   328		 */
   329		let isCorrect = false
   330
   331		// Fetch authoritative response declarations to validate identifiers
   332		/**
   333		 * IMPORTANT: Temporary compatibility with AE Studios' OTI/QTI service
   334		 *
   335		 * We currently rely on the provider's JSON representation of assessment items
   336		 * (e.g., `responseDeclarations` on the GET /assessment-items/:id response) to
   337		 * derive the set of declared response identifiers for validation and filtering.
   338		 * This is necessary to harden against the iframe/player emitting undeclared
   339		 * identifiers (e.g., a stray "RESPONSE").
   340		 *
   341		 * TODO(migration): When we migrate off the current AE Studios implementation
   342		 * of OTI/QTI, REWRITE this logic to parse the raw XML (`rawXml`) directly
   343		 * to extract response declarations, their identifiers, cardinalities, and
   344		 * base types. Do not depend on provider-specific JSON shapes. The XML parse
   345		 * must be the single source of truth to avoid vendor lock-in and drift.
   346		 *
   347		 * Migration acceptance criteria:
   348		 * - Parse <qti-response-declaration> nodes from XML and compute `allowedIds`
   349		 * - Respect record vs single/multiple/ordered cardinality for how we submit
   350		 * - Keep unknown identifiers strictly rejected (no fallbacks)
   351		 * - Preserve the behavior documented by tests in
   352		 *   `tests/actions/assessment/response-filtering.test.ts`
   353		 */
   354		const itemResult = await errors.try(qti.getAssessmentItem(questionId))
   355		if (itemResult.error) {
   356			logger.error("failed to get qti assessment item for submit", { error: itemResult.error, questionId })
   357			throw errors.wrap(itemResult.error, "qti get assessment item")
   358		}
   359		const declarations = itemResult.data.responseDeclarations ?? []
   360		const allowedIds = new Set(declarations.map((d) => d.identifier))
```


## Assistant

<thinking>


**Noting need to cite assessment-cache**
</thinking>

**Tool Call: Read assessment-cache.ts**
Status: Completed

```ts
     1	import * as errors from "@superbuilders/errors"
     2	import * as logger from "@superbuilders/slog"
     3	import { z } from "zod"
     4	import { redis } from "@/lib/redis"
     5
     6	const ASSESSMENT_STATE_TTL_SECONDS = 60 * 60 * 24 * 7 // 1 week
     7
     8	// --- Exported Errors for Type-Safe Handling ---
     9	export const ErrAssessmentStateNotFound = errors.new("assessment state not found")
    10	export const ErrRedisUnavailable = errors.new("assessment service unavailable")
    11
    12	// --- State Shape ---
    13	export interface AssessmentQuestionState {
    14		isCorrect: boolean | null // null for reported questions
    15		response: unknown
    16		isReported?: boolean
    17	}
    18
    19	export interface AssessmentState {
    20		attemptNumber: number
    21		currentQuestionIndex: number
    22		totalQuestions: number
    23		startedAt: string // ISO 8601
    24		questions: Record<number, AssessmentQuestionState>
    25		isFinalized: boolean
    26		finalizationError: string | null
    27		finalSummary: {
    28			score: number
    29			correctAnswersCount: number | null
    30			totalQuestions: number | null
    31			xpPenaltyInfo?: { penaltyXp: number; reason: string; avgSecondsPerQuestion?: number }
    32		} | null
    33	}
    34
    35	// --- Zod Schemas for Runtime Validation ---
    36	const AssessmentQuestionStateSchema = z.object({
    37		isCorrect: z.boolean().nullable(),
    38		response: z.unknown(),
    39		isReported: z.boolean().optional()
    40	})
    41
    42	const AssessmentStateWithoutQuestionsSchema = z.object({
    43		attemptNumber: z.number(),
    44		currentQuestionIndex: z.number(),
    45		totalQuestions: z.number(),
    46		startedAt: z.string(),
    47		isFinalized: z.boolean(),
    48		finalizationError: z.string().nullable(),
    49		finalSummary: z
    50			.object({
    51				score: z.number(),
    52				correctAnswersCount: z.number().nullable(),
    53				totalQuestions: z.number().nullable(),
    54				xpPenaltyInfo: z
    55					.object({
    56						penaltyXp: z.number(),
    57						reason: z.string(),
    58						avgSecondsPerQuestion: z.number().optional()
    59					})
    60					.optional()
    61			})
    62			.nullable()
    63	})
    64
    65	// --- Key Schema ---
    66	function getCacheKey(userId: string, assessmentId: string, attemptNumber: number): string {
    67		// Key Schema: assess:state:{userId}:{assessmentId}:{attempt}
    68		return `assess:state:${userId}:${assessmentId}:${attemptNumber}`
    69	}
    70
    71	function getQuestionsHashKey(userId: string, assessmentId: string, attemptNumber: number): string {
    72		// Key Schema: assess:questions:{userId}:{assessmentId}:{attempt}
    73		return `assess:questions:${userId}:${assessmentId}:${attemptNumber}`
    74	}
    75
    76	export async function getAssessmentState(
    77		userId: string,
    78		assessmentId: string,
    79		attemptNumber: number
    80	): Promise<AssessmentState | null> {
    81		if (!redis) {
    82			logger.error("redis not available for getAssessmentState")
    83			throw ErrRedisUnavailable
    84		}
    85
    86		const key = getCacheKey(userId, assessmentId, attemptNumber)
    87		const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)
    88
    89		const stateResult = await errors.try(redis.get(key))
    90		if (stateResult.error) {
    91			logger.error("failed to get assessment state from redis", { key, error: stateResult.error })
    92			throw errors.wrap(stateResult.error, "redis get state")
    93		}
    94
    95		if (!stateResult.data) {
    96			return null
    97		}
    98
    99		const stateData = stateResult.data
   100		const parsedState = errors.trySync(() => JSON.parse(stateData))
   101		if (parsedState.error) {
   102			logger.error("failed to parse assessment state JSON", { error: parsedState.error })
   103			throw errors.wrap(parsedState.error, "parse assessment state")
   104		}
   105
   106		const stateValidation = AssessmentStateWithoutQuestionsSchema.safeParse(parsedState.data)
   107		if (!stateValidation.success) {
   108			logger.error("invalid assessment state format", { error: stateValidation.error })
   109			throw errors.wrap(stateValidation.error, "validate assessment state")
   110		}
   111
   112		const state = stateValidation.data
   113
   114		// Get all questions from the hash
   115		const questionsResult = await errors.try(redis.hGetAll(questionsKey))
   116		if (questionsResult.error) {
   117			logger.error("failed to get assessment questions from redis", { questionsKey, error: questionsResult.error })
   118			throw errors.wrap(questionsResult.error, "redis get questions")
   119		}
   120
   121		const questions: Record<number, AssessmentQuestionState> = {}
   122		for (const [index, value] of Object.entries(questionsResult.data)) {
   123			const parsedQuestion = errors.trySync(() => JSON.parse(value))
   124			if (parsedQuestion.error) {
   125				logger.error("failed to parse question JSON", { index, error: parsedQuestion.error })
   126				throw errors.wrap(parsedQuestion.error, `parse question ${index}`)
   127			}
   128
   129			const questionValidation = AssessmentQuestionStateSchema.safeParse(parsedQuestion.data)
   130			if (!questionValidation.success) {
   131				logger.error("invalid question state format", { index, error: questionValidation.error })
   132				throw errors.wrap(questionValidation.error, `validate question ${index}`)
   133			}
   134
   135			// After successful validation, we know the data conforms to AssessmentQuestionState
   136			const validatedQuestion: AssessmentQuestionState = {
   137				isCorrect: questionValidation.data.isCorrect,
   138				response: questionValidation.data.response,
   139				isReported: questionValidation.data.isReported
   140			}
   141			questions[Number(index)] = validatedQuestion
   142		}
   143
   144		// Refresh TTL on read
   145		await redis.expire(key, ASSESSMENT_STATE_TTL_SECONDS)
   146		await redis.expire(questionsKey, ASSESSMENT_STATE_TTL_SECONDS)
   147
   148		return { ...state, questions }
   149	}
   150
   151	export async function createAssessmentState(
   152		userId: string,
   153		assessmentId: string,
   154		attemptNumber: number,
   155		totalQuestions: number
   156	): Promise<AssessmentState> {
   157		if (!redis) {
   158			logger.error("redis not available")
   159			throw ErrRedisUnavailable
   160		}
   161		const key = getCacheKey(userId, assessmentId, attemptNumber)
   162		const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)
   163
   164		const newState: Omit<AssessmentState, "questions"> = {
   165			attemptNumber,
   166			currentQuestionIndex: 0,
   167			totalQuestions,
   168			startedAt: new Date().toISOString(),
   169			isFinalized: false,
   170			finalizationError: null,
   171			finalSummary: null
   172		}
   173
   174		const multi = redis.multi()
   175		multi.set(key, JSON.stringify(newState), { EX: ASSESSMENT_STATE_TTL_SECONDS })
   176		multi.expire(questionsKey, ASSESSMENT_STATE_TTL_SECONDS) // Ensure hash key also has TTL
   177
   178		const result = await errors.try(multi.exec())
   179		if (result.error) {
   180			logger.error("failed to create assessment state in redis", { key, error: result.error })
   181			throw errors.wrap(result.error, "redis create state transaction")
   182		}
   183
   184		return { ...newState, questions: {} }
   185	}
   186
   187	export async function updateStateAndQuestion(
   188		userId: string,
   189		assessmentId: string,
   190		attemptNumber: number,
   191		questionIndex: number,
   192		questionState: AssessmentQuestionState,
   193		overwrite = false
   194	): Promise<{ wasWritten: boolean }> {
   195		if (!redis) {
   196			logger.error("redis not available")
   197			throw ErrRedisUnavailable
   198		}
   199
   200		const stateKey = getCacheKey(userId, assessmentId, attemptNumber)
```


## Assistant

<thinking>


**Identifying need for markAssessmentFinalized function**
</thinking>

**Tool Call: Read assessment-cache.ts**
Status: Completed

```ts
   200		const stateKey = getCacheKey(userId, assessmentId, attemptNumber)
   201		const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)
   202
   203		let attempts = 0
   204		while (attempts < 3) {
   205			await redis.watch(stateKey)
   206
   207			const stateResult = await errors.try(redis.get(stateKey))
   208			if (stateResult.error) {
   209				await redis.unwatch() // Ensure unwatch on failure
   210				logger.error("redis get failed for atomic update", { stateKey, error: stateResult.error })
   211				throw errors.wrap(stateResult.error, "redis get for atomic update")
   212			}
   213			if (!stateResult.data) {
   214				await redis.unwatch() // Ensure unwatch on failure
   215				logger.error("assessment state not found for atomic update", { stateKey })
   216				throw ErrAssessmentStateNotFound
   217			}
   218
   219			// (Existing parsing and validation logic remains unchanged)
   220			const stateData = stateResult.data
   221			const parsedState = errors.trySync(() => JSON.parse(stateData))
   222			if (parsedState.error) {
   223				await redis.unwatch()
   224				logger.error("failed to parse assessment state JSON for update", { error: parsedState.error })
   225				throw errors.wrap(parsedState.error, "parse assessment state for update")
   226			}
   227
   228			const stateValidation = AssessmentStateWithoutQuestionsSchema.safeParse(parsedState.data)
   229			if (!stateValidation.success) {
   230				await redis.unwatch()
   231				logger.error("invalid assessment state format for update", { error: stateValidation.error })
   232				throw errors.wrap(stateValidation.error, "validate assessment state for update")
   233			}
   234
   235			const state = stateValidation.data
   236
   237			// CRITICAL CHECK: Ensure we are not processing an out-of-order request
   238			if (state.currentQuestionIndex !== questionIndex) {
   239				await redis.unwatch()
   240				logger.error("out-of-order answer submission detected during atomic update", {
   241					stateKey,
   242					currentIndex: state.currentQuestionIndex,
   243					submittedIndex: questionIndex
   244				})
   245				throw errors.new("out-of-order answer submission")
   246			}
   247
   248			state.currentQuestionIndex = questionIndex + 1
   249
   250			const multi = redis.multi()
   251			if (overwrite) {
   252				multi.hSet(questionsKey, String(questionIndex), JSON.stringify(questionState))
   253			} else {
   254				multi.hSetNX(questionsKey, String(questionIndex), JSON.stringify(questionState))
   255			}
   256			multi.set(stateKey, JSON.stringify(state), { EX: ASSESSMENT_STATE_TTL_SECONDS })
   257			multi.expire(questionsKey, ASSESSMENT_STATE_TTL_SECONDS)
   258
   259			const execResult = await errors.try(multi.exec())
   260
   261			if (execResult.data !== null) {
   262				if (execResult.error) {
   263					logger.error("atomic state/question update failed", { error: execResult.error })
   264					throw errors.wrap(execResult.error, "redis multi exec")
   265				}
   266				const wasWritten = overwrite ? true : Boolean(execResult.data?.[0] && Number(execResult.data[0]) === 1)
   267				return { wasWritten }
   268			}
   269
   270			// If execResult.data is null, WATCH conflict occurred. Retry.
   271			await redis.unwatch()
   272			attempts++
   273			if (attempts < 3) {
   274				const delay = 2 ** attempts * 50 // Exponential backoff: 100ms, 200ms
   275				await new Promise((resolve) => setTimeout(resolve, delay))
   276			}
   277		}
   278
   279		// If loop finishes, all retries failed.
   280		logger.error("failed to update assessment state due to concurrent modification after retries", { stateKey })
   281		throw errors.new("concurrent modification after retries")
   282	}
   283
   284	export async function markAssessmentFinalized(
   285		userId: string,
   286		assessmentId: string,
   287		attemptNumber: number,
   288		summary: AssessmentState["finalSummary"]
   289	): Promise<void> {
   290		if (!redis) {
   291			logger.error("redis not available for markAssessmentFinalized")
   292			throw ErrRedisUnavailable
   293		}
   294
   295		const key = getCacheKey(userId, assessmentId, attemptNumber)
   296		const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)
   297
   298		const stateResult = await errors.try(redis.get(key))
   299		if (stateResult.error) {
   300			logger.error("failed to get assessment state for finalization", { key, error: stateResult.error })
   301			throw errors.wrap(stateResult.error, "redis get state for finalization")
   302		}
   303		if (!stateResult.data) {
   304			logger.warn("assessment state not found, cannot mark as finalized", { key })
   305			// Do not throw; the absence of state implies it might have been cleaned up already.
   306			return
   307		}
   308
   309		const stateData = stateResult.data
   310		const parsedState = errors.trySync(() => JSON.parse(stateData))
   311		if (parsedState.error) {
   312			logger.error("failed to parse assessment state JSON for finalization", { error: parsedState.error })
   313			throw errors.wrap(parsedState.error, "parse assessment state for finalization")
   314		}
   315
   316		const stateValidation = AssessmentStateWithoutQuestionsSchema.safeParse(parsedState.data)
   317		if (!stateValidation.success) {
   318			logger.error("invalid assessment state format for finalization", { error: stateValidation.error })
   319			throw errors.wrap(stateValidation.error, "validate assessment state for finalization")
   320		}
   321
   322		const state = stateValidation.data
   323		state.isFinalized = true
   324		state.finalSummary = summary
   325
   326		// Use a pipeline to set the state and refresh TTL on both keys
   327		const multi = redis.multi()
   328		multi.set(key, JSON.stringify(state), { EX: ASSESSMENT_STATE_TTL_SECONDS }) // Reset TTL
   329		multi.expire(questionsKey, ASSESSMENT_STATE_TTL_SECONDS)
   330
   331		const result = await errors.try(multi.exec())
   332		if (result.error) {
   333			logger.error("failed to mark assessment state as finalized in redis", { key, error: result.error })
   334			throw errors.wrap(result.error, "redis set finalized state")
   335		}
   336
   337		logger.info("assessment state marked as finalized", { userId, assessmentId, attemptNumber })
   338	}
   339
   340	export async function deleteAssessmentState(
   341		userId: string,
   342		assessmentId: string,
   343		attemptNumber: number
   344	): Promise<void> {
   345		if (!redis) {
   346			logger.error("redis not available")
   347			throw ErrRedisUnavailable
   348		}
   349
   350		const stateKey = getCacheKey(userId, assessmentId, attemptNumber)
   351		const questionsKey = getQuestionsHashKey(userId, assessmentId, attemptNumber)
   352
   353		const multi = redis.multi()
   354		multi.del(stateKey)
   355		multi.del(questionsKey)
   356
   357		const result = await errors.try(multi.exec())
   358		if (result.error) {
   359			logger.error("failed to delete assessment state from redis", { stateKey, questionsKey, error: result.error })
   360			throw errors.wrap(result.error, "redis delete state")
   361		}
   362
   363		logger.info("assessment state deleted", { userId, assessmentId, attemptNumber })
   364	}
   365
   366	export async function markAssessmentFinalizationFailed(
   367		userId: string,
   368		assessmentId: string,
   369		attemptNumber: number,
   370		errorMessage: string
   371	): Promise<void> {
   372		if (!redis) {
   373			logger.error("redis not available for markAssessmentFinalizationFailed")
   374			throw ErrRedisUnavailable
   375		}
   376
   377		const key = getCacheKey(userId, assessmentId, attemptNumber)
   378		const stateResult = await errors.try(redis.get(key))
   379		if (stateResult.error || !stateResult.data) {
   380			logger.error("failed to get assessment state to mark as failed", { key, error: stateResult.error })
   381			// Do not throw; if state is gone, there's nothing to mark.
   382			return
   383		}
   384
   385		const stateData = stateResult.data
   386		const parsedState = errors.trySync(() => JSON.parse(stateData))
   387		const stateValidation = AssessmentStateWithoutQuestionsSchema.safeParse(parsedState.data)
   388
   389		if (parsedState.error || !stateValidation.success) {
   390			logger.error("failed to parse existing state to mark as failed", { key })
   391			return // Cannot safely modify, so we abort.
   392		}
   393
   394		const state = stateValidation.data
   395		state.finalizationError = errorMessage
   396
   397		const setResult = await errors.try(redis.set(key, JSON.stringify(state), { KEEPTTL: true }))
   398		if (setResult.error) {
   399			logger.error("failed to set finalizationError in redis", { key, error: setResult.error })
   400			throw errors.wrap(setResult.error, "redis set finalizationError")
   401		}
   402	}
```


## Assistant

<thinking>


**Citing finalizeAssessment code section**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
   700
   701	/**
   702	 * Orchestrates the finalization of an assessment.
   703	 *
   704	 * This is the culminating action called when a user completes the last question. It reads the
   705	 * **server-authoritative state from Redis** (not from client input), calculates the final score,
   706	 * saves the official result to OneRoster via the assessment service, and awards XP.
   707	 *
   708	 * **CRITICAL BUSINESS LOGIC:**
   709	 * - The Redis state is the SINGLE SOURCE OF TRUTH for assessment results
   710	 * - Redis only stores the FIRST ATTEMPT for each question (subsequent attempts are for formative feedback only)
   711	 * - Reported questions (where isReported=true or isCorrect=null) are EXCLUDED from scoring
   712	 * - The final score = (correct answers / scorable questions) × 100, where scorable questions exclude reported ones
   713	 *
   714	 * After all permanent storage is updated, it marks the assessment state in Redis as `isFinalized: true`.
   715	 * This makes the finalization step idempotent; if called again on an already-finalized state, it will
   716	 * simply return the calculated summary without performing duplicate writes.
   717	 *
   718	 * @param options Contextual data for the assessment (no session results are passed from the client).
   719	 * @returns A summary payload for the client's SummaryView, including score and any XP penalties.
   720	 */
   721	export async function finalizeAssessment(options: {
   722		onerosterResourceSourcedId: string
   723		onerosterComponentResourceSourcedId: string
   724		onerosterCourseSourcedId: string
   725		expectedXp: number
   726		assessmentTitle: string
   727		assessmentPath: string
   728		unitData?: Unit
   729		contentType: "Exercise" | "Quiz" | "Test" | "CourseChallenge"
   730	}) {
   731		const correlationId = randomUUID()
   732		const { userId: clerkUserId } = await auth()
   733		if (!clerkUserId) {
   734			logger.error("finalize assessment: user not authenticated", { correlationId })
   735			throw errors.new("user not authenticated")
   736		}
   737		const onerosterUserSourcedId = await getCurrentUserSourcedId(clerkUserId)
   738		const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, options.onerosterResourceSourcedId)
   739
   740		const state = await getAssessmentState(onerosterUserSourcedId, options.onerosterResourceSourcedId, attemptNumber)
   741		if (!state) {
   742			logger.error("assessment state not found for finalization", {
   743				onerosterUserSourcedId,
   744				onerosterResourceSourcedId: options.onerosterResourceSourcedId,
   745				attemptNumber
   746			})
   747			throw ErrAssessmentStateNotFound
   748		}
   749
   750		// Wrap finalization logic in an async function to use errors.try
   751		const performFinalization = async () => {
   752			// IDEMPOTENCY: If the summary has already been calculated and stored, return it immediately.
   753			if (state.finalSummary) {
   754				logger.info("finalizeAssessment called on an already finalized state, returning stored summary.", {
   755					correlationId
   756				})
   757				return state.finalSummary
   758			}
   759
   760			// Calculate server-authoritative duration
   761			const durationInSeconds = Math.round((Date.now() - new Date(state.startedAt).getTime()) / 1000)
   762
   763			// Reconstruct sessionResults from Redis state
   764			const questionList = await getDeterministicQuestionList(
   765				onerosterUserSourcedId,
   766				options.onerosterResourceSourcedId,
   767				attemptNumber
   768			)
   769			const sessionResults = Object.entries(state.questions).map(([indexStr, qState]) => {
   770				const index = Number(indexStr)
   771				const questionId = questionList[index]?.id
   772
   773				if (!questionId) {
   774					logger.error("critical state inconsistency: question ID not found at expected index during finalization", {
   775						onerosterUserSourcedId,
   776						onerosterResourceSourcedId: options.onerosterResourceSourcedId,
   777						attemptNumber,
   778						failedIndex: index,
   779						totalQuestionsInList: questionList.length,
   780						totalQuestionsInState: Object.keys(state.questions).length,
   781						correlationId
   782					})
   783					throw errors.new("critical state inconsistency: could not map question state to a question ID")
   784				}
   785
   786				return {
   787					qtiItemId: questionId,
   788					isCorrect: qState.isCorrect,
   789					isReported: qState.isReported
   790				}
   791			})
   792
   793			// The sessionResults from Redis are authoritative. We only need to filter out
   794			// reported questions (where isCorrect is null) for scoring.
   795			const scorableResults = sessionResults.filter((r) => typeof r.isCorrect === "boolean")
   796
   797			const correctAnswers = scorableResults.filter((r) => r.isCorrect).length
   798			const totalQuestions = scorableResults.length
   799			const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 100
   800			const avgSecondsPerQuestion =
   801				durationInSeconds && totalQuestions > 0 ? durationInSeconds / totalQuestions : undefined
   802
   803			logger.info("finalizing assessment", {
   804				userSourcedId: onerosterUserSourcedId,
   805				resourceSourcedId: options.onerosterResourceSourcedId,
   806				correlationId
   807			})
   808
   809			const { userId: clerkUserId } = await auth()
   810			if (!clerkUserId) {
   811				logger.error("finalize assessment: user not authenticated", { correlationId })
   812				throw errors.new("user not authenticated")
   813			}
   814
   815			// Extract subject and course slugs from assessment path
   816			const pathParts = options.assessmentPath.split("/")
   817			if (pathParts.length < 3 || !pathParts[1] || !pathParts[2]) {
   818				logger.error("invalid assessment path structure", { assessmentPath: options.assessmentPath, correlationId })
   819				throw errors.new("assessment path invalid")
   820			}
   821			const subjectSlugRaw = pathParts[1]
   822			if (!isSubjectSlug(subjectSlugRaw)) {
   823				logger.error("invalid subject slug in assessment path", {
   824					subjectSlug: subjectSlugRaw,
   825					assessmentPath: options.assessmentPath,
   826					correlationId
   827				})
   828				throw errors.new("subject slug invalid")
   829			}
   830			const subjectSlug = subjectSlugRaw
   831			const courseSlug = pathParts[2]
   832
   833			// Build the command DTO for the service layer
   834			// Fetch user metadata for downstream services (streak)
   835			const clerk = await clerkClient()
   836			const user = await clerk.users.getUser(clerkUserId)
   837
   838			// Email is now required for Caliper analytics
   839			const userEmail = user.emailAddresses[0]?.emailAddress
   840			if (!userEmail) {
   841				logger.error("user email required for assessment finalization", {
   842					clerkUserId,
   843					correlationId
   844				})
   845				throw errors.new("user email required for assessment")
   846			}
   847
   848			const command: SaveAssessmentResultCommand = {
   849				...options,
   850				onerosterUserSourcedId,
   851				// Persist the scorable results to ensure downstream consumers use consistent data
   852				sessionResults: scorableResults,
   853				attemptNumber,
   854				score: assertPercentageInteger(score, "assessment score"),
   855				correctAnswers,
   856				totalQuestions,
   857				durationInSeconds,
   858				isInteractiveAssessment: true,
   859				clerkUserId,
   860				correlationId,
   861				// zod schema now validates subjectSlug against SUBJECT_SLUGS; pass through
   862				subjectSlug,
   863				courseSlug,
   864				userPublicMetadata: user.publicMetadata,
   865				userEmail
   866			}
   867
   868			const saveResult = await errors.try(assessment.saveResult(command))
   869			if (saveResult.error) {
   870				logger.error("failed to save final assessment result", {
   871					error: saveResult.error,
   872					resourceSourcedId: options.onerosterResourceSourcedId
   873				})
   874				throw errors.wrap(saveResult.error, "failed to save final assessment result")
   875			}
   876
   877			const extractXpInfo = (): { finalXp: number; penaltyApplied: boolean; reason: string } | undefined => {
   878				if (!saveResult.data || typeof saveResult.data !== "object" || !("xp" in saveResult.data)) {
   879					return undefined
   880				}
   881				const xp = saveResult.data.xp
   882				if (
   883					xp &&
   884					typeof xp === "object" &&
   885					"finalXp" in xp &&
   886					"penaltyApplied" in xp &&
   887					"reason" in xp &&
   888					typeof xp.finalXp === "number" &&
   889					typeof xp.penaltyApplied === "boolean" &&
   890					typeof xp.reason === "string"
   891				) {
   892					return {
   893						finalXp: xp.finalXp,
   894						penaltyApplied: xp.penaltyApplied,
   895						reason: xp.reason
   896					}
   897				}
   898				return undefined
   899			}
   900			const xpInfo = extractXpInfo()
```


## Assistant

<thinking>


**Emphasizing command and assessment lines**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
     1	import * as errors from "@superbuilders/errors"
     2	import * as logger from "@superbuilders/slog"
     3	import { env } from "@/env"
     4	import { CALIPER_SUBJECT_MAPPING } from "@/lib/constants/subjects"
     5	import type { SaveAssessmentResultCommand } from "@/lib/dtos/assessment"
     6	import * as analytics from "@/lib/ports/analytics"
     7	import * as gradebook from "@/lib/ports/gradebook"
     8	import * as cache from "@/lib/services/cache"
     9	import * as proficiency from "@/lib/services/proficiency"
    10	import * as streak from "@/lib/services/streak"
    11	import { constructActorId } from "@/lib/utils/actor-id"
    12	import { generateResultSourcedId } from "@/lib/utils/assessment-identifiers"
    13	import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
    14	import { calculateAssessmentXp } from "@/lib/xp/core"
    15	import * as xp from "@/lib/xp/service"
    16
    17	export async function saveResult(command: SaveAssessmentResultCommand): Promise<unknown> {
    18		const {
    19			onerosterResourceSourcedId: resourceId,
    20			score: assessmentScore,
    21			correctAnswers,
    22			totalQuestions,
    23			onerosterUserSourcedId: userId,
    24			onerosterCourseSourcedId: courseId,
    25			isInteractiveAssessment = false,
    26			attemptNumber,
    27			correlationId
    28		} = command
    29
    30		logger.info("saving assessment result [service]", { correlationId, resourceId, userId })
    31
    32		// 1. Calculate XP (includes proficiency check and banking)
    33		// userEmail is now required by the DTO schema, no need to check
    34		const xpResult = await xp.awardXpForAssessment({
    35			userSourcedId: userId,
    36			assessmentResourceId: resourceId,
    37			componentResourceId: command.onerosterComponentResourceSourcedId,
    38			courseSourcedId: courseId,
    39			baseXp: command.expectedXp,
    40			correctQuestions: correctAnswers,
    41			totalQuestions: totalQuestions,
    42			attemptNumber: attemptNumber,
    43			durationInSeconds: command.durationInSeconds,
    44			isExercise: command.contentType === "Exercise",
    45			userEmail: command.userEmail,
    46			subjectSlug: command.subjectSlug,
    47			courseSlug: command.courseSlug
    48		})
    49
    50		// 2. Prepare and save the primary result to the gradebook (MUST SUCCEED)
    51		const resultSourcedId = generateResultSourcedId(userId, resourceId, isInteractiveAssessment, attemptNumber)
    52		const lineItemSourcedId = getAssessmentLineItemId(resourceId)
    53
    54		// Build the comment based on attempt number
    55		const comment =
    56			attemptNumber && attemptNumber > 1
    57				? `${correctAnswers}/${totalQuestions} correct on attempt ${attemptNumber}`
    58				: `${correctAnswers}/${totalQuestions} correct on first attempt`
    59
    60		// Build metadata for the result using legacy rules
    61		const accuracyPercent = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 100
    62		const calculateMasteredUnits = () => {
    63			if (command.contentType === "Test") return accuracyPercent >= 90 ? 1 : 0
    64			if (command.contentType === "Exercise" || command.contentType === "Quiz") return accuracyPercent >= 80 ? 1 : 0
    65			return 0
    66		}
    67		const masteredUnits = calculateMasteredUnits()
    68
    69		// Atomic: for Exercises, store exercise-only XP in the result metadata.
    70		// Other content types (Quiz/Test) do not bank, so total is the same as exercise XP.
    71		const exerciseOnlyXp = calculateAssessmentXp(
    72			command.expectedXp,
    73			accuracyPercent,
    74			attemptNumber,
    75			totalQuestions,
    76			command.durationInSeconds
    77		).finalXp
    78
    79		const metadata = {
    80			masteredUnits,
    81			totalQuestions: totalQuestions,
    82			correctQuestions: correctAnswers,
    83			accuracy: accuracyPercent,
    84			xp: command.contentType === "Exercise" ? exerciseOnlyXp : xpResult.finalXp,
    85			multiplier: xpResult.multiplier,
    86			penaltyApplied: xpResult.penaltyApplied,
    87			xpReason: xpResult.reason,
    88			completedAt: new Date().toISOString(),
    89			courseSourcedId: courseId,
    90			attempt: attemptNumber,
    91			durationInSeconds: command.durationInSeconds,
    92			lessonType: command.contentType?.toLowerCase()
    93		}
    94
    95		const gradebookResult = await errors.try(
    96			gradebook.saveResult({
    97				resultSourcedId,
    98				lineItemSourcedId,
    99				userSourcedId: userId,
   100				score: assessmentScore,
   101				comment,
   102				metadata,
   103				correlationId
   104			})
   105		)
   106
   107		if (gradebookResult.error) {
   108			logger.error("failed to save assessment result to gradebook", { error: gradebookResult.error, correlationId })
   109			throw errors.wrap(gradebookResult.error, "failed to save primary assessment result")
   110		}
   111
   112		// 3. Trigger best-effort background tasks.
   113		const sideEffectPromises = []
   114
   115		// Cache invalidation
   116		sideEffectPromises.push(cache.invalidateUserCourseProgress(userId, courseId))
   117
   118		// Streak update if XP was awarded
   119		if (xpResult.finalXp > 0 && command.userPublicMetadata) {
   120			sideEffectPromises.push(streak.update(command.clerkUserId, command.userPublicMetadata))
   121		}
   122
   123		// Proficiency update for interactive assessments
   124		if (
   125			isInteractiveAssessment &&
   126			command.onerosterComponentResourceSourcedId &&
   127			command.sessionResults &&
   128			attemptNumber
   129		) {
   130			sideEffectPromises.push(
   131				proficiency.updateFromAssessment(
   132					userId,
   133					command.onerosterComponentResourceSourcedId,
   134					attemptNumber,
   135					command.sessionResults,
   136					courseId,
   137					correlationId
   138				)
   139			)
   140		}
   141
   142		// Analytics event if we have required data
   143		if (command.unitData && command.assessmentPath && command.assessmentTitle && command.userEmail) {
   144			const subjectSlug = command.subjectSlug
   145			const mappedSubject = CALIPER_SUBJECT_MAPPING[subjectSlug]
   146			if (!mappedSubject) {
   147				logger.error("caliper subject mapping missing", { subjectSlug, correlationId })
   148				// Skip analytics if subject mapping is missing
   149			} else {
   150				// Build Caliper actor (legacy shape)
   151				const actor = {
   152					id: constructActorId(userId),
   153					type: "TimebackUser" as const,
   154					email: command.userEmail
   155				}
   156
   157				// Build Caliper context to match legacy payloads used by progress analytics
   158				const context = {
   159					id: `${env.NEXT_PUBLIC_APP_DOMAIN}${command.assessmentPath}`,
   160					type: "TimebackActivityContext" as const,
   161					subject: mappedSubject,
   162					app: { name: "Nice Academy" },
   163					course: {
   164						name: command.courseSlug,
   165						id: `${env.TIMEBACK_ONEROSTER_SERVER_URL}/ims/oneroster/rostering/v1p2/courses/${courseId}`
   166					},
   167					activity: { name: command.assessmentTitle, id: resourceId },
   168					process: false
   169				}
   170
   171				// Send analytics events (activity completed + optional time spent)
   172				sideEffectPromises.push(
   173					analytics.sendActivityCompletedEvent({
   174						actor,
   175						context,
   176						performance: {
   177							totalQuestions,
   178							correctQuestions: correctAnswers,
   179							masteredUnits
   180						},
   181						// Atomic: exercise-only XP (exclude banked XP)
   182						finalXp: calculateAssessmentXp(
   183							command.expectedXp,
   184							accuracyPercent,
   185							attemptNumber,
   186							totalQuestions,
   187							command.durationInSeconds
   188						).finalXp,
   189						durationInSeconds: command.durationInSeconds,
   190						correlationId
   191					})
   192				)
   193				if (command.durationInSeconds && command.durationInSeconds >= 1) {
   194					sideEffectPromises.push(
   195						analytics.sendTimeSpentEvent({
   196							actor,
   197							context,
   198							durationInSeconds: command.durationInSeconds,
   199							correlationId
   200						})
   201					)
   202				}
   203			}
   204		}
   205
   206		// Wait for all side effects to complete
   207		const settled = await Promise.allSettled(sideEffectPromises)
   208
   209		// Log any failures for observability
   210		settled.forEach((result, index) => {
   211			if (result.status === "rejected") {
   212				logger.error("side effect failed in assessment service", {
   213					index,
   214					error: result.reason,
   215					correlationId
   216				})
   217			}
   218		})
   219
   220		return { onerosterResultSourcedId: resultSourcedId, xp: xpResult }
```


## Assistant

<thinking>


**Identifying function to cite**
</thinking>

**Tool Call: Read gradebook.ts**
Status: Completed

```ts
     1	import * as errors from "@superbuilders/errors"
     2	import * as logger from "@superbuilders/slog"
     3	import { oneroster } from "@/lib/clients"
     4	import { type AssessmentResultMetadata, AssessmentResultMetadataSchema } from "@/lib/constants/assessment"
     5	import { assertPercentageInteger } from "@/lib/utils/score"
     6
     7	/**
     8	 * Saves a fully-formed assessment result to the gradebook via an idempotent PUT operation.
     9	 * This is the sole entry point for writing grades. It enforces score and metadata normalization.
    10	 *
    11	 * @returns The sourcedId of the created/updated result.
    12	 */
    13	export async function saveResult(options: {
    14		resultSourcedId: string
    15		lineItemSourcedId: string
    16		userSourcedId: string
    17		score: number
    18		comment: string
    19		metadata: AssessmentResultMetadata
    20		correlationId: string
    21	}): Promise<string> {
    22		const metadataValidation = AssessmentResultMetadataSchema.safeParse(options.metadata)
    23		if (!metadataValidation.success) {
    24			logger.error("invalid assessment result metadata", {
    25				error: metadataValidation.error,
    26				correlationId: options.correlationId
    27			})
    28			throw errors.wrap(metadataValidation.error, "gradebook metadata validation")
    29		}
    30		const validatedMetadata = metadataValidation.data
    31		const finalScore = assertPercentageInteger(options.score, "gradebook score")
    32
    33		const payload = {
    34			result: {
    35				assessmentLineItem: { sourcedId: options.lineItemSourcedId, type: "assessmentLineItem" as const },
    36				student: { sourcedId: options.userSourcedId, type: "user" as const },
    37				scoreStatus: "fully graded" as const,
    38				scoreDate: validatedMetadata.completedAt,
    39				score: finalScore,
    40				comment: options.comment,
    41				metadata: validatedMetadata
    42			}
    43		}
    44
    45		const result = await errors.try(oneroster.putResult(options.resultSourcedId, payload))
    46		if (result.error) {
    47			logger.error("failed to save result via gradebook port", {
    48				resultSourcedId: options.resultSourcedId,
    49				error: result.error,
    50				correlationId: options.correlationId
    51			})
    52			throw errors.wrap(result.error, "gradebook port: save result failed")
    53		}
    54
    55		return result.data.sourcedId
    56	}
```


## Assistant

<thinking>


**Identifying citation points**
</thinking>

**Tool Call: Read assessment-identifiers.ts**
Status: Completed

```ts
     1	import * as errors from "@superbuilders/errors"
     2	import * as logger from "@superbuilders/slog"
     3	import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
     4
     5	/**
     6	 * Centralized policy for all assessment-related identifiers.
     7	 */
     8
     9	// Attempt Policy: All attempt numbers must be integers greater than or equal to 1.
    10	const AttemptPolicy = {
    11		validate: (attempt: number) => {
    12			if (!Number.isInteger(attempt) || attempt < 1) {
    13				logger.error("invalid attempt number", { attempt, isInteger: Number.isInteger(attempt) })
    14				throw errors.new("attempt number must be a positive integer")
    15			}
    16		}
    17	}
    18
    19	/**
    20	 * Generates the sourcedId for an assessment result.
    21	 * Interactive assessments (exercises, quizzes, tests) must have an attempt number.
    22	 * Passive content (videos, articles) do not have an attempt number.
    23	 *
    24	 * @returns The final result sourcedId for the gradebook.
    25	 */
    26	export function generateResultSourcedId(
    27		userSourcedId: string,
    28		resourceSourcedId: string,
    29		isInteractive: boolean,
    30		attemptNumber?: number
    31	): string {
    32		const lineItemId = getAssessmentLineItemId(resourceSourcedId)
    33		const baseId = `nice_${userSourcedId}_${lineItemId}`
    34
    35		if (isInteractive) {
    36			if (typeof attemptNumber !== "number") {
    37				logger.error("attempt number required for interactive assessments", {
    38					userSourcedId,
    39					lineItemId,
    40					attemptNumber,
    41					attemptType: typeof attemptNumber
    42				})
    43				throw errors.new("attempt number required for interactive assessments")
    44			}
    45			AttemptPolicy.validate(attemptNumber)
    46			return `${baseId}_attempt_${attemptNumber}`
    47		}
    48
    49		return baseId
    50	}
```


## Assistant

<thinking>


**Noting need to cite function**
</thinking>

**Tool Call: Read assessment-line-items.ts**
Status: Completed

```ts
     1	/**
     2	 * Utility functions for converting between resource IDs and assessment line item IDs.
     3	 *
     4	 * This module handles the conversion logic in one place to ensure consistency
     5	 * across the entire application when working with OneRoster assessment line items.
     6	 */
     7
     8	/**
     9	 * Converts a resource ID to its corresponding assessment line item ID.
    10	 *
    11	 * @param resourceId - The OneRoster resource sourcedId (e.g., "nice_xa3cbcc67cc56d4a1")
    12	 * @returns The assessment line item sourcedId (e.g., "nice_xa3cbcc67cc56d4a1_ali")
    13	 */
    14	export function getAssessmentLineItemId(resourceId: string): string {
    15		return `${resourceId}_ali`
    16	}
    17
    18	/**
    19	 * Converts an assessment line item ID back to its original resource ID.
    20	 *
    21	 * @param lineItemId - The assessment line item sourcedId (e.g., "nice_xa3cbcc67cc56d4a1_ali")
    22	 * @returns The original resource sourcedId (e.g., "nice_xa3cbcc67cc56d4a1")
    23	 */
    24	export function getResourceIdFromLineItem(lineItemId: string): string {
    25		return lineItemId.replace("_ali", "")
    26	}
    27
    28	/**
    29	 * Checks if a given ID is an assessment line item ID (ends with '_ali').
    30	 *
    31	 * @param id - The ID to check
    32	 * @returns True if the ID appears to be an assessment line item ID
    33	 */
    34	export function isAssessmentLineItemId(id: string): boolean {
    35		return id.endsWith("_ali")
    36	}
    37
    38	/**
    39	 * Converts an array of resource IDs to their corresponding assessment line item IDs.
    40	 *
    41	 * @param resourceIds - Array of resource sourcedIds
    42	 * @returns Array of assessment line item sourcedIds
    43	 */
    44	export function getAssessmentLineItemIds(resourceIds: string[]): string[] {
    45		return resourceIds.map(getAssessmentLineItemId)
    46	}
```


## Assistant

<thinking>


**Noting schema citation**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
     1	import { z } from "zod"
     2
     3	/**
     4	 * Defines the canonical structure for metadata stored with an assessment result in the gradebook.
     5	 * This schema is the single source of truth for validating and creating result metadata.
     6	 * Required fields have no defaults to enforce explicit calculation.
     7	 */
     8	export const AssessmentResultMetadataSchema = z
     9		.object({
    10			masteredUnits: z.number().int(),
    11			totalQuestions: z.number().int(),
    12			correctQuestions: z.number().int(),
    13			accuracy: z.number().int().min(0).max(100),
    14			xp: z.number().int(),
    15			multiplier: z.number(),
    16			attempt: z.number().int().optional(),
    17			startedAt: z.string().datetime().optional(),
    18			completedAt: z.string().datetime(),
    19			// Optional per-content metadata
    20			// nice_timeSpent captures watched seconds for passive content (e.g., video)
    21			nice_timeSpent: z.number().int().optional(),
    22			lessonType: z.string().optional(),
    23			courseSourcedId: z.string(),
    24			durationInSeconds: z.number().optional(),
    25			penaltyApplied: z.boolean(),
    26			xpReason: z.string()
    27		})
    28		.refine((data) => !(data.penaltyApplied && !data.xpReason), {
    29			message: "xpReason must be provided when a penalty is applied."
    30		})
    31
    32	export type AssessmentResultMetadata = z.infer<typeof AssessmentResultMetadataSchema>
```


## Assistant

<thinking>


**Noting function usage relationships**
</thinking>

**Tool Call: Read oneroster.ts**
Status: Completed

```ts
  1700		/**
  1701		 * Creates or updates an Assessment Result.
  1702		 * @param sourcedId The unique identifier for the result.
  1703		 * @param payload The result data.
  1704		 * @returns The created or updated result.
  1705		 */
  1706		async putResult(
  1707			sourcedId: string,
  1708			payload: { result: z.infer<typeof CreateResultInputSchema>["result"] }
  1709		): Promise<AssessmentResult> {
  1710			const validation = CreateResultInputSchema.safeParse(payload)
  1711			if (!validation.success) {
  1712				logger.error("putResult input validation failed", { sourcedId, payload, error: validation.error })
  1713				throw errors.wrap(validation.error, "putResult input validation")
  1714			}
  1715
  1716			const response = await this.#request(
  1717				`/ims/oneroster/gradebook/v1p2/assessmentResults/${sourcedId}`,
  1718				{
  1719					method: "PUT",
  1720					headers: { "Content-Type": "application/json" },
  1721					body: JSON.stringify({ assessmentResult: validation.data.result })
  1722				},
  1723				z.object({ assessmentResult: AssessmentResultSchema })
  1724			)
  1725
  1726			if (!response?.assessmentResult) {
  1727				logger.error("invalid response from putResult", { sourcedId, response })
  1728				throw errors.new("invalid response from putResult")
  1729			}
  1730
  1731			return response.assessmentResult
  1732		}
  1733
  1734		/**
  1735		 * Retrieves a specific Assessment Result by its identifier.
  1736		 * @param {string} sourcedId - The unique identifier of the assessment result.
  1737		 * @returns {Promise<AssessmentResult | null>} The assessment result object, or null if not found.
  1738		 */
  1739		async getResult(sourcedId: string): Promise<AssessmentResult | null> {
  1740			logger.info("oneroster: getting assessment result", { sourcedId })
  1741
  1742			const GetResultResponseSchema = z.object({
  1743				assessmentResult: AssessmentResultSchema.optional()
  1744			})
  1745
  1746			const response = await this.#request(
  1747				`/ims/oneroster/gradebook/v1p2/assessmentResults/${sourcedId}`,
  1748				{ method: "GET" },
  1749				GetResultResponseSchema,
  1750				{ swallow404: true } // Return null if not found
```


## Assistant

<thinking>


**Referencing attempt service features**
</thinking>

**Tool Call: Read attempt.ts**
Status: Completed

```ts
     1	import * as errors from "@superbuilders/errors"
     2	import * as logger from "@superbuilders/slog"
     3	import { oneroster } from "@/lib/clients"
     4	import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
     5	import { filterInteractiveAttemptResults } from "@/lib/utils/assessment-results"
     6
     7	/**
     8	 * Service for managing assessment attempt numbers.
     9	 * This module is responsible for determining the next attempt number
    10	 * for a user's assessment based on their previous attempts.
    11	 */
    12
    13	/**
    14	 * Computes the next attempt number for a user's assessment.
    15	 * Queries OneRoster to find existing attempts and returns the next sequential number.
    16	 *
    17	 * @param userSourcedId - The OneRoster user sourcedId
    18	 * @param resourceSourcedId - The OneRoster resource sourcedId
    19	 * @returns The next attempt number (1-based)
    20	 */
    21	export async function getNext(userSourcedId: string, resourceSourcedId: string): Promise<number> {
    22		logger.info("computing next attempt number from oneroster", {
    23			userSourcedId,
    24			resourceSourcedId
    25		})
    26
    27		const lineItemId = getAssessmentLineItemId(resourceSourcedId)
    28		const filter = `status='active' AND student.sourcedId='${userSourcedId}' AND assessmentLineItem.sourcedId='${lineItemId}'`
    29		const resultsResult = await errors.try(oneroster.getAllResults({ filter }))
    30		if (resultsResult.error) {
    31			logger.error("failed to fetch results for attempt derivation", {
    32				error: resultsResult.error,
    33				lineItemId
    34			})
    35			// Fail fast per no-fallbacks policy
    36			throw errors.wrap(resultsResult.error, "attempt number derivation")
    37		}
    38
    39		// Use the centralized utility to filter results
    40		if (!Array.isArray(resultsResult.data)) {
    41			logger.error("invalid oneroster results shape for attempt derivation", { lineItemId })
    42			throw errors.new("attempt number derivation: invalid results shape")
    43		}
    44		const validAttempts = filterInteractiveAttemptResults(resultsResult.data, userSourcedId, lineItemId)
    45
    46		const count = validAttempts.length
    47		const nextAttempt = count + 1
    48		logger.info("derived next attempt number", { lineItemId, existingResults: count, nextAttempt })
    49
    50		return nextAttempt
    51	}
```


## Assistant

<thinking>


**Noting citation for filterInteractiveAttemptResults**
</thinking>

**Tool Call: Read assessment-results.ts**
Status: Completed

```ts
     1	import type { AssessmentResult } from "@/lib/oneroster"
     2
     3	/**
     4	 * Checks if a result's sourcedId strictly matches the attempt-based ID pattern
     5	 * for interactive assessments (Quizzes, Tests, Exercises).
     6	 *
     7	 * Pattern: `nice_${userSourcedId}_${lineItemId}_attempt_${n}`
     8	 *
     9	 * This is the single source of truth for identifying interactive assessment attempts.
    10	 *
    11	 * @param result The OneRoster result object.
    12	 * @param userSourcedId The OneRoster user sourcedId.
    13	 * @param lineItemId The OneRoster assessment line item sourcedId.
    14	 * @returns True if the result matches the interactive attempt pattern.
    15	 */
    16	export function isInteractiveAttemptResult(
    17		result: AssessmentResult,
    18		userSourcedId: string,
    19		lineItemId: string
    20	): boolean {
    21		const id = result.sourcedId
    22		if (typeof id !== "string") {
    23			return false
    24		}
    25
    26		const baseIdPrefix = `nice_${userSourcedId}_${lineItemId}_attempt_`
    27		if (!id.startsWith(baseIdPrefix)) {
    28			return false
    29		}
    30
    31		const suffix = id.slice(baseIdPrefix.length)
    32		return /^\d+$/.test(suffix)
    33	}
    34
    35	/**
    36	 * Checks if a result's sourcedId strictly matches the base ID pattern for
    37	 * passive content (Articles, Videos).
    38	 *
    39	 * Pattern: `nice_${userSourcedId}_${lineItemId}`
    40	 *
    41	 * @param result The OneRoster result object.
    42	 * @param userSourcedId The OneRoster user sourcedId.
    43	 * @param lineItemId The OneRoster assessment line item sourcedId.
    44	 * @returns True if the result matches the passive content pattern.
    45	 */
    46	export function isPassiveContentResult(result: AssessmentResult, userSourcedId: string, lineItemId: string): boolean {
    47		const id = result.sourcedId
    48		if (typeof id !== "string") {
    49			return false
    50		}
    51
    52		const baseId = `nice_${userSourcedId}_${lineItemId}`
    53		return id === baseId
    54	}
    55
    56	/**
    57	 * Filters a list of OneRoster results to find only those matching the strict,
    58	 * attempt-based ID pattern for a specific user and line item.
    59	 *
    60	 * @param results An array of OneRoster results.
    61	 * @param userSourcedId The OneRoster user sourcedId.
    62	 * @param lineItemId The OneRoster assessment line item sourcedId.
    63	 * @returns A filtered array of results representing interactive attempts.
    64	 */
    65	export function filterInteractiveAttemptResults(
    66		results: AssessmentResult[],
    67		userSourcedId: string,
    68		lineItemId: string
    69	): AssessmentResult[] {
    70		return results.filter((r) => isInteractiveAttemptResult(r, userSourcedId, lineItemId))
    71	}
    72
    73	/**
    74	 * Finds the most recent, valid assessment result for an *interactive assessment*
    75	 * from a list, based on scoreDate.
    76	 *
    77	 * @param allUserResults An array of all results for a user.
    78	 * @param userSourcedId The OneRoster user sourcedId.
    79	 * @param lineItemId The specific OneRoster assessment line item sourcedId to check.
    80	 * @returns The latest result object for that line item, or undefined if none found.
    81	 */
    82	export function findLatestInteractiveAttempt(
    83		allUserResults: AssessmentResult[],
    84		userSourcedId: string,
    85		lineItemId: string
    86	): AssessmentResult | undefined {
    87		const validAttempts = filterInteractiveAttemptResults(allUserResults, userSourcedId, lineItemId)
    88
    89		if (validAttempts.length === 0) {
    90			return undefined
    91		}
    92
    93		// Sort by scoreDate descending to find the most recent result.
    94		const sortedAttempts = [...validAttempts].sort(
    95			(a, b) => new Date(b.scoreDate || 0).getTime() - new Date(a.scoreDate || 0).getTime()
    96		)
    97
    98		return sortedAttempts[0]
    99	}
```


## Assistant

<thinking>


**Noting key components for explanation**
</thinking>

**Tool Call: Search prepareInteractiveAssessment**
Status: Completed

```sh
src/lib/data/assessment.ts:2:// PowerPath removed; attempt number derived via server action in prepareInteractiveAssessment
src/lib/data/fetchers/interactive-helpers.ts:13:import { prepareInteractiveAssessment } from "@/lib/interactive-assessments"
src/lib/data/fetchers/interactive-helpers.ts:233:	const preparedAssessment = await prepareInteractiveAssessment({
src/lib/interactive-assessments.ts:15:export async function prepareInteractiveAssessment(options: PrepareOptions): Promise<{
```


**Tool Call: Read interactive-assessments.ts**
Status: Completed

```ts
//
import { getNextAttemptNumber } from "@/lib/actions/assessment"
import type { AssessmentTest, TestQuestionsResponse } from "@/lib/qti"
import { applyQtiSelectionAndOrdering } from "@/lib/qti-selection"
import type { Question } from "@/lib/types/domain"

interface PrepareOptions {
	userSourceId: string
	resourceSourcedId: string
	componentResourceSourcedId: string
	assessmentTest: AssessmentTest
	resolvedQuestions: TestQuestionsResponse["questions"]
}

export async function prepareInteractiveAssessment(options: PrepareOptions): Promise<{
	questions: Question[]
	attemptNumber: number
}> {
	const { userSourceId, resourceSourcedId, assessmentTest, resolvedQuestions } = options

	// 1) Derive attempt number purely from OneRoster results history via server action
	const attemptNumber = await getNextAttemptNumber(userSourceId, resourceSourcedId)

	// 3) Always select deterministically based on QTI structure
	const questions = applyQtiSelectionAndOrdering(assessmentTest, resolvedQuestions, {
		baseSeed: `${userSourceId}:${resourceSourcedId}`,
		attemptNumber,
		userSourceId,
		resourceSourcedId
	})

	return { questions, attemptNumber }
}
```


## Assistant

<thinking>


**Summarizing assessment flow and components**

This is a rich overview of the assessment flow, covering front-end stepper usage, Redis progress state with TTL and key structures, and how server actions update or reset this state. It also connects attempt numbering via OneRoster results. Finalization includes building and saving assessment results with metadata fields like XP and penalties, plus how source IDs like `onerosterResourceSourcedId` link quiz components and support XP awarding and proficiency updates. References to key files and lines, as well as interactions with caching and analytics watchers, are planned to provide a clear, structured explanation with bullet points.
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
   460
   461		return { state, isCorrect }
   462	}
   463
   464	/**
   465	 * Skips the current question, marking it as INCORRECT
   466	 *
   467	 * This action records the question with `isCorrect: false` in the Redis state.
   468	 * The question will count towards the denominator (total questions) and will
   469	 * negatively impact the final score, which is consistent with the user-facing
   470	 * messaging. This behavior is distinct from reporting a question.
   471	 *
   472	 * @returns An object containing the new, advanced `AssessmentState`.
   473	 */
   474	export async function skipQuestion(
   475		onerosterResourceSourcedId: string,
   476		questionId: string,
   477		questionIndex: number
   478	): Promise<{ state: AssessmentState }> {
   479		const { userId } = await auth()
   480		if (!userId) {
   481			logger.error("skipQuestion failed: user not authenticated")
   482			throw errors.new("user not authenticated")
   483		}
   484		const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
   485		const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
   486		const state = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
   487		if (!state) {
   488			logger.error("assessment state not found for skip", {
   489				onerosterUserSourcedId,
   490				onerosterResourceSourcedId,
   491				attemptNumber
   492			})
   493			throw ErrAssessmentStateNotFound
   494		}
   495		if (state.currentQuestionIndex !== questionIndex) {
   496			logger.error("out-of-order skip", { currentIndex: state.currentQuestionIndex, submittedIndex: questionIndex })
   497			throw errors.new("out-of-order skip")
   498		}
   499
   500		const questionList = await getDeterministicQuestionList(
   501			onerosterUserSourcedId,
   502			onerosterResourceSourcedId,
   503			state.attemptNumber
   504		)
   505		if (questionList[questionIndex]?.id !== questionId) {
   506			logger.error("question id mismatch on skip", {
   507				expectedId: questionList[questionIndex]?.id,
   508				receivedId: questionId,
   509				questionIndex
   510			})
   511			throw errors.new("question id mismatch")
   512		}
   513
   514		// This is the key business logic change. A skipped question is an incorrect question.
   515		const skipState: AssessmentQuestionState = { isCorrect: false, response: null, isReported: false }
   516		await updateStateAndQuestion(
   517			onerosterUserSourcedId,
   518			onerosterResourceSourcedId,
   519			state.attemptNumber,
   520			questionIndex,
```


## Assistant

<thinking>


**Noting reportQuestion usage**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
   520			questionIndex,
   521			skipState
   522		)
   523
   524		// Update local state
   525		state.questions[questionIndex] = skipState
   526		state.currentQuestionIndex = questionIndex + 1
   527
   528		logger.info("question skipped", { questionId, questionIndex })
   529		return { state }
   530	}
   531
   532	/**
   533	 * Reports an issue with a question and advances the user past it, EXCLUDING it from the final score.
   534	 *
   535	 * This action implements the "report and skip" business logic:
   536	 * 1. It atomically updates the question's state in Redis, setting `isReported: true` and `isCorrect: null`.
   537	 * 2. It advances the `currentQuestionIndex`, removing the question from the user's active assessment path.
   538	 * 3. It then flags the question in an external service with the user's report.
   539	 *
   540	 * During finalization, any question with `isReported: true` or `isCorrect: null` is
   541	 * excluded from both the numerator (correct answers) and the denominator (total questions) of the score.
   542	 *
   543	 * @returns An object containing the new, advanced `AssessmentState`.
   544	 */
   545	export async function reportQuestion(
   546		onerosterResourceSourcedId: string,
   547		questionId: string,
   548		questionIndex: number,
   549		report: string
   550	): Promise<{ state: AssessmentState }> {
   551		const { userId } = await auth()
   552		if (!userId) {
   553			logger.error("reportQuestion failed: user not authenticated")
   554			throw errors.new("user not authenticated")
   555		}
   556		const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
   557		const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
   558
   559		const currentState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
   560		if (!currentState) {
   561			logger.error("assessment state not found for report", {
   562				onerosterUserSourcedId,
   563				onerosterResourceSourcedId,
   564				attemptNumber
   565			})
   566			throw ErrAssessmentStateNotFound
   567		}
   568
   569		// Prepare the updated question state. A reported question is neither correct nor incorrect for scoring purposes.
   570		const existingQuestionState = currentState.questions[questionIndex]
   571		const updatedQuestionState: AssessmentQuestionState = {
   572			...existingQuestionState,
   573			isCorrect: null, // Always nullify correctness when reported to exclude from scoring.
   574			response: existingQuestionState?.response ?? null,
   575			isReported: true
   576		}
   577
   578		// CRITICAL: First, update the user's state in Redis to ensure they are unblocked and their progress is saved.
   579		const updateResult = await errors.try(
   580			updateStateAndQuestion(
   581				onerosterUserSourcedId,
   582				onerosterResourceSourcedId,
   583				currentState.attemptNumber,
   584				questionIndex,
   585				updatedQuestionState,
   586				true // Overwrite any existing state for this question.
   587			)
   588		)
   589		if (updateResult.error) {
   590			logger.error("failed to update redis state for reported question", {
   591				error: updateResult.error,
   592				questionId,
   593				questionIndex
   594			})
   595			throw errors.wrap(updateResult.error, "update redis state for reported question")
   596		}
   597
   598		// NON-CRITICAL: After the user's state is secured, call the external reporting service.
   599		// A failure here is logged but does not affect the user's experience.
   600		const flagResult = await errors.try(flagQuestionAsReported(questionId, report))
   601		if (flagResult.error) {
   602			logger.error("non-critical: failed to flag question in external service after state update", {
   603				error: flagResult.error,
   604				questionId
   605			})
   606		} else {
   607			logger.info("question reported to external service", { questionId })
   608		}
   609
   610		// Fetch and return the latest state to ensure the client UI is consistent.
   611		const newState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
   612		if (!newState) {
   613			logger.error("failed to get state after reporting question", {
   614				onerosterUserSourcedId,
   615				onerosterResourceSourcedId,
   616				attemptNumber
   617			})
   618			throw ErrAssessmentStateNotFound
   619		}
   620
   621		return { state: newState }
   622	}
   623
   624	/**
   625	 * Computes the next attempt number for a user on an assessment resource using OneRoster.
   626	 * Attempt number is defined as 1 + count of existing AssessmentResults for the line item.
   627	 */
   628	export const getNextAttemptNumber = attempt.getNext
   629
   630	/**
   631	 * Checks if a user has already achieved proficiency (80%+) on an assessment.
   632	 * This is used to prevent XP farming by checking BEFORE saving a new result.
   633	 *
   634	 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
   635	 * @param onerosterAssessmentSourcedId - The OneRoster assessment resource sourcedId
   636	 * @returns Whether the user is already proficient (true) or not (false)
   637	 */
   638	export async function checkExistingProficiency(onerosterAssessmentSourcedId: string): Promise<boolean> {
   639		const { userId } = await auth()
   640		if (!userId) {
```


## Assistant

<thinking>


**Referencing startNewAssessmentAttempt**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
  1000		logger.info("successfully flagged question as reported", { clerkUserId, questionId })
  1001		return { success: true }
  1002	}
  1003
  1004	/**
  1005	 * Clears the current assessment state from Redis for a user, allowing getOrCreateAssessmentState
  1006	 * to generate a new attempt on the next page load.
  1007	 *
  1008	 * CRITICAL BUSINESS LOGIC:
  1009	 * This action clears ANY existing assessment state from Redis, regardless of finalization status.
  1010	 * The purpose is to clear the way for a new attempt. Since Redis is our ephemeral progress cache
  1011	 * and finalized attempts are already persisted in OneRoster (the source of truth), it's safe
  1012	 * to clear even finalized states from Redis. This makes the action's behavior consistent and
  1013	 * less brittle - it always succeeds in clearing the way for a new attempt.
  1014	 *
  1015	 * @param onerosterResourceSourcedId - The OneRoster resource ID for the assessment
  1016	 * @returns Success status (always true unless an error occurs)
  1017	 */
  1018	export async function startNewAssessmentAttempt(onerosterResourceSourcedId: string): Promise<{ success: boolean }> {
  1019		const { userId } = await auth()
  1020		if (!userId) {
  1021			logger.error("startNewAssessmentAttempt failed: user not authenticated")
  1022			throw errors.new("user not authenticated")
  1023		}
  1024		const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
  1025		const attemptNumber = await getNextAttemptNumber(onerosterUserSourcedId, onerosterResourceSourcedId)
  1026
  1027		const existingState = await getAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
  1028
  1029		// FIX: Remove the !existingState.isFinalized check.
  1030		// The purpose of this action is to clear the way for a new attempt.
  1031		// If a state exists in Redis (our ephemeral progress cache), it should be cleared.
  1032		// The finalized attempt is already persisted in OneRoster, which is the source of truth.
  1033		// This makes the action's behavior consistent and less brittle.
  1034		if (existingState) {
  1035			await deleteAssessmentState(onerosterUserSourcedId, onerosterResourceSourcedId, attemptNumber)
  1036			logger.info("cleared previous assessment state to start new one", {
  1037				onerosterUserSourcedId,
  1038				onerosterResourceSourcedId,
  1039				attemptNumber,
  1040				wasFinalized: existingState.isFinalized
  1041			})
  1042			return { success: true }
  1043		}
  1044
  1045		// If no state exists, there's nothing to do.
  1046		return { success: true }
  1047	}
```


## Assistant

<thinking>


**Planning detailed code references**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
    20	import { assertNoEncodedColons } from "@/lib/utils"
    21	import { findAssessmentRedirectPath } from "@/lib/utils/assessment-redirect"
    22	import { fetchCoursePageData } from "./course"
    23	import { fetchLessonLayoutData } from "./lesson"
    24
    25	export const applyQtiSelectionAndOrdering = applyQtiSelectionAndOrderingCommon
    26
    27	export async function fetchQuizPageData(params: {
    28		subject: string
    29		course: string
    30		unit: string
    31		lesson: string
    32		quiz: string
    33	}): Promise<QuizPageData> {
    34		const layoutData = await fetchLessonLayoutData(params)
    35
    36		// Defensive check: middleware should have normalized URLs
    37		assertNoEncodedColons(params.quiz, "fetchQuizPageData quiz parameter")
    38		logger.info("fetchQuizPageData called", { params })
    39
    40		const resource = await findAndValidateResource(params.quiz, "Quiz")
    41		const componentResource = await findComponentResourceWithContext(resource.sourcedId, layoutData.unitData.id)
    42		const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
    43		const questions = await prepareUserQuestionSet({
    44			resourceSourcedId: resource.sourcedId,
    45			componentResourceSourcedId: componentResource.sourcedId,
    46			assessmentTest,
    47			resolvedQuestions
    48		})
    49
    50		const resourceMetadata = resource.metadata
    51
    52		return {
    53			quiz: {
    54				id: resource.sourcedId,
    55				componentResourceSourcedId: componentResource.sourcedId,
    56				onerosterCourseSourcedId: layoutData.courseData.id,
    57				title: resource.title,
    58				path: `/${params.subject}/${params.course}/${params.unit}/${params.lesson}/quiz/${resourceMetadata.khanSlug}`,
    59				description: resourceMetadata.khanDescription,
    60				type: "Quiz" as const,
    61				expectedXp: resourceMetadata.xp
    62			},
    63			questions,
    64			layoutData
    65		}
    66	}
    67
    68	export async function fetchUnitTestPageData(params: {
    69		subject: string
    70		course: string
    71		unit: string
    72		lesson: string
    73		test: string
    74	}): Promise<UnitTestPageData> {
    75		const layoutData = await fetchLessonLayoutData(params)
    76
    77		// Defensive check: middleware should have normalized URLs
    78		assertNoEncodedColons(params.test, "fetchUnitTestPageData test parameter")
    79		logger.info("fetchUnitTestPageData called", { params })
    80
    81		const resource = await findAndValidateResource(params.test, "UnitTest")
    82		const componentResource = await findComponentResourceWithContext(resource.sourcedId, layoutData.unitData.id)
    83		const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
    84		const questions = await prepareUserQuestionSet({
    85			resourceSourcedId: resource.sourcedId,
    86			componentResourceSourcedId: componentResource.sourcedId,
    87			assessmentTest,
    88			resolvedQuestions
    89		})
    90
    91		const resourceMetadata = resource.metadata
    92
    93		return {
    94			test: {
    95				id: resource.sourcedId,
    96				componentResourceSourcedId: componentResource.sourcedId,
    97				onerosterCourseSourcedId: layoutData.courseData.id,
    98				title: resource.title,
    99				path: `/${params.subject}/${params.course}/${params.unit}/${params.lesson}/test/${resourceMetadata.khanSlug}`,
   100				description: resourceMetadata.khanDescription,
   101				type: "UnitTest" as const,
   102				expectedXp: resourceMetadata.xp
   103			},
   104			questions,
   105			layoutData
   106		}
   107	}
   108
   109	export async function fetchCourseChallengePage_TestData(params: {
   110		test: string
   111		course: string
   112		subject: string
   113	}): Promise<CourseChallengePageData> {
   114		logger.info("fetchCourseChallengePage_TestData called", { params })
   115
   116		const { resource, componentResource } = await findCourseChallenge(params)
   117		const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
   118		const questions = await prepareUserQuestionSet({
   119			resourceSourcedId: resource.sourcedId,
   120			componentResourceSourcedId: componentResource.sourcedId,
   121			assessmentTest,
   122			resolvedQuestions
   123		})
   124
   125		// Course Challenges require fetching some top-level course data.
   126		const { course } = await fetchCoursePageData(
   127			{ subject: params.subject, course: params.course },
   128			{ skip: { questions: true } }
   129		)
   130
   131		const resourceMetadata = resource.metadata
   132
   133		return {
   134			test: {
   135				id: resource.sourcedId,
   136				componentResourceSourcedId: componentResource.sourcedId,
   137				onerosterCourseSourcedId: course.id,
   138				type: "CourseChallenge",
   139				title: resource.title,
   140				slug: params.test,
```


## Assistant

<thinking>


**Identifying key method roles**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
    80		responseIdentifier: string,
    81		onerosterComponentResourceSourcedId?: string,
    82		isInteractiveAssessment?: boolean,
    83		assessmentAttemptNumber?: number
    84	) {
    85		const { userId } = await auth()
    86		if (!userId) {
    87			logger.error("processQuestionResponse failed: user not authenticated")
    88			throw errors.new("user not authenticated")
    89		}
    90		const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
    91		logger.debug("processing question response", {
    92			qtiItemId,
    93			responseIdentifier,
    94			onerosterUserSourcedId,
    95			onerosterComponentResourceSourcedId,
    96			isInteractiveAssessment,
    97			assessmentAttemptNumber
    98		})
    99
   100		// Fetch authoritative response declarations to validate identifiers
   101		/**
   102		 * IMPORTANT: Temporary compatibility with AE Studios' OTI/QTI service
   103		 *
   104		 * We currently rely on the provider's JSON representation of assessment items
   105		 * (e.g., `responseDeclarations` on the GET /assessment-items/:id response) to
   106		 * derive the set of declared response identifiers for validation and filtering.
   107		 * This is necessary to harden against the iframe/player emitting undeclared
   108		 * identifiers (e.g., a stray "RESPONSE").
   109		 *
   110		 * TODO(migration): When we migrate off the current AE Studios implementation
   111		 * of OTI/QTI, REWRITE this logic to parse the raw XML (`rawXml`) directly
   112		 * to extract response declarations, their identifiers, cardinalities, and
   113		 * base types. Do not depend on provider-specific JSON shapes. The XML parse
   114		 * must be the single source of truth to avoid vendor lock-in and drift.
   115		 *
   116		 * Migration acceptance criteria:
   117		 * - Parse <qti-response-declaration> nodes from XML and compute `allowedIds`
   118		 * - Respect record vs single/multiple/ordered cardinality for how we submit
   119		 * - Keep unknown identifiers strictly rejected (no fallbacks)
   120		 * - Preserve the behavior documented by tests in
   121		 *   `tests/actions/assessment/response-filtering.test.ts`
   122		 */
   123		const itemResult = await errors.try(qti.getAssessmentItem(qtiItemId))
   124		if (itemResult.error) {
   125			logger.error("failed to get qti assessment item for response processing", { error: itemResult.error, qtiItemId })
   126			throw errors.wrap(itemResult.error, "qti get assessment item")
   127		}
   128		const declarations = itemResult.data.responseDeclarations ?? []
   129		const allowedIds = new Set(declarations.map((d) => d.identifier))
   130		if (allowedIds.size === 0) {
   131			logger.error("qti item has no response declarations", { qtiItemId })
   132			throw errors.new("qti item: no response declarations")
   133		}
   134
   135		// Handle fill-in-the-blank questions with multiple responses
   136		if (typeof selectedResponse === "object" && !Array.isArray(selectedResponse) && selectedResponse !== null) {
   137			const originalEntries = Object.entries(selectedResponse)
   138			const responseEntries = originalEntries.filter(([id]) => allowedIds.has(id))
   139
   140			logger.info("processing multi-input question", {
   141				qtiItemId,
   142				responseCount: responseEntries.length,
   143				responseIdentifiers: responseEntries.map(([id]) => id),
   144				ignoredIdentifiers: originalEntries.filter(([id]) => !allowedIds.has(id)).map(([id]) => id)
   145			})
   146
   147			if (responseEntries.length === 0) {
   148				logger.error("no declared response identifiers present in selected response", {
   149					qtiItemId,
   150					allowedIdentifiers: Array.from(allowedIds),
   151					originalIdentifiers: originalEntries.map(([id]) => id)
   152				})
   153				throw errors.new("no declared response identifiers")
   154			}
   155
   156			const results = await Promise.all(
   157				responseEntries.map(async ([identifier, value]) => {
   158					const normalizedValue = Array.isArray(value) ? value : String(value)
   159					const result = await errors.try(
   160						qti.processResponse(qtiItemId, {
```


## Assistant

<thinking>


**Referencing function location**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
    40	 *
    41	 * In this file, we use OneRoster's correct terminology in our function parameters
    42	 * (onerosterComponentResourceSourcedId) but pass it to PowerPath's "lesson" field.
    43	 */
    44
    45	/**
    46	 * Retrieves a deterministic list of questions for an assessment based on user, assessment, and attempt.
    47	 * This ensures the same questions are shown for a specific attempt, even after page refresh.
    48	 */
    49	async function getDeterministicQuestionList(
    50		userSourcedId: string,
    51		assessmentResourceSourcedId: string,
    52		attemptNumber: number
    53	): Promise<Question[]> {
    54		const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(assessmentResourceSourcedId)
    55
    56		const questions = applyQtiSelectionAndOrdering(assessmentTest, resolvedQuestions, {
    57			baseSeed: `${userSourcedId}:${assessmentResourceSourcedId}`,
    58			attemptNumber,
    59			userSourceId: userSourcedId,
    60			resourceSourcedId: assessmentResourceSourcedId
    61		})
    62
    63		return questions
    64	}
    65
    66	/**
    67	 * Processes a question response using the QTI API.
    68	 * This server action wraps the API calls that should never be called from client components.
    69	 *
    70	 * @param qtiItemId - The QTI assessment item ID (e.g., nice_question123)
    71	 * @param selectedResponse - The user's selected response
    72	 * @param responseIdentifier - The identifier for the response being submitted
    73	 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId - used by PowerPath
    74	 * @param isInteractiveAssessment - Whether this is a quiz or test (vs exercise)
    75	 * @param assessmentAttemptNumber - The attempt number (0 = first attempt)
    76	 */
    77	export async function processQuestionResponse(
    78		qtiItemId: string,
    79		selectedResponse: string | unknown[] | Record<string, unknown>,
    80		responseIdentifier: string,
    81		onerosterComponentResourceSourcedId?: string,
    82		isInteractiveAssessment?: boolean,
    83		assessmentAttemptNumber?: number
    84	) {
    85		const { userId } = await auth()
    86		if (!userId) {
    87			logger.error("processQuestionResponse failed: user not authenticated")
    88			throw errors.new("user not authenticated")
    89		}
    90		const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
    91		logger.debug("processing question response", {
    92			qtiItemId,
    93			responseIdentifier,
    94			onerosterUserSourcedId,
    95			onerosterComponentResourceSourcedId,
    96			isInteractiveAssessment,
    97			assessmentAttemptNumber
    98		})
    99
   100		// Fetch authoritative response declarations to validate identifiers
   101		/**
   102		 * IMPORTANT: Temporary compatibility with AE Studios' OTI/QTI service
   103		 *
   104		 * We currently rely on the provider's JSON representation of assessment items
   105		 * (e.g., `responseDeclarations` on the GET /assessment-items/:id response) to
   106		 * derive the set of declared response identifiers for validation and filtering.
   107		 * This is necessary to harden against the iframe/player emitting undeclared
   108		 * identifiers (e.g., a stray "RESPONSE").
   109		 *
   110		 * TODO(migration): When we migrate off the current AE Studios implementation
   111		 * of OTI/QTI, REWRITE this logic to parse the raw XML (`rawXml`) directly
   112		 * to extract response declarations, their identifiers, cardinalities, and
   113		 * base types. Do not depend on provider-specific JSON shapes. The XML parse
   114		 * must be the single source of truth to avoid vendor lock-in and drift.
   115		 *
   116		 * Migration acceptance criteria:
   117		 * - Parse <qti-response-declaration> nodes from XML and compute `allowedIds`
   118		 * - Respect record vs single/multiple/ordered cardinality for how we submit
   119		 * - Keep unknown identifiers strictly rejected (no fallbacks)
   120		 * - Preserve the behavior documented by tests in
```


## Assistant

<thinking>


**Summarizing assessment progress and finalization design**

I'm organizing a detailed explanation into four sections covering how the assessment stepper lifecycle flows from front-end to server, how Redis caches and manages state, how final results write to OneRoster with metadata and XP handling, and key considerations for metadata, attempt numbering, and verification. Each section includes concise bullets referencing key functions, data flows, and interaction points across the codebase like `AssessmentStepper`, state caching, result ID generation, and gradebook saving. I’m preparing a clear, structured summary with practical next-step suggestions for verification and testing.
</thinking>

**Stepper Lifecycle**
- Assessment data loaders hand the stepper the OneRoster resource id (`quiz.id`), componentResource id, and course id so the client knows which backend objects it is driving (`src/lib/data/assessment.ts:40`, `src/lib/data/assessment.ts:53`).
- On mount the stepper fetches `getOrCreateAssessmentState`, keeps the client index aligned with Redis, and immediately calls `finalizeAssessment` once Redis says all questions are answered (`src/components/practice/assessment-stepper.tsx:362`, `src/components/practice/assessment-stepper.tsx:405`).
- `getOrCreateAssessmentState` derives the attempt number from existing OneRoster results before either hydrating or creating Redis state and its deterministic question order (`src/lib/actions/assessment.ts:232`, `src/lib/actions/assessment.ts:258`).
- Question interactions use server actions—`submitAnswer`, `skipQuestion`, `reportQuestion`—which validate the expected QTI item and atomically advance progress so only the first graded submission is ever stored (`src/lib/actions/assessment.ts:279`, `src/lib/actions/assessment.ts:474`, `src/lib/actions/assessment.ts:545`).
- Pure-feedback attempts go through `processQuestionResponse`, which enforces QTI response declarations while leaving Redis untouched (`src/lib/actions/assessment.ts:77`, `src/lib/actions/assessment.ts:123`).
- Retakes clear the cached attempt but rely on OneRoster as the record of finalized tries, keeping Redis purely ephemeral (`src/lib/actions/assessment.ts:1018`).

**Redis State**
- `AssessmentState` documents the attempt metadata, question hash, and optional final summary under `assess:state:{user}:{resource}:{attempt}` with a one-week TTL refreshed on reads (`src/lib/assessment-cache.ts:6`, `src/lib/assessment-cache.ts:145`).
- `createAssessmentState` seeds the structure, while `updateStateAndQuestion` uses WATCH/MULTI to set the per-question JSON blob and increment `currentQuestionIndex` (`src/lib/assessment-cache.ts:151`, `src/lib/assessment-cache.ts:200`).
- Reporting a question overwrites the stored entry with `isCorrect: null` so final scoring excludes it but progress still advances (`src/lib/actions/assessment.ts:569`).
- `markAssessmentFinalized` persists the calculated summary and flips `isFinalized`, and `markAssessmentFinalizationFailed` records error text the UI can surface on retry (`src/lib/assessment-cache.ts:284`, `src/lib/assessment-cache.ts:366`).
- TTL-managed hashes mean stale attempts evaporate automatically, ensuring Redis only mirrors in-flight or very recent work (`src/lib/assessment-cache.ts:6`).

**OneRoster Write Path**
- `finalizeAssessment` rebuilds the authoritative question list, filters reported items, computes score/duration, and assembles the `SaveAssessmentResultCommand` with subject/course slugs and Clerk metadata (`src/lib/actions/assessment.ts:721`, `src/lib/actions/assessment.ts:848`).
- Attempt numbers always come from OneRoster history via `getNextAttemptNumber`, which is also used while building the question set so Redis, QTI selection, and gradebook share the same counter (`src/lib/services/attempt.ts:21`, `src/lib/interactive-assessments.ts:18`).
- Result ids follow `nice_{user}_{lineItem}_attempt_{n}` and the target assessment line item id is just the resource id with `_ali`, which is how the gradebook groups quiz and exercise attempts (`src/lib/utils/assessment-identifiers.ts:26`, `src/lib/utils/assessment-line-items.ts:14`).
- The assessment service awards XP, crafts the grade comment, and captures metadata including accuracy, XP totals, attempt number, duration, course id, and lesson type before persisting (`src/lib/services/assessment.ts:32`, `src/lib/services/assessment.ts:79`).
- `gradebook.saveResult` validates metadata against `AssessmentResultMetadataSchema` and performs an idempotent `PUT` to `/assessmentResults/{resultSourcedId}` through the OneRoster client (`src/lib/ports/gradebook.ts:13`, `src/lib/constants/assessment.ts:8`, `src/lib/oneroster.ts:1706`).
- Side effects fan out from the same command—XP banking, proficiency updates, cache invalidation, Caliper analytics—so PowerPath progress queries see the new attempt immediately (`src/lib/services/assessment.ts:112`, `src/lib/services/assessment.ts:142`).

**Key Considerations**
- Reported questions stay in Redis but are omitted from `sessionResults` before grading, so gradebook totals can be smaller than the delivered question count when issues are flagged (`src/lib/actions/assessment.ts:794`, `src/lib/services/assessment.ts:80`).
- Redis only tracks the latest attempt’s first answers; historical attempts live exclusively in OneRoster under the patterned result ids, which is what downstream analytics consume (`src/lib/assessment-cache.ts:248`, `src/lib/actions/assessment.ts:1034`).
- Metadata carries `courseSourcedId`, `lessonType`, and mastered-unit info that PowerPath progress processing uses to render completion states (`src/lib/services/assessment.ts:79`, `src/lib/powerpath-progress.ts:29`).
- To trace an individual completion, fetch the corresponding OneRoster assessment result by the generated sourcedId and compare it with the stored Redis summary for that attempt (`src/lib/oneroster.ts:1739`).

Possible next steps:
1. Pull a recent result id from logs and call `oneroster.getResult` in a REPL to confirm the stored metadata matches the Redis final summary.
2. If you need deeper visibility into in-flight attempts, add temporary logging around `updateStateAndQuestion` to print the exact Redis keys being written.

## User (checkpoint)

great. given this information, can you explain exactly what the bug is in our [@convert-cartridge-to-oneroster.ts](zed:///agent/file?path=%2FUsers%2Fbjorn%2FDocuments%2FCode%2Fnice%2Fscripts%2Fconvert-cartridge-to-oneroster.ts) script? i'm able to step through an entire quiz, but upon the last question, i sumbit and it says "Could not save final result. Please retry.". can you investigate the exact root cause of this bug please? keep in mind this bug only happens with any course generated with our cartridge sccript, any of the "native" nice academy courses based on the database oneroster payload builder does not have this issue. can you investiaget the root cause of this bug, and explain why this bug occurs in our [@convert-cartridge-to-oneroster.ts](zed:///agent/file?path=%2FUsers%2Fbjorn%2FDocuments%2FCode%2Fnice%2Fscripts%2Fconvert-cartridge-to-oneroster.ts) ?

## Assistant

<thinking>


**Analyzing convert-cartridge script bug**
</thinking>

**Tool Call: Read convert-cartridge-to-oneroster.ts**
Status: Completed

```ts
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const getFlag = (name: string) => {
    const idx = args.findIndex((a) => a === `--${name}`)
    return idx >= 0 ? args[idx + 1] : undefined
  }

  const input = getFlag("input")
  const slug = getFlag("slug")
  const courseId = getFlag("course-id")
  const gradesRaw = getFlag("grades")
  // No flags for QTI; both OneRoster and QTI are always emitted

  if (!input || !slug || !courseId || !gradesRaw) {
    process.stderr.write(
      "Usage: convert-cartridge-to-oneroster --input /abs/file.tar.zst --slug <course-slug> --course-id <id> --grades <n[,n,...]>\n"
    )
    process.exit(1)
  }

  const grades = gradesRaw.split(",").map((g) => Number(g.trim()))
  if (grades.some((n) => !Number.isInteger(n) || n < 0 || n > 12)) {
    logger.error("invalid grades", { gradesRaw })
    throw errors.new("grades: must be integers between 0 and 12")
  }

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN
  if (!appDomain || typeof appDomain !== "string") {
    logger.error("CRITICAL: NEXT_PUBLIC_APP_DOMAIN missing or invalid", { NEXT_PUBLIC_APP_DOMAIN: appDomain })
    throw errors.new("configuration: NEXT_PUBLIC_APP_DOMAIN is required")
  }
  const baseDomain = appDomain.replace(/\/$/, "")

  logger.info("qti generation enabled by default")

  logger.info("opening cartridge", { input })
  const readerResult = await errors.try(openCartridgeTarZst(input))
  if (readerResult.error) {
    logger.error("failed to open cartridge", { input, error: readerResult.error })
    throw errors.wrap(readerResult.error, "open cartridge")
  }
  const reader = readerResult.data

  // Read index.json via client helper (package export)
  const indexResult = await errors.try(readIndex(reader))
  if (indexResult.error) {
    logger.error("failed to read index.json", { error: indexResult.error })
    throw errors.wrap(indexResult.error, "read index")
  }
  const indexJson = indexResult.data as IndexV1
  if (!indexJson) {
    logger.error("missing index.json in cartridge")
    throw errors.new("cartridge: index.json missing")
  }

  // Validate presence of required course fields
  if (!indexJson.course?.title || !indexJson.course?.subject) {
    logger.error("index.course missing required fields", { course: indexJson.course })
    throw errors.new("index.course: missing title or subject")
  }

  const courseSourcedId = orCourseId(slug, courseId)
  const classSourcedId = orClassId(slug, courseId)
  const subjectList = mapSubjectToOneRosterSubjects(indexJson.course.subject)
  const subjectRoute = subjectToRouteSegment(indexJson.course.subject)

  const payload: OneRosterPayload = {
    course: {
      sourcedId: courseSourcedId,
      status: "active",
      title: addNiceAcademyPrefix(indexJson.course.title),
      subjects: subjectList,
      grades,
      courseCode: slug,
      org: { sourcedId: ORG_SOURCED_ID, type: "district" },
      academicSession: { sourcedId: ACADEMIC_SESSION_SOURCED_ID, type: "term" },
      metadata: {
        generator: indexJson.generator,
        timebackVisible: "true",
        primaryApp: "nice_academy",
        khanId: courseId,
        khanSlug: slug,
        khanSubjectSlug: subjectRoute,
        khanTitle: indexJson.course.title,
        khanDescription: "",
        AlphaLearn: {
          publishStatus: "active"
        }
      }
    },
    class: {
      sourcedId: classSourcedId,
      status: "active",
      title: addNiceAcademyPrefix(indexJson.course.title),
      classType: "scheduled",
      course: { sourcedId: courseSourcedId, type: "course" },
      school: { sourcedId: ORG_SOURCED_ID, type: "org" },
      terms: [{ sourcedId: ACADEMIC_SESSION_SOURCED_ID, type: "term" }]
    },
    courseComponents: [],
    resources: [],
    componentResources: [],
    assessmentLineItems: []
  }

  const resourceSeen = new Set<string>()
  let totalXp = 0
  let totalLessons = 0

  // QTI generation tracking (always populated)
  type QtiStimulus = { xml: string; metadata?: Record<string, unknown> }
  type QtiItem = { xml: string; metadata?: Record<string, unknown> }
  const qtiStimuli: QtiStimulus[] = []
  const qtiItems: QtiItem[] = []
  const qtiTestsXml: string[] = []
  const exerciseToItemIds = new Map<string, string[]>() // map exercise id -> question ids for test assembly

  const debugBaseDir = path.join(process.cwd(), "data", slug, "qti", "debug")
  const ensureDir = async (dir: string) => {
    const mkdirRes = await errors.try(fs.mkdir(dir, { recursive: true }))
    if (mkdirRes.error) {
      logger.error("debug dir mkdir failed", { dir, error: mkdirRes.error })
    }
  }

  for await (const unit of iterUnits(reader) as AsyncIterable<CartUnit>) {
    if (!unit.title || typeof unit.unitNumber !== "number") {
      logger.error("unit missing title or unitNumber", { unit })
      throw errors.new("unit: missing required fields")
    }
    const unitEntryFromIndex = indexJson.units.find((u) => u.id === unit.id)
    const unitSlug = getLastPathSegment(unitEntryFromIndex?.path ?? unit.id)
    const unitComponentId = orCourseComponentIdForUnit(slug, unit.id)

    payload.courseComponents.push({
      sourcedId: unitComponentId,
      status: "active",
      title: unit.title,
      course: { sourcedId: courseSourcedId, type: "course" },
      sortOrder: unit.unitNumber,
      metadata: { khanId: unit.id, khanSlug: normalizePathSlug(unitSlug), khanTitle: unit.title }
    })

    // Read unit.json to access canonical lesson paths
    if (!unitEntryFromIndex?.path || unitEntryFromIndex.path === "") {
      logger.error("unit path missing in index", { unitId: unit.id })
      throw errors.new("unit path: missing in index")
    }
    const unitDataResult = await errors.try(readUnit(reader, unitEntryFromIndex.path))
    if (unitDataResult.error) {
      logger.error("failed to read unit json", { unitId: unit.id, error: unitDataResult.error })
      throw errors.wrap(unitDataResult.error, "read unit json")
    }
    const unitData = unitDataResult.data
    const lessonIdToPath = new Map<string, string>()
    for (const l of unitData.lessons) {
      if (!l.path || l.path === "") {
        logger.error("lesson missing path", { lessonId: l.id, unitId: unit.id })
        throw errors.new("lesson: missing path")
      }
      lessonIdToPath.set(l.id, l.path)
    }

    const lessons: CartLesson[] = []
    for await (const lesson of iterUnitLessons(reader, unit) as AsyncIterable<CartLesson>) {
      lessons.push(lesson)
    }

    // sort lessons by lessonNumber deterministically
    lessons.sort((a, b) => a.lessonNumber - b.lessonNumber)
    for (const lesson of lessons) {
      if (!lesson.title || typeof lesson.lessonNumber !== "number") {
        logger.error("lesson missing title or lessonNumber", { lesson })
        throw errors.new("lesson: missing required fields")
      }
      const unitEntry = indexJson.units.find((u) => u.id === unit.id)
      const unitSlugNorm = normalizePathSlug(unitEntry?.path ?? unit.id)
      const lessonPath = lessonIdToPath.get(lesson.id)
      if (!lessonPath) {
        logger.error("lesson path not found in unit json", { unitId: unit.id, lessonId: lesson.id })
        throw errors.new("lesson path: not found")
      }
      const lessonSlug = normalizePathSlug(lessonPath)

      const lessonComponentId = orCourseComponentIdForLesson(slug, unit.id, lesson.id)
      payload.courseComponents.push({
        sourcedId: lessonComponentId,
        status: "active",
        title: lesson.title,
        course: { sourcedId: courseSourcedId, type: "course" },
        parent: { sourcedId: unitComponentId, type: "courseComponent" },
        sortOrder: lesson.lessonNumber,
        metadata: { khanId: lesson.id, khanSlug: lessonSlug, khanTitle: lesson.title }
      })

      let resourceIndex = 0
      for await (const res of iterLessonResources(reader, lesson) as AsyncIterable<Resource>) {
        resourceIndex++
        if (res.type === "article") {
          const htmlResult = await errors.try(readArticleContent(reader, res.path))
          if (htmlResult.error) {
            logger.error("failed to read article stimulus", { path: res.path, error: htmlResult.error })
            throw errors.wrap(htmlResult.error, "read article")
          }
          const xp = await computeArticleXpFromHtml(htmlResult.data)
          const articleSlug = getLastPathSegment(path.dirname(res.path))
          const launch = `${baseDomain}/${subjectRoute}/${slug}/${unitSlugNorm}/${lessonSlug}/a/${articleSlug}`
```


## Assistant

<thinking>


**Checking quiz generation section**
</thinking>

**Tool Call: Read convert-cartridge-to-oneroster.ts**
Status: Completed

```ts
          const launch = `${baseDomain}/${subjectRoute}/${slug}/${unitSlugNorm}/${lessonSlug}/a/${articleSlug}`
          const resourceId = orResourceIdForArticle(slug, unit.id, lesson.id, res.id)
          if (resourceSeen.has(resourceId)) {
            logger.error("duplicate resource id", { id: res.id })
            throw errors.new("resource id collision")
          }
          resourceSeen.add(resourceId)

          payload.resources.push({
            sourcedId: resourceId,
            status: "active",
            title: lesson.title,
            vendorResourceId: `nice-academy-${res.id}`,
            vendorId: "superbuilders",
            applicationId: "nice",
            roles: ["primary"],
            importance: "primary",
            metadata: {
              type: "interactive",
              toolProvider: "Nice Academy",
              khanActivityType: "Article",
              launchUrl: launch,
              url: launch,
              khanId: res.id,
              khanSlug: articleSlug,
              khanTitle: lesson.title,
              qtiStimulusIdentifier: undefined,
              xp
            }
          })

          const compResId = orComponentResourceIdForArticle(slug, unit.id, lesson.id, res.id)
          payload.componentResources.push({
            sourcedId: compResId,
            status: "active",
            title: formatResourceTitleForDisplay(lesson.title, "Article"),
            courseComponent: { sourcedId: lessonComponentId, type: "courseComponent" },
            resource: { sourcedId: resourceId, type: "resource" },
            sortOrder: resourceIndex
          })

          payload.assessmentLineItems.push({
            sourcedId: orAssessmentLineItemIdFromResource(resourceId),
            status: "active",
            title: `Progress for: ${lesson.title}`,
            componentResource: { sourcedId: compResId },
            course: { sourcedId: courseSourcedId },
            metadata: { lessonType: "article", courseSourcedId }
          })

          // Generate QTI stimulus for article: identifier MUST equal resource sourcedId
          const stimId = qtiStimulusIdFromResource(resourceId)
          const stimulusXml = generateStimulusXml(stimId, lesson.title, htmlResult.data)
          qtiStimuli.push({
            xml: stimulusXml,
            metadata: {
              khanId: res.id,
              khanSlug: articleSlug,
              lessonId: lesson.id,
              unitId: unit.id,
              khanTitle: lesson.title
            }
          })
          logger.debug("generated qti stimulus for article", { articleId: res.id, lessonId: lesson.id })

          totalXp += xp
          totalLessons += 1
        } else if (res.type === "quiz") {
          const quizSlug = getLastPathSegment(res.path)
          // Create intermediate component for quiz
          const quizComponentId = orCourseComponentIdForQuiz(slug, unit.id, lesson.id, res.id)
          payload.courseComponents.push({
            sourcedId: quizComponentId,
            status: "active",
            title: lesson.title,
            course: { sourcedId: courseSourcedId, type: "course" },
            parent: { sourcedId: unitComponentId, type: "courseComponent" },
            sortOrder: lesson.lessonNumber, // position alongside lesson
            metadata: { khanId: res.id, khanSlug: quizSlug, khanTitle: lesson.title }
          })

          const launch = `${baseDomain}/${subjectRoute}/${slug}/${unitSlugNorm}/${lessonSlug}/quiz/${quizSlug}`
          const resourceId = orResourceIdForQuiz(slug, unit.id, lesson.id, res.id)
          if (resourceSeen.has(resourceId)) {
            logger.error("duplicate resource id", { id: res.id })
            throw errors.new("resource id collision")
          }
          resourceSeen.add(resourceId)

          payload.resources.push({
            sourcedId: resourceId,
            status: "active",
            title: lesson.title,
            vendorResourceId: `nice-academy-${res.id}`,
            vendorId: "superbuilders",
            applicationId: "nice",
            roles: ["primary"],
            importance: "primary",
            metadata: {
              type: "interactive",
              toolProvider: "Nice Academy",
              khanActivityType: "Quiz",
              khanLessonType: "quiz",
              launchUrl: launch,
              url: launch,
              khanId: res.id,
              khanSlug: quizSlug,
              khanTitle: lesson.title,
              xp: QUIZ_XP
            }
          })

          const compResIdQ = orComponentResourceIdForQuiz(slug, unit.id, lesson.id, res.id)
          payload.componentResources.push({
            sourcedId: compResIdQ,
            status: "active",
            title: lesson.title,
            courseComponent: { sourcedId: quizComponentId, type: "courseComponent" },
            resource: { sourcedId: resourceId, type: "resource" },
            sortOrder: 0
          })

          payload.assessmentLineItems.push({
            sourcedId: orAssessmentLineItemIdFromResource(resourceId),
            status: "active",
            title: lesson.title,
            componentResource: { sourcedId: compResIdQ },
            course: { sourcedId: courseSourcedId },
            metadata: { lessonType: "quiz", courseSourcedId }
          })

          // Generate QTI items and test for quiz
          {
            if (!res.questions || res.questions.length === 0) {
              logger.error("quiz has no questions", { quizId: res.id, path: res.path })
              throw errors.new("quiz: no questions available")
            }
            const questionIds: string[] = []
            for (const q of res.questions) {
              // Load actual XML from cartridge if q.xml is a path
              const originalXml = q.xml?.trim() && q.xml.includes("<") ? q.xml : await readQuestionXml(reader, q.xml || "")
              if (!originalXml || originalXml === "") {
                logger.error("question xml empty after read", { quizId: res.id, questionNumber: q.number, xmlPath: q.xml })
                throw errors.new("question: xml is required")
              }
            // Debug: write and log exact original XML from cartridge
            const quizDebugDir = path.join(debugBaseDir, "quizzes", res.id)
            await ensureDir(quizDebugDir)
            const originalQuizItemPath = path.join(quizDebugDir, `question-${String(q.number).padStart(2, "0")}.original.xml`)
            const writeOrigQuizRes = await errors.try(fs.writeFile(originalQuizItemPath, originalXml, "utf-8"))
            if (writeOrigQuizRes.error) {
              logger.error("debug write failed (quiz original)", { file: originalQuizItemPath, error: writeOrigQuizRes.error })
            }
              logger.debug("quiz question xml (original)", {
                quizId: res.id,
                questionNumber: q.number,
                xml: originalXml
              })
              // Always rewrite identifier to our stable scheme: nice_<quizId>_<questionNumber>
              const newItemId = qtiItemIdForQuiz(slug, unit.id, lesson.id, res.id, q.number)
            const rewriteRes = errors.trySync(() => replaceRootAttributes(originalXml, "qti-assessment-item", newItemId, lesson.title))
            if (rewriteRes.error) {
              logger.error("identifier rewrite failed (quiz)", { quizId: res.id, questionNumber: q.number, error: rewriteRes.error })
              // keep original file already written; bail out fast
              throw rewriteRes.error
            }
            const rewrittenXml = rewriteRes.data
              // Debug: log the rewritten XML
              logger.debug("quiz question xml (rewritten)", {
                quizId: res.id,
                questionNumber: q.number,
                identifier: newItemId,
                xml: rewrittenXml
              })
            const rewrittenQuizItemPath = path.join(quizDebugDir, `question-${String(q.number).padStart(2, "0")}.rewritten.xml`)
            const writeRewQuizRes = await errors.try(fs.writeFile(rewrittenQuizItemPath, rewrittenXml, "utf-8"))
            if (writeRewQuizRes.error) {
              logger.error("debug write failed (quiz rewritten)", { file: rewrittenQuizItemPath, error: writeRewQuizRes.error })
            }
              questionIds.push(newItemId)
              qtiItems.push({
                xml: rewrittenXml,
                metadata: {
                  khanId: newItemId,
                  khanExerciseId: stripNicePrefix(resourceId),
                  khanExerciseSlug: quizSlug,
                  khanExerciseTitle: lesson.title
                }
              })
            }
            // Generate test for this quiz
            // IMPORTANT: Set test identifier equal to the resource sourcedId so providers can map directly
            const quizTestId = resourceId
            const quizTestXml = generateTestXml(quizTestId, lesson.title, questionIds)
            // Debug: log the generated test XML
            logger.debug("quiz test xml", { quizId: res.id, xml: quizTestXml })
            const quizTestPath = path.join(path.join(debugBaseDir, "quizzes", res.id), `test.xml`)
            const writeQuizTestRes = await errors.try(fs.writeFile(quizTestPath, quizTestXml, "utf-8"))
            if (writeQuizTestRes.error) {
              logger.error("debug write failed (quiz test)", { file: quizTestPath, error: writeQuizTestRes.error })
            }
            qtiTestsXml.push(quizTestXml)
            exerciseToItemIds.set(res.id, questionIds)
            logger.debug("generated qti items and test for quiz", { quizId: res.id, itemCount: questionIds.length })
          }

          totalXp += QUIZ_XP
          totalLessons += 1
        }
      }
    }

    // Unit test (optional) - process once per unit, OUTSIDE lesson loop
    if (unit.unitTest) {
      const unitEntry = indexJson.units.find((u) => u.id === unit.id)
      const unitSlug = normalizePathSlug(unitEntry?.path ?? unit.id)
      const lastLesson = lessons[lessons.length - 1]
      if (!lastLesson) {
        logger.error("assessment launch url: no lessons in unit", { unitId: unit.id })
        throw errors.new("assessment launch url: no lessons in unit")
      }
      const lastLessonPath = lessonIdToPath.get(lastLesson.id)
      if (!lastLessonPath) {
        logger.error("last lesson path missing", { unitId: unit.id, lessonId: lastLesson.id })
        throw errors.new("lesson path: not found")
      }
      const lastLessonSlug = normalizePathSlug(lastLessonPath)
      const testSlug = getLastPathSegment(unit.unitTest.path)

      const unitTestComponentId = orCourseComponentIdForUnitTest(slug, unit.id, unit.unitTest.id)
      payload.courseComponents.push({
        sourcedId: unitTestComponentId,
        status: "active",
        title: unit.unitTest.id,
        course: { sourcedId: courseSourcedId, type: "course" },
        parent: { sourcedId: unitComponentId, type: "courseComponent" },
        sortOrder: lastLesson.lessonNumber + 1,
        metadata: { khanId: unit.unitTest.id, khanSlug: testSlug, khanTitle: unit.unitTest.id }
      })

      const launch = `${baseDomain}/${subjectRoute}/${slug}/${unitSlug}/${lastLessonSlug}/test/${testSlug}`
      const resourceId = orResourceIdForUnitTest(slug, unit.id, unit.unitTest.id)
      if (resourceSeen.has(resourceId)) {
        logger.error("duplicate resource id", { id: unit.unitTest.id })
        throw errors.new("resource id collision")
      }
      resourceSeen.add(resourceId)

          payload.resources.push({
        sourcedId: resourceId,
        status: "active",
        title: unit.unitTest.id,
        vendorResourceId: `nice-academy-${unit.unitTest.id}`,
        vendorId: "superbuilders",
        applicationId: "nice",
        roles: ["primary"],
        importance: "primary",
        metadata: {
          type: "interactive",
          toolProvider: "Nice Academy",
          khanActivityType: "UnitTest",
```


## Assistant

<thinking>


**Requesting more content**
</thinking>

**Tool Call: Read convert-cartridge-to-oneroster.ts**
Status: Completed

```ts
          khanActivityType: "UnitTest",
          khanLessonType: "unittest",
          launchUrl: launch,
          url: launch,
          khanId: unit.unitTest.id,
          khanSlug: testSlug,
          khanTitle: unit.unitTest.id,
          xp: UNIT_TEST_XP
        }
      })

      const compResIdUT = orComponentResourceIdForUnitTest(slug, unit.id, unit.unitTest.id)
      payload.componentResources.push({
        sourcedId: compResIdUT,
        status: "active",
        title: unit.unitTest.id,
        courseComponent: { sourcedId: unitTestComponentId, type: "courseComponent" },
        resource: { sourcedId: resourceId, type: "resource" },
        sortOrder: 0
      })

      payload.assessmentLineItems.push({
        sourcedId: orAssessmentLineItemIdFromResource(resourceId),
        status: "active",
        title: unit.unitTest.id,
        componentResource: { sourcedId: compResIdUT },
        course: { sourcedId: courseSourcedId },
        metadata: { lessonType: "unittest", courseSourcedId }
      })

      // Generate QTI items and test for unit test
      const unitTest = unit.unitTest
      if (!unitTest.questions || unitTest.questions.length === 0) {
        logger.error("unit test has no questions", { unitTestId: unitTest.id, unitId: unit.id })
        throw errors.new("unit test: no questions available")
      }
      const questionIds: string[] = []
      for (const q of unitTest.questions) {
        const originalXml = q.xml?.trim() && q.xml.includes("<") ? q.xml : await readQuestionXml(reader, q.xml)
        if (!originalXml || originalXml === "") {
          logger.error("unit test question xml empty after read", { unitTestId: unitTest.id, questionNumber: q.number, xmlPath: q.xml })
          throw errors.new("unit test question: xml is required")
        }
        // Debug: write and log exact original XML from cartridge for unit test
        const unitTestDebugDir = path.join(debugBaseDir, "unit-tests", unitTest.id)
        await ensureDir(unitTestDebugDir)
        const originalUnitTestItemPath = path.join(unitTestDebugDir, `question-${String(q.number).padStart(2, "0")}.original.xml`)
        const writeOrigUtRes = await errors.try(fs.writeFile(originalUnitTestItemPath, originalXml, "utf-8"))
        if (writeOrigUtRes.error) {
          logger.error("debug write failed (unit test original)", { file: originalUnitTestItemPath, error: writeOrigUtRes.error })
        }
        logger.debug("unit test question xml (original)", {
          unitTestId: unitTest.id,
          questionNumber: q.number,
          xml: originalXml
        })
        // Always rewrite identifier to our stable scheme: nice_<unitTestId>_<questionNumber>
        const newItemId = qtiItemIdForUnitTest(slug, unit.id, unitTest.id, q.number)
        const rewriteUtRes = errors.trySync(() => replaceRootAttributes(originalXml, "qti-assessment-item", newItemId, unitTest.id))
        if (rewriteUtRes.error) {
          logger.error("identifier rewrite failed (unit test)", { unitTestId: unitTest.id, questionNumber: q.number, error: rewriteUtRes.error })
          throw rewriteUtRes.error
        }
        const rewrittenXml = rewriteUtRes.data
        // Debug: log rewritten unit test question XML
        logger.debug("unit test question xml (rewritten)", {
          unitTestId: unitTest.id,
          questionNumber: q.number,
          identifier: newItemId,
          xml: rewrittenXml
        })
        const rewrittenUnitTestItemPath = path.join(unitTestDebugDir, `question-${String(q.number).padStart(2, "0")}.rewritten.xml`)
        const writeRewUtRes = await errors.try(fs.writeFile(rewrittenUnitTestItemPath, rewrittenXml, "utf-8"))
        if (writeRewUtRes.error) {
          logger.error("debug write failed (unit test rewritten)", { file: rewrittenUnitTestItemPath, error: writeRewUtRes.error })
        }
        questionIds.push(newItemId)
        qtiItems.push({
          xml: rewrittenXml,
          metadata: {
            khanId: newItemId,
            khanExerciseId: stripNicePrefix(resourceId),
            khanExerciseSlug: testSlug,
            khanExerciseTitle: unitTest.id
          }
        })
      }
      // Generate test for this unit test
      const utId = unitTest.id
      // IMPORTANT: Set test identifier equal to the resource sourcedId
      const unitTestAssessmentId = resourceId
      const unitTestXml = generateTestXml(unitTestAssessmentId, utId, questionIds)
      // Debug: log the generated unit test XML
      logger.debug("unit test xml", { unitTestId: utId, xml: unitTestXml })
      const unitTestPath = path.join(path.join(debugBaseDir, "unit-tests", utId), `test.xml`)
      const writeUtTestRes = await errors.try(fs.writeFile(unitTestPath, unitTestXml, "utf-8"))
      if (writeUtTestRes.error) {
        logger.error("debug write failed (unit test test)", { file: unitTestPath, error: writeUtTestRes.error })
      }
      qtiTestsXml.push(unitTestXml)
      logger.debug("generated qti items and test for unit test", { unitTestId: utId, itemCount: questionIds.length })

      totalXp += UNIT_TEST_XP
      totalLessons += 1
    }
  }

  // Attach metrics
  const md = payload.course.metadata ?? {}
  md.metrics = { totalXp, totalLessons }
  payload.course.metadata = md

  // Write out files
  const courseDir = path.join(process.cwd(), "data", slug, "oneroster")
  const mkdirResult = await errors.try(fs.mkdir(courseDir, { recursive: true }))
  if (mkdirResult.error) {
    logger.error("failed to create output directory", { dir: courseDir, error: mkdirResult.error })
    throw errors.wrap(mkdirResult.error, "mkdir output")
  }

  const files: Array<{ name: string; data: unknown }> = [
    { name: "course.json", data: payload.course },
    { name: "class.json", data: payload.class },
    { name: "courseComponents.json", data: payload.courseComponents },
    { name: "resources.json", data: payload.resources },
    { name: "componentResources.json", data: payload.componentResources },
    { name: "assessmentLineItems.json", data: payload.assessmentLineItems }
  ]

  for (const file of files) {
    const filePath = path.join(courseDir, file.name)
    const writeResult = await errors.try(fs.writeFile(filePath, JSON.stringify(file.data, null, 2), "utf-8"))
    if (writeResult.error) {
      logger.error("failed to write output file", { file: filePath, error: writeResult.error })
      throw errors.wrap(writeResult.error, "write output file")
    }
    logger.info("wrote output file", { file: filePath })
  }

  logger.info("oneroster conversion complete", {
    slug,
    outDir: courseDir,
    counts: {
      courseComponents: payload.courseComponents.length,
      resources: payload.resources.length,
      componentResources: payload.componentResources.length,
      assessmentLineItems: payload.assessmentLineItems.length
    }
  })

  // Write QTI files (always emitted)
    logger.info("writing qti payloads", {
      stimuliCount: qtiStimuli.length,
      itemsCount: qtiItems.length,
      testsCount: qtiTestsXml.length
    })

    const qtiDir = path.join(process.cwd(), "data", slug, "qti")
    const qtiMkdirResult = await errors.try(fs.mkdir(qtiDir, { recursive: true }))
    if (qtiMkdirResult.error) {
      logger.error("failed to create qti output directory", { dir: qtiDir, error: qtiMkdirResult.error })
      throw errors.wrap(qtiMkdirResult.error, "mkdir qti output")
    }

    const qtiFiles: Array<{ name: string; data: unknown }> = [
      { name: "assessmentStimuli.json", data: qtiStimuli },
      { name: "assessmentItems.json", data: qtiItems },
      { name: "assessmentTests.json", data: qtiTestsXml }
    ]

    for (const file of qtiFiles) {
      const filePath = path.join(qtiDir, file.name)
      const writeResult = await errors.try(fs.writeFile(filePath, JSON.stringify(file.data, null, 2), "utf-8"))
      if (writeResult.error) {
        logger.error("failed to write qti output file", { file: filePath, error: writeResult.error })
        throw errors.wrap(writeResult.error, "write qti output file")
      }
      logger.info("wrote qti output file", { file: filePath })
    }

  logger.info("qti conversion complete", {
    slug,
    qtiDir,
    counts: {
      stimuli: qtiStimuli.length,
      items: qtiItems.length,
      tests: qtiTestsXml.length
    }
  })
}

const result = await errors.try(main())
if (result.error) {
  logger.error("fatal", { error: result.error })
  process.exit(1)
}
process.exit(0)
```


## Assistant

<thinking>


**Inspecting ID generation helpers**
</thinking>

**Tool Call: Read convert-cartridge-to-oneroster.ts**
Status: Completed

```ts
function orCourseComponentIdForLesson(courseSlug: string, unitId: string, lessonId: string): string {
  return hashId("or_cc_", ["component", "kind=lesson", `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`])
}
function orCourseComponentIdForQuiz(courseSlug: string, unitId: string, lessonId: string, quizId: string): string {
  return hashId("or_cc_", ["component", "kind=quiz", `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `x=${quizId}`])
}
function orCourseComponentIdForUnitTest(courseSlug: string, unitId: string, unitTestId: string): string {
  return hashId("or_cc_", ["component", "kind=unittest", `c=${courseSlug}`, `u=${unitId}`, `t=${unitTestId}`])
}
function orResourceIdForArticle(courseSlug: string, unitId: string, lessonId: string, articleId: string): string {
  return hashId("or_r_", ["resource", "kind=article", `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `a=${articleId}`])
}
function orResourceIdForQuiz(courseSlug: string, unitId: string, lessonId: string, quizId: string): string {
  return hashId("or_r_", ["resource", "kind=quiz", `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `x=${quizId}`])
}
function orResourceIdForUnitTest(courseSlug: string, unitId: string, unitTestId: string): string {
  return hashId("or_r_", ["resource", "kind=unittest", `c=${courseSlug}`, `u=${unitId}`, `t=${unitTestId}`])
}
function orComponentResourceIdForArticle(courseSlug: string, unitId: string, lessonId: string, articleId: string): string {
  return hashId("or_cr_", ["component-resource", "kind=article", `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `a=${articleId}`])
}
function orComponentResourceIdForQuiz(courseSlug: string, unitId: string, lessonId: string, quizId: string): string {
  return hashId("or_cr_", ["component-resource", "kind=quiz", `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `x=${quizId}`])
}
function orComponentResourceIdForUnitTest(courseSlug: string, unitId: string, unitTestId: string): string {
  return hashId("or_cr_", ["component-resource", "kind=unittest", `c=${courseSlug}`, `u=${unitId}`, `t=${unitTestId}`])
}
function orAssessmentLineItemIdFromResource(resourceId: string): string {
  // MUST match global expectation: line item ID = resourceId + "_ali"
  return `${resourceId}_ali`
}

function stripNicePrefix(id: string): string {
  return id.startsWith("nice_") ? id.slice(5) : id
}

function sanitizeIdPart(part: string): string {
  // Replace non-alphanumeric with underscores, collapse repeats, trim underscores
  let v = part.replace(/[^A-Za-z0-9_]/g, "_")
  v = v.replace(/_+/g, "_")
  v = v.replace(/^_+|_+$/g, "")
  // Ensure starts with letter or underscore
  if (!/^[A-Za-z_]/.test(v)) v = `n_${v}`
  return v || "n"
}

function buildId(...parts: string[]): string {
  const safe = parts.map((p) => sanitizeIdPart(p))
  return `nice_${safe.join("__")}`
}
```


## Assistant

<thinking>


**Checking hashId definition**
</thinking>

**Tool Call: Read convert-cartridge-to-oneroster.ts**
Status: Completed

```ts
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex")
}

function hashId(_prefix: string, parts: string[]): string {
  // Always emit IDs starting with "nice_". The prefix argument is intentionally ignored
  // for the returned value, but included in the hash key for type separation.
  const key = parts.join("|")
  const hex = sha256Hex(key)
  return `nice_${hex.slice(0, 32)}`
}

// QTI identifiers (hyphen-free):
function qtiStimulusIdFromResource(resourceId: string): string {
  // For articles, stimulus identifier MUST equal the resource sourcedId
  return resourceId
}
function qtiItemIdForQuiz(courseSlug: string, unitId: string, lessonId: string, quizId: string, questionNumber: number): string {
  return hashId("ni_", ["item", `kind=quiz`, `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `x=${quizId}`, `q=${String(questionNumber)}`])
}
function qtiItemIdForUnitTest(courseSlug: string, unitId: string, unitTestId: string, questionNumber: number): string {
  return hashId("ni_", ["item", `kind=unittest`, `c=${courseSlug}`, `u=${unitId}`, `t=${unitTestId}`, `q=${String(questionNumber)}`])
}
function qtiTestIdForQuiz(courseSlug: string, unitId: string, lessonId: string, quizId: string): string {
  return hashId("nt_", ["test", `kind=quiz`, `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `x=${quizId}`])
}
function qtiTestIdForUnitTest(courseSlug: string, unitId: string, unitTestId: string): string {
  return hashId("nt_", ["test", `kind=unittest`, `c=${courseSlug}`, `u=${unitId}`, `t=${unitTestId}`])
}

// OneRoster sourcedIds (hyphen-free):
function orCourseId(courseSlug: string, courseId: string): string {
  return hashId("or_c_", ["course", `slug=${courseSlug}`, `id=${courseId}`])
}
function orClassId(courseSlug: string, courseId: string): string {
  return hashId("or_class_", ["class", `slug=${courseSlug}`, `id=${courseId}`])
}
function orCourseComponentIdForUnit(courseSlug: string, unitId: string): string {
  return hashId("or_cc_", ["component", "kind=unit", `c=${courseSlug}`, `u=${unitId}`])
}
function orCourseComponentIdForLesson(courseSlug: string, unitId: string, lessonId: string): string {
```


## Assistant

<thinking>


**Investigating finalization failure cause**

I'll explore how hashed resource IDs relate to assessment line items and why finalization fails when saving results, focusing on potential mismatches or missing line items in OneRoster caused by the offline cartridge script and how course or subject slugs might affect path parsing.
</thinking>

**Tool Call: Read convert-cartridge-to-oneroster.ts**
Status: Completed

```ts
function mapSubjectToOneRosterSubjects(subject: string): string[] {
  const mapping: Record<string, string[]> = {
    "English": ["Reading", "Vocabulary"],
    "English Language Arts": ["Reading", "Vocabulary"],
    "Math": ["Math"],
    "Science": ["Science"],
    "Arts and Humanities": ["Social Studies"],
    "Economics": ["Social Studies"],
    "Computing": ["Science"],
    "Test Prep": ["Reading", "Math"],
    "College, Careers, and More": ["Social Studies"]
  }
  const mapped = mapping[subject]
  if (!mapped) {
    logger.error("subject mapping missing", { subject })
    throw errors.new("subject mapping: subject not supported")
  }
  return mapped
}

function addNiceAcademyPrefix(title: string): string {
  const prefix = "Nice Academy - "
  return title.startsWith(prefix) ? title : `${prefix}${title}`
}

function getLastPathSegment(p: string): string {
  const segs = p.split("/").filter(Boolean)
  return segs[segs.length - 1] || ""
}

function formatResourceTitleForDisplay(baseTitle: string, kind: "Article" | "Video" | "Exercise"): string {
  // Match existing UI convention: "Title [Article]"
  return `${baseTitle} [${kind}]`
}

async function computeArticleXpFromHtml(html: string): Promise<number> {
  // Minimal readable text extraction: strip tags, script/style/math blocks
  let cleaned = html
    .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
    .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<math[\s\S]*?<\/math>/gi, " ")
    .replace(/<[^>]+>/g, " ")
  cleaned = cleaned.replace(/\s+/g, " ").trim()
  if (cleaned === "") {
    logger.error("article stimulus has no readable text")
    throw errors.new("article stimulus: no readable text")
  }
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length
  if (!Number.isFinite(wordCount) || wordCount <= 0) {
    logger.error("article word count invalid", { wordCount })
    throw errors.new("article stimulus: invalid word count")
  }
  return Math.max(1, Math.ceil(wordCount / READING_WORDS_PER_MINUTE))
}

function subjectToRouteSegment(subject: string): string {
  return subject.toLowerCase().replace(/\s+/g, "-")
}

function normalizePathSlug(p: string): string {
  const seg = getLastPathSegment(p)
  return seg.endsWith(".json") ? seg.slice(0, -5) : seg
}
```


## Assistant

<thinking>


**Analyzing quiz slug normalization issues**

I'm exploring differences in how quiz slugs are generated from resource paths—particularly that quiz slugs might retain a `.json` suffix unlike other slugs that get normalized—potentially causing mismatches in route paths and metadata during assessment finalization. I'm also considering if mismatches in OneRoster component resource IDs or missing entries in the XP service metadata could be the root cause of gradebook save failures. I'll need to dig into the XP service next to see if it’s rejecting poorly matched component IDs.
</thinking>

**Tool Call: Search awardXpForAssessment in service.ts**
Status: Completed

```sh
32:export async function awardXpForAssessment(options: AwardXpOptions): Promise<XpCalculationResult> {
```


**Tool Call: Read service.ts**
Status: Completed

```ts
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { checkExistingProficiency } from "@/lib/actions/assessment"
import { updateStreak } from "@/lib/actions/streak"
// Removed legacy Caliper caches; banking now reads canonical OneRoster results
import { awardBankedXpForExercise, findEligiblePassiveResourcesForExercise } from "@/lib/xp/bank"
import { calculateAssessmentXp, type XpCalculationResult } from "@/lib/xp/core"

interface AwardXpOptions {
	userSourcedId: string
	assessmentResourceId: string
	componentResourceId: string // The contextual ID (e.g., quiz, test)
	courseSourcedId: string
	baseXp: number
	correctQuestions: number
	totalQuestions: number
	attemptNumber: number
	durationInSeconds?: number
	isExercise: boolean
	userEmail: string
	subjectSlug: string
	courseSlug: string
}

/**
 * Orchestrates the entire process of calculating and awarding XP for an assessment.
 * This is the single entry point for all XP-related logic.
 *
 * @param options - The context and performance data for the assessment.
 * @returns The final calculated XP amount.
 */
export async function awardXpForAssessment(options: AwardXpOptions): Promise<XpCalculationResult> {
	logger.info("awarding xp for assessment", {
		userSourcedId: options.userSourcedId,
		assessmentResourceId: options.assessmentResourceId,
		componentResourceId: options.componentResourceId,
		courseSourcedId: options.courseSourcedId,
		baseXp: options.baseXp,
		correctQuestions: options.correctQuestions,
		totalQuestions: options.totalQuestions,
		attemptNumber: options.attemptNumber,
		isExercise: options.isExercise
	})

	// 1. Prevent XP farming by checking for existing proficiency.
	const proficiencyResult = await errors.try(checkExistingProficiency(options.assessmentResourceId))
	if (proficiencyResult.error) {
		logger.error("proficiency check failed", { error: proficiencyResult.error })
		throw errors.wrap(proficiencyResult.error, "proficiency check")
	}
	const isAlreadyProficient = proficiencyResult.data

	if (isAlreadyProficient) {
		const result: XpCalculationResult = {
			finalXp: 0,
			multiplier: 0,
			baseXp: options.baseXp,
			accuracy: (options.correctQuestions / options.totalQuestions) * 100,
			penaltyApplied: false,
			reason: "XP farming prevention: user already proficient"
		}
		logger.info("xp award blocked due to existing proficiency", {
			userSourcedId: options.userSourcedId,
			assessmentResourceId: options.assessmentResourceId
		})
		return result
	}

	// 2. Calculate the base assessment XP using the core pure function.
	const accuracy = options.totalQuestions > 0 ? (options.correctQuestions / options.totalQuestions) * 100 : 0
	const assessmentXpResult = calculateAssessmentXp(
		options.baseXp,
		accuracy,
		options.attemptNumber,
		options.totalQuestions,
		options.durationInSeconds
	)

	let finalXp = assessmentXpResult.finalXp
	let bankedXp = 0

	// 3. Process XP Bank for exercises if the user achieved mastery.
	if (options.isExercise && assessmentXpResult.finalXp > 0 && accuracy >= 80) {
		// Directly award banked XP using canonical nice_timeSpent from OneRoster
		const xpBankResult = await errors.try(
			awardBankedXpForExercise({
				exerciseResourceSourcedId: options.assessmentResourceId,
				onerosterUserSourcedId: options.userSourcedId,
				onerosterCourseSourcedId: options.courseSourcedId,
				userEmail: options.userEmail,
				subjectSlug: options.subjectSlug,
				courseSlug: options.courseSlug
			})
		)

		if (xpBankResult.error) {
			logger.error("failed to process xp bank", {
				error: xpBankResult.error,
				assessmentId: options.componentResourceId,
				userId: options.userSourcedId
			})
			// CRITICAL: Banking failure must halt the process per "No Fallbacks" rule
			throw errors.wrap(xpBankResult.error, "xp banking")
		}

		bankedXp = xpBankResult.data.bankedXp
		finalXp += bankedXp
		logger.info("awarded banked xp", {
			assessmentId: options.componentResourceId,
			bankedXp,
			awardedCount: xpBankResult.data.awardedResourceIds.length
		})
	}

	// 4. Update the user's weekly activity streak if they earned positive XP.
	if (finalXp > 0) {
		const streakResult = await errors.try(updateStreak())
		if (streakResult.error) {
			logger.error("failed to update user streak after awarding xp", {
				userId: options.userSourcedId,
				finalXp,
				error: streakResult.error
			})
			// Do not block XP award if streak update fails.
		}
	}

	const finalResult: XpCalculationResult = {
		...assessmentXpResult,
		finalXp // This now includes the banked XP.
	}

	logger.info("xp award process complete", { ...finalResult, bankedXp })
	return finalResult
}
```


## Assistant

<thinking>


**Inspecting checkExistingProficiency function**
</thinking>

**Tool Call: Read assessment.ts**
Status: Completed

```ts
   638	export async function checkExistingProficiency(onerosterAssessmentSourcedId: string): Promise<boolean> {
   639		const { userId } = await auth()
   640		if (!userId) {
   641			logger.error("checkExistingProficiency failed: user not authenticated")
   642			throw errors.new("user not authenticated")
   643		}
   644		const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
   645		logger.info("checking existing proficiency", {
   646			onerosterUserSourcedId,
   647			onerosterAssessmentSourcedId
   648		})
   649
   650		const strictLineItemId = getAssessmentLineItemId(onerosterAssessmentSourcedId)
   651
   652		const resultsResult = await errors.try(
   653			oneroster.getAllResults({
   654				filter: `student.sourcedId='${onerosterUserSourcedId}' AND assessmentLineItem.sourcedId='${strictLineItemId}'`
   655			})
   656		)
   657		if (resultsResult.error) {
   658			logger.error("failed to check existing proficiency", {
   659				onerosterUserSourcedId,
   660				onerosterAssessmentSourcedId,
   661				error: resultsResult.error
   662			})
   663			// NO FALLBACK - if we can't check, we throw
   664			throw errors.wrap(resultsResult.error, "proficiency check")
   665		}
   666
   667		// CHANGED: Use the new utility to find the latest valid attempt directly.
   668		const latestResult = findLatestInteractiveAttempt(resultsResult.data, onerosterUserSourcedId, strictLineItemId)
   669
   670		if (!latestResult) {
   671			logger.debug("no existing results found", {
   672				onerosterUserSourcedId,
   673				onerosterAssessmentSourcedId
   674			})
   675			return false
   676		}
   677
   678		if (typeof latestResult.score !== "number") {
   679			logger.error("proficiency check: invalid score type", {
   680				onerosterUserSourcedId,
   681				onerosterAssessmentSourcedId,
   682				scoreType: typeof latestResult.score,
   683				score: latestResult.score
   684			})
   685			throw errors.new("proficiency check: score must be a number")
   686		}
   687
   688		const normalizedScore = latestResult.score <= 1.1 ? latestResult.score * 100 : latestResult.score
   689		const isProficient = normalizedScore >= XP_PROFICIENCY_THRESHOLD
   690
   691		logger.info("proficiency check complete", {
   692			onerosterUserSourcedId,
   693			onerosterAssessmentSourcedId,
   694			currentScore: normalizedScore,
   695			isProficient
   696		})
   697
   698		return isProficient
   699	}
   700
   701	/**
   702	 * Orchestrates the finalization of an assessment.
   703	 *
   704	 * This is the culminating action called when a user completes the last question. It reads the
   705	 * **server-authoritative state from Redis** (not from client input), calculates the final score,
   706	 * saves the official result to OneRoster via the assessment service, and awards XP.
   707	 *
   708	 * **CRITICAL BUSINESS LOGIC:**
   709	 * - The Redis state is the SINGLE SOURCE OF TRUTH for assessment results
   710	 * - Redis only stores the FIRST ATTEMPT for each question (subsequent attempts are for formative feedback only)
   711	 * - Reported questions (where isReported=true or isCorrect=null) are EXCLUDED from scoring
   712	 * - The final score = (correct answers / scorable questions) × 100, where scorable questions exclude reported ones
   713	 *
   714	 * After all permanent storage is updated, it marks the assessment state in Redis as `isFinalized: true`.
   715	 * This makes the finalization step idempotent; if called again on an already-finalized state, it will
   716	 * simply return the calculated summary without performing duplicate writes.
   717	 *
   718	 * @param options Contextual data for the assessment (no session results are passed from the client).
   719	 * @returns A summary payload for the client's SummaryView, including score and any XP penalties.
   720	 */
```


## Assistant

<thinking>


**Analyzing proficiency update errors**

I'm exploring how invalid score types in results might cause early failures in finalizing assessments, especially focusing on differences with script-generated gradebook entries and XP awarding logic tied to componentResourceId and exercise types. There's a hypothesis that score fields as strings might disrupt type checks, leading to exceptions when saving results.
</thinking>

**Tool Call: Read proficiency.ts**
Status: Completed

```ts
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster, qti } from "@/lib/clients"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import * as gradebook from "@/lib/ports/gradebook"
import { calculateProficiencyScore } from "@/lib/proficiency/core"
import { generateResultSourcedId } from "@/lib/utils/assessment-identifiers"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
import { assertPercentageInteger } from "@/lib/utils/score"

interface ExercisePerformance {
	exerciseId: string
	correctCount: number
	totalCount: number
}

interface QuestionResult {
	qtiItemId: string
	isCorrect: boolean | null
	isReported?: boolean
}

/**
 * Analyzes an assessment completion and updates individual exercise proficiency
 * based on granular question-level performance. This implements Khan Academy-style
 * mastery learning where performance on comprehensive assessments updates the
 * proficiency of individual skills that were tested.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId
 * @param attemptNumber - The specific attempt number to analyze.
 * @param sessionResults - An array of question results from the client session.
 * @param onerosterCourseSourcedId - The sourcedId of the course for cache invalidation.
 * @param correlationId - Unique identifier for tracing this operation
 */
export async function updateFromAssessment(
	onerosterUserSourcedId: string,
	onerosterComponentResourceSourcedId: string,
	attemptNumber: number,
	sessionResults: QuestionResult[],
	onerosterCourseSourcedId: string,
	correlationId: string
) {
	logger.info("starting granular proficiency analysis from session results", {
		onerosterUserSourcedId,
		onerosterComponentResourceSourcedId,
		attemptNumber,
		sessionResultCount: sessionResults.length,
		correlationId
	})

	// Step 1: Fetch the lessonType from the resource's metadata in OneRoster
	const componentResourceResult = await errors.try(oneroster.getComponentResource(onerosterComponentResourceSourcedId))
	if (componentResourceResult.error) {
		logger.error("failed to fetch component resource for proficiency analysis", {
			onerosterComponentResourceSourcedId,
			error: componentResourceResult.error,
			correlationId
		})
		throw errors.wrap(componentResourceResult.error, "fetch component resource")
	}
	if (!componentResourceResult.data) {
		logger.error("component resource data is null", { onerosterComponentResourceSourcedId, correlationId })
		throw errors.new("component resource data is null")
	}
	const resourceSourcedId = componentResourceResult.data.resource.sourcedId

	const resourceResult = await errors.try(oneroster.getResource(resourceSourcedId))
	if (resourceResult.error) {
		logger.error("failed to fetch resource for proficiency analysis", {
			resourceSourcedId,
			error: resourceResult.error,
			correlationId
		})
		throw errors.wrap(resourceResult.error, "fetch resource")
	}
	if (!resourceResult.data) {
		logger.error("resource data is null", { resourceSourcedId, correlationId })
		throw errors.new("resource data is null")
	}

	const metadataResult = ResourceMetadataSchema.safeParse(resourceResult.data.metadata)
	if (!metadataResult.success) {
		logger.error("invalid resource metadata", { resourceSourcedId, error: metadataResult.error, correlationId })
		throw errors.wrap(metadataResult.error, "invalid resource metadata")
	}
	// Map khanActivityType to lesson type for proficiency tracking
	let lessonType = "exercise"
	if (metadataResult.data.khanActivityType === "Quiz") {
		lessonType = "quiz"
	} else if (metadataResult.data.khanActivityType === "UnitTest") {
		lessonType = "unittest"
	} else if (metadataResult.data.khanActivityType === "CourseChallenge") {
		lessonType = "coursechallenge"
	}

	// Step 2: Map questions to exercises using QTI metadata
	const qtiItemIdToOneRosterResourceSourcedIdMap = new Map<string, string>()
	const questionResultsFromSession = sessionResults
		.filter((q) => !q.isReported)
		.map((q) => ({ id: q.qtiItemId, correct: q.isCorrect }))

	const qtiMetadataPromises = questionResultsFromSession.map(async (question) => {
		const itemResult = await errors.try(qti.getAssessmentItem(question.id))
		if (itemResult.error) {
			logger.warn("failed to fetch QTI item metadata for question", {
				qtiItemId: question.id,
				error: itemResult.error,
				correlationId
			})
			return null
		}

		const khanExerciseId = itemResult.data.metadata?.khanExerciseId
		if (!khanExerciseId) {
			logger.warn("question missing exercise ID in QTI metadata", {
				qtiItemId: question.id,
				metadata: itemResult.data.metadata,
				correlationId
			})
			return null
		}

		const onerosterResourceSourcedId = `nice_${khanExerciseId}`
		logger.debug("mapped question to exercise", {
			qtiItemId: question.id,
			khanExerciseId,
			onerosterResourceSourcedId,
			correlationId
		})
		return { qtiItemId: question.id, onerosterResourceSourcedId }
	})

	const qtiMetadataResults = await Promise.all(qtiMetadataPromises)
	for (const result of qtiMetadataResults) {
		if (result) {
			qtiItemIdToOneRosterResourceSourcedIdMap.set(result.qtiItemId, result.onerosterResourceSourcedId)
		}
	}

	if (qtiItemIdToOneRosterResourceSourcedIdMap.size === 0) {
		logger.info("no questions could be mapped to exercises", { onerosterComponentResourceSourcedId, correlationId })
		return { success: true, exercisesUpdated: 0 }
	}

	// Step 3: Get current proficiency levels for mastery upgrade logic
	const currentProficiencyMap = new Map<string, number>()
	if (lessonType === "unittest" || lessonType === "coursechallenge") {
		// For unit tests, we need to check current proficiency to handle mastery upgrades
		const onerosterResourceSourcedIds = Array.from(new Set(qtiItemIdToOneRosterResourceSourcedIdMap.values()))

		// Get current results for all exercises being tested
		const currentResultsPromises = onerosterResourceSourcedIds.map(async (onerosterResourceSourcedId) => {
			const resultsResult = await errors.try(
				oneroster.getAllResults({
					filter: `student.sourcedId='${onerosterUserSourcedId}' AND assessmentLineItem.sourcedId='${getAssessmentLineItemId(onerosterResourceSourcedId)}'`
				})
			)

			if (resultsResult.error) {
				logger.warn("failed to fetch current proficiency for mastery check", {
					onerosterResourceSourcedId,
					error: resultsResult.error,
					correlationId
				})
				return null
			}

			// Strictly consider only new attempt-based IDs for interactive assessments
			const strictLineItemId = getAssessmentLineItemId(onerosterResourceSourcedId)
			const baseIdPrefix = `nice_${onerosterUserSourcedId}_${strictLineItemId}_attempt_`
			const results = resultsResult.data.filter((r) => {
				if (typeof r.sourcedId !== "string") return false
				if (!r.sourcedId.startsWith(baseIdPrefix)) return false
				const suffix = r.sourcedId.slice(baseIdPrefix.length)
				return /^\d+$/.test(suffix)
			})
			// Get the most recent result
			if (results.length > 0) {
				const latestResult = results.sort(
					(a, b) => new Date(b.scoreDate || 0).getTime() - new Date(a.scoreDate || 0).getTime()
				)[0]

				if (latestResult && typeof latestResult.score === "number") {
					const normalized = latestResult.score <= 1.1 ? latestResult.score * 100 : latestResult.score
					return { onerosterResourceSourcedId, currentScore: normalized }
				}
			}

			return null
		})

		const currentResults = await Promise.all(currentResultsPromises)
		for (const result of currentResults) {
			if (result) {
				currentProficiencyMap.set(result.onerosterResourceSourcedId, result.currentScore)
			}
		}
	}
```


## Assistant

<thinking>


**Checking resource metadata schema**
</thinking>

**Tool Call: Read oneroster.ts**
Status: Completed

```ts
import { z } from "zod"

export const CourseMetadataSchema = z.object({
	khanId: z.string().min(1),
	khanSlug: z.string().min(1),
	khanSubjectSlug: z.string().min(1),
	khanTitle: z.string().min(1),
	khanDescription: z.string().default("")
})
export type CourseMetadata = z.infer<typeof CourseMetadataSchema>

export const ComponentMetadataSchema = z.object({
	khanId: z.string().min(1),
	khanSlug: z.string().min(1),
	khanTitle: z.string().min(1),
	khanDescription: z.string().default("")
})
export type ComponentMetadata = z.infer<typeof ComponentMetadataSchema>

// Base schema for common resource properties
const BaseResourceMetadataSchema = z.object({
	khanId: z.string().min(1),
	khanSlug: z.string().min(1),
	khanTitle: z.string().min(1),
	khanDescription: z.string().default(""),
	xp: z.number().default(0),
	// Optional shared convenience field used by our frontend for videos
	khanYoutubeId: z.string().optional(),
	// REQUIRED: Nice-controlled activity type used across the app
	khanActivityType: z.enum(["Article", "Video", "Exercise", "Quiz", "UnitTest", "CourseChallenge"])
})

// Schema for Interactive-specific metadata
const InteractiveResourceMetadataSchema = BaseResourceMetadataSchema.extend({
	type: z.literal("interactive"),
	launchUrl: z.string().url(),
	url: z.string().url().optional(),
	toolProvider: z.string().optional()
})

// Schema for QTI-specific metadata (used for exercises and assessment tests)
const QtiResourceMetadataSchema = BaseResourceMetadataSchema.extend({
	type: z.literal("qti"),
	subType: z.enum(["qti-test", "qti-stimulus", "qti-question", "qti-test-bank"]).default("qti-test"),
	url: z.string().url(),
	version: z.string().default("3.0"),
	language: z.string().default("en-US"),
	questionType: z.string().optional()
})

// The resource metadata schema supports both interactive and qti resources
export const ResourceMetadataSchema = z.discriminatedUnion("type", [
	InteractiveResourceMetadataSchema,
	QtiResourceMetadataSchema
])
export type ResourceMetadata = z.infer<typeof ResourceMetadataSchema>
export type KhanActivityType = z.infer<typeof BaseResourceMetadataSchema.shape.khanActivityType>
```


## Assistant

<thinking>


**Analyzing metadata schema and componentResource issues**

I'm exploring how the interactive resource metadata schema handles extra fields and defaults, noting that missing `khanDescription` is covered by defaults. I'm also investigating possible mismatches in `componentResource` references between quiz components and units, which might cause alignment problems. Additionally, I'm checking if `componentResource` in assessment line items is missing required `type` fields per spec, comparing with native data generation to understand why finalize errors occur.
</thinking>

**Tool Call: Search lessonType in db**
Status: Failed

```json
{"aggregated_output":"","call_id":"call_YBvTMrWBtHJ3mb4NSYN88bGy","duration":{"nanos":31460750,"secs":0},"exit_code":1,"formatted_output":"","stderr":"","stdout":""}
```

## Assistant

<thinking>


**Searching for data builder script**
</thinking>

**Tool Call: Search assessmentLineItems**
Status: Completed

```sh
assessment-stepper-mechanics.md:153:src/inngest/client.ts:			assessmentLineItems: z.array(
assessment-stepper-mechanics.md:156:src/lib/payloads/oneroster/supplementary-builder.ts:	assessmentLineItems: OneRosterAssessmentLineItem[]
assessment-stepper-mechanics.md:157:src/lib/payloads/oneroster/supplementary-builder.ts:		assessmentLineItems: []
assessment-stepper-mechanics.md:159:src/lib/payloads/oneroster/supplementary-builder.ts:						payload.assessmentLineItems.push({
assessment-stepper-mechanics.md:161:src/lib/payloads/oneroster/supplementary-builder.ts:						payload.assessmentLineItems.push({
assessment-stepper-mechanics.md:305:src/lib/payloads/oneroster/course.ts:	assessmentLineItems: OneRosterAssessmentLineItem[]
assessment-stepper-mechanics.md:319:src/lib/payloads/oneroster/course.ts:		assessmentLineItems: []
assessment-stepper-mechanics.md:320:src/lib/payloads/oneroster/course.ts:		onerosterPayload.assessmentLineItems.push({
assessment-stepper-mechanics.md:322:src/lib/payloads/oneroster/course.ts:			onerosterPayload.assessmentLineItems.push({
assessment-stepper-mechanics.md:324:src/lib/payloads/oneroster/course.ts:			onerosterPayload.assessmentLineItems.push({
assessment-stepper-mechanics.md:325:src/lib/payloads/oneroster/course.ts:					onerosterPayload.assessmentLineItems.push({
assessment-stepper-mechanics.md:326:src/lib/payloads/oneroster/course.ts:						onerosterPayload.assessmentLineItems.push({
assessment-stepper-mechanics.md:327:src/lib/payloads/oneroster/course.ts:							onerosterPayload.assessmentLineItems.push({
assessment-stepper-mechanics.md:574:src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:			const [courseComponents, resources, componentResources, assessmentLineItems] = await Promise.all([
assessment-stepper-mechanics.md:575:src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:				readFile("assessmentLineItems.json")
assessment-stepper-mechanics.md:576:src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:			return { courseComponents, resources, componentResources, assessmentLineItems }
assessment-stepper-mechanics.md:577:src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:			assessmentLineItemCount: payload.assessmentLineItems.length
assessment-stepper-mechanics.md:578:src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:		if (payload.assessmentLineItems.length > 0) {
assessment-stepper-mechanics.md:580:src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:				data: { assessmentLineItems: payload.assessmentLineItems }
assessment-stepper-mechanics.md:581:src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:				assessmentLineItems: payload.assessmentLineItems.length
assessment-stepper-mechanics.md:717:src/inngest/functions/oneroster/ingest-assessment-line-items.ts:	assessmentLineItems: z.array(z.unknown())
assessment-stepper-mechanics.md:720:src/inngest/functions/oneroster/ingest-assessment-line-items.ts:			throw errors.new("event data must contain assessmentLineItems array")
assessment-stepper-mechanics.md:721:src/inngest/functions/oneroster/ingest-assessment-line-items.ts:		for (const item of eventDataResult.data.assessmentLineItems) {
assessment-stepper-mechanics.md:741:src/inngest/functions/oneroster/generate-payload-for-course.ts:				{ name: "assessmentLineItems.json", data: payload.assessmentLineItems }
assessment-stepper-mechanics.md:742:src/inngest/functions/oneroster/generate-payload-for-course.ts:				assessmentLineItems: path.join(outputDir, "assessmentLineItems.json")
assessment-stepper-mechanics.md:743:src/inngest/functions/oneroster/generate-payload-for-course.ts:				assessmentLineItems: payload.assessmentLineItems.length
assessment-stepper-mechanics.md:783:src/app/(admin)/course-builder/actions.ts:  const assessmentLineItems: Array<{
assessment-stepper-mechanics.md:784:src/app/(admin)/course-builder/actions.ts:          assessmentLineItems.push({
assessment-stepper-mechanics.md:785:src/app/(admin)/course-builder/actions.ts:          assessmentLineItems.push({
assessment-stepper-mechanics.md:786:src/app/(admin)/course-builder/actions.ts:          assessmentLineItems.push({
assessment-stepper-mechanics.md:787:src/app/(admin)/course-builder/actions.ts:    assessmentLineItems,
assessment-stepper-mechanics.md:814:src/lib/oneroster.ts:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
assessment-stepper-mechanics.md:824:src/lib/oneroster.ts:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
assessment-stepper-mechanics.md:829:src/lib/oneroster.ts:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
assessment-stepper-mechanics.md:834:src/lib/oneroster.ts:			assessmentLineItems: z.array(AssessmentLineItemSchema)
assessment-stepper-mechanics.md:835:src/lib/oneroster.ts:			endpoint: "/ims/oneroster/gradebook/v1p2/assessmentLineItems",
assessment-stepper-mechanics.md:836:src/lib/oneroster.ts:			responseKey: "assessmentLineItems",
assessment-stepper-mechanics.md:840:src/lib/oneroster.ts:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
assessment-stepper-mechanics.md:891:src/app/(admin)/course-builder/content.tsx:            await createAssessmentLineItemsStep(payload.assessmentLineItems)
assessment-stepper-mechanics.md:1292:src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:			const assessmentLineItems = await step.run(`read-assessment-line-items-${courseId}`, async () => {
assessment-stepper-mechanics.md:1294:src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:				const filePath = path.join(courseDir, "assessmentLineItems.json")
assessment-stepper-mechanics.md:1300:src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:			if (assessmentLineItems.length > 0) {
assessment-stepper-mechanics.md:1302:src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:					data: { assessmentLineItems }
assessment-stepper-mechanics.md:1419:src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:			const [courseComponents, resources, componentResources, assessmentLineItems] = await Promise.all([
assessment-stepper-mechanics.md:1420:src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:				readFile("assessmentLineItems.json")
assessment-stepper-mechanics.md:1421:src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:			return { courseComponents, resources, componentResources, assessmentLineItems }
assessment-stepper-mechanics.md:1422:src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:			assessmentLineItemCount: payload.assessmentLineItems.length
assessment-stepper-mechanics.md:1423:src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:		if (payload.assessmentLineItems.length > 0) {
assessment-stepper-mechanics.md:1425:src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:				data: { assessmentLineItems: payload.assessmentLineItems }
assessment-stepper-mechanics.md:1426:src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:				assessmentLineItems: payload.assessmentLineItems.length
assessment-stepper-mechanics.md:2832:src/lib/oneroster.ts:1552:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
assessment-stepper-mechanics.md:2835:src/lib/oneroster.ts:1590:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
assessment-stepper-mechanics.md:2838:src/lib/oneroster.ts:1611:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
assessment-stepper-mechanics.md:2840:src/lib/oneroster.ts:1636:			endpoint: "/ims/oneroster/gradebook/v1p2/assessmentLineItems",
assessment-stepper-mechanics.md:2843:src/lib/oneroster.ts:1664:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
assessment-stepper-mechanics.md:3122:src/lib/payloads/oneroster/course.ts:536:		onerosterPayload.assessmentLineItems.push({
assessment-stepper-mechanics.md:3124:src/lib/payloads/oneroster/course.ts:574:			onerosterPayload.assessmentLineItems.push({
assessment-stepper-mechanics.md:3125:src/lib/payloads/oneroster/course.ts:593:			onerosterPayload.assessmentLineItems.push({
assessment-stepper-mechanics.md:3126:src/lib/payloads/oneroster/course.ts:615:					onerosterPayload.assessmentLineItems.push({
assessment-stepper-mechanics.md:3129:src/lib/payloads/oneroster/course.ts:781:						onerosterPayload.assessmentLineItems.push({
assessment-stepper-mechanics.md:3130:src/lib/payloads/oneroster/course.ts:800:							onerosterPayload.assessmentLineItems.push({
assessment-stepper-mechanics.md:5500:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
src/lib/oneroster.ts:1552:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
src/lib/oneroster.ts:1590:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
src/lib/oneroster.ts:1611:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
src/lib/oneroster.ts:1629:			assessmentLineItems: z.array(AssessmentLineItemSchema)
src/lib/oneroster.ts:1636:			endpoint: "/ims/oneroster/gradebook/v1p2/assessmentLineItems",
src/lib/oneroster.ts:1637:			responseKey: "assessmentLineItems",
src/lib/oneroster.ts:1664:			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
src/lib/payloads/oneroster/supplementary-builder.ts:92:	assessmentLineItems: OneRosterAssessmentLineItem[]
src/lib/payloads/oneroster/supplementary-builder.ts:361:		assessmentLineItems: []
src/lib/payloads/oneroster/supplementary-builder.ts:601:						payload.assessmentLineItems.push({
src/lib/payloads/oneroster/supplementary-builder.ts:620:						payload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:155:	assessmentLineItems: OneRosterAssessmentLineItem[]
src/lib/payloads/oneroster/course.ts:460:		assessmentLineItems: []
src/lib/payloads/oneroster/course.ts:536:		onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:574:			onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:593:			onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:615:					onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:781:						onerosterPayload.assessmentLineItems.push({
src/lib/payloads/oneroster/course.ts:800:							onerosterPayload.assessmentLineItems.push({
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:42:			const [courseComponents, resources, componentResources, assessmentLineItems] = await Promise.all([
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:46:				readFile("assessmentLineItems.json")
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:49:			return { courseComponents, resources, componentResources, assessmentLineItems }
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:57:			assessmentLineItemCount: payload.assessmentLineItems.length
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:112:		if (payload.assessmentLineItems.length > 0) {
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:115:				data: { assessmentLineItems: payload.assessmentLineItems }
src/inngest/functions/orchestrate-course-upload-to-oneroster-by-slug.ts:132:				assessmentLineItems: payload.assessmentLineItems.length
src/inngest/functions/oneroster/ingest-assessment-line-items.ts:26:	assessmentLineItems: z.array(z.unknown())
src/inngest/functions/oneroster/ingest-assessment-line-items.ts:41:			throw errors.new("event data must contain assessmentLineItems array")
src/inngest/functions/oneroster/ingest-assessment-line-items.ts:48:		for (const item of eventDataResult.data.assessmentLineItems) {
src/inngest/functions/oneroster/generate-payload-for-course.ts:73:				{ name: "assessmentLineItems.json", data: payload.assessmentLineItems }
src/inngest/functions/oneroster/generate-payload-for-course.ts:109:				assessmentLineItems: path.join(outputDir, "assessmentLineItems.json")
src/inngest/functions/oneroster/generate-payload-for-course.ts:115:				assessmentLineItems: payload.assessmentLineItems.length
scripts/create-percentage-results.ts:48:	const assessmentLineItemsPath = path.join(
scripts/create-percentage-results.ts:50:		"data/ms-biology/oneroster/assessmentLineItems.json"
scripts/create-percentage-results.ts:53:	logger.info("reading assessment line items", { path: assessmentLineItemsPath })
scripts/create-percentage-results.ts:55:	const fileResult = await errors.try(fs.readFile(assessmentLineItemsPath, "utf-8"))
scripts/create-percentage-results.ts:57:		logger.error("failed to read file", { error: fileResult.error, path: assessmentLineItemsPath })
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:46:			const [courseComponents, resources, componentResources, assessmentLineItems] = await Promise.all([
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:50:				readFile("assessmentLineItems.json")
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:53:			return { courseComponents, resources, componentResources, assessmentLineItems }
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:61:			assessmentLineItemCount: payload.assessmentLineItems.length
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:116:		if (payload.assessmentLineItems.length > 0) {
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:119:				data: { assessmentLineItems: payload.assessmentLineItems }
src/inngest/functions/orchestrate-course-upload-to-oneroster.ts:136:				assessmentLineItems: payload.assessmentLineItems.length
src/inngest/client.ts:247:			assessmentLineItems: z.array(
course-cartridge-master-plan.md:26:- `assessmentLineItems.json`
course-cartridge-master-plan.md:154:   - The orchestrator reads those files and fan-outs ingestion calls (course, resources, courseComponents, componentResources, class, assessmentLineItems).
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:37:			const assessmentLineItems = await step.run(`read-assessment-line-items-${courseId}`, async () => {
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:40:				const filePath = path.join(courseDir, "assessmentLineItems.json")
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:68:			if (assessmentLineItems.length > 0) {
src/inngest/functions/migrations/orchestrate-hardcoded-science-assessmentlineitem-upload.ts:71:					data: { assessmentLineItems }
scripts/atom-bomb-wipe.ts:12: *        classes, users, enrollments, assessmentLineItems, assessmentResults,
scripts/atom-bomb-wipe.ts:37:	"assessmentLineItems",
scripts/atom-bomb-wipe.ts:292:	assessmentLineItems: {
scripts/atom-bomb-wipe.ts:293:		type: "assessmentLineItems",
scripts/atom-bomb-wipe.ts:547:				"assessmentLineItems",
scripts/atom-bomb-wipe.ts:634:			"assessmentLineItems",
scripts/atom-bomb-wipe.ts:820:				"             classes, users, enrollments, assessmentLineItems, assessmentResults\n" +
scripts/generate-supplementary-course.ts:136:		{ name: "assessmentLineItems.json", data: payload.assessmentLineItems }
scripts/generate-supplementary-course.ts:166:		assessmentLineItemCount: payload.assessmentLineItems.length
scripts/generate-supplementary-course.ts:176:	console.log(`   - assessmentLineItems.json (${payload.assessmentLineItems.length} items)`)
scripts/convert-cartridge-to-oneroster.ts:101:  assessmentLineItems: OneRosterAssessmentLineItem[]
scripts/convert-cartridge-to-oneroster.ts:396:    assessmentLineItems: []
scripts/convert-cartridge-to-oneroster.ts:541:          payload.assessmentLineItems.push({
scripts/convert-cartridge-to-oneroster.ts:622:          payload.assessmentLineItems.push({
scripts/convert-cartridge-to-oneroster.ts:781:      payload.assessmentLineItems.push({
scripts/convert-cartridge-to-oneroster.ts:886:    { name: "assessmentLineItems.json", data: payload.assessmentLineItems }
scripts/convert-cartridge-to-oneroster.ts:906:      assessmentLineItems: payload.assessmentLineItems.length
src/app/(admin)/course-builder/content.tsx:801:            await createAssessmentLineItemsStep(payload.assessmentLineItems)
src/app/(admin)/course-builder/actions.ts:166:  const assessmentLineItems: Array<{
src/app/(admin)/course-builder/actions.ts:319:          assessmentLineItems.push({
src/app/(admin)/course-builder/actions.ts:332:          assessmentLineItems.push({
src/app/(admin)/course-builder/actions.ts:347:          assessmentLineItems.push({
src/app/(admin)/course-builder/actions.ts:400:    assessmentLineItems,
```


## Assistant

<thinking>


**Inspecting baseline file course.ts**
</thinking>

**Tool Call: Read course.ts**
Status: Completed

```ts
	}

	// Helper to process a single content type array
	async function fetchCaseIdsForContentType(
		contentType: "Video" | "Article" | "Exercise",
		ids: string[]
	): Promise<void> {
		if (ids.length === 0) {
			return
		}
		const result = await errors.try(
			db
				.select({
					contentId: schema.niceLessonContentsCommonCoreStandards.contentId,
					caseId: schema.niceCommonCoreStandards.caseId
				})
				.from(schema.niceLessonContentsCommonCoreStandards)
				.innerJoin(
					schema.niceCommonCoreStandards,
					eq(schema.niceLessonContentsCommonCoreStandards.commonCoreStandardId, schema.niceCommonCoreStandards.id)
				)
				.where(
					and(
						inArray(schema.niceLessonContentsCommonCoreStandards.contentId, ids),
						eq(schema.niceLessonContentsCommonCoreStandards.contentType, contentType)
					)
				)
		)
		if (result.error) {
			logger.error("failed to fetch case ids for content", { contentType, count: ids.length, error: result.error })
			throw errors.wrap(result.error, "database query for case ids")
		}
		for (const row of result.data) {
			addLearningObjective(contentType, row.contentId, row.caseId)
		}
	}

	// Fetch for each type sequentially (data dependent on type); each call handles empty lists
	await fetchCaseIdsForContentType("Video", contentIds.Video)
	await fetchCaseIdsForContentType("Article", contentIds.Article)
	await fetchCaseIdsForContentType("Exercise", contentIds.Exercise)

	const [videos, articles, exercises] = await Promise.all([
		contentIds.Video.length
			? db.query.niceVideos.findMany({ where: inArray(schema.niceVideos.id, contentIds.Video) })
			: Promise.resolve([]),
		contentIds.Article.length
			? db.query.niceArticles.findMany({ where: inArray(schema.niceArticles.id, contentIds.Article) })
			: Promise.resolve([]),
		contentIds.Exercise.length
			? db.query.niceExercises.findMany({ where: inArray(schema.niceExercises.id, contentIds.Exercise) })
			: Promise.resolve([])
	])

	// Pre-process: identify articles with titles matching 'Activity:%' (case insensitive)
	const activityArticleIds = new Set<string>()
	for (const article of articles) {
		if (article.title.toLowerCase().startsWith("activity:")) {
			activityArticleIds.add(article.id)
		}
	}
	logger.debug("identified activity articles for deletion", { count: activityArticleIds.size })

	const contentMap = new Map<
		string,
		{ id: string; path: string; title: string; slug: string; type: string; description?: string }
	>([
		...videos.map((v) => [v.id, { ...v, type: "Video" }] as const),
		...articles.map((a) => [a.id, { ...a, type: "Article" }] as const),
		...exercises.map((e) => [e.id, { ...e, type: "Exercise" }] as const)
	])

	// Create a mapping from exercise ID to lesson ID
	const exerciseToLessonMap = new Map<string, string>()
	for (const lc of lessonContents) {
		if (lc.contentType === "Exercise") {
			exerciseToLessonMap.set(lc.contentId, lc.lessonId)
		}
	}

	// Build helper sets to ensure every exercise gets an ALI exactly once
```


## Assistant

<thinking>


**Searching for component resource ID usage**
</thinking>

**Tool Call: Read course.ts**
Status: Completed

```ts
				)
				.where(
					and(
						inArray(schema.niceLessonContentsCommonCoreStandards.contentId, ids),
						eq(schema.niceLessonContentsCommonCoreStandards.contentType, contentType)
					)
				)
		)
		if (result.error) {
			logger.error("failed to fetch case ids for content", { contentType, count: ids.length, error: result.error })
			throw errors.wrap(result.error, "database query for case ids")
		}
		for (const row of result.data) {
			addLearningObjective(contentType, row.contentId, row.caseId)
		}
	}

	// Fetch for each type sequentially (data dependent on type); each call handles empty lists
	await fetchCaseIdsForContentType("Video", contentIds.Video)
	await fetchCaseIdsForContentType("Article", contentIds.Article)
	await fetchCaseIdsForContentType("Exercise", contentIds.Exercise)

	const [videos, articles, exercises] = await Promise.all([
		contentIds.Video.length
			? db.query.niceVideos.findMany({ where: inArray(schema.niceVideos.id, contentIds.Video) })
			: Promise.resolve([]),
		contentIds.Article.length
			? db.query.niceArticles.findMany({ where: inArray(schema.niceArticles.id, contentIds.Article) })
			: Promise.resolve([]),
		contentIds.Exercise.length
			? db.query.niceExercises.findMany({ where: inArray(schema.niceExercises.id, contentIds.Exercise) })
			: Promise.resolve([])
	])

	// Pre-process: identify articles with titles matching 'Activity:%' (case insensitive)
	const activityArticleIds = new Set<string>()
	for (const article of articles) {
		if (article.title.toLowerCase().startsWith("activity:")) {
			activityArticleIds.add(article.id)
		}
	}
```


## Assistant

<thinking>


**Searching for specific snippet**
</thinking>

**Tool Call: Search componentResource in course.ts**
Status: Completed

```sh
138:	componentResource?: {
153:	componentResources: OneRosterCourseComponentResource[]
459:		componentResources: [],
540:			componentResource: {
578:				componentResource: {
597:				componentResource: {
619:						componentResource: {
785:								componentResource: {
804:								componentResource: {
829:					const componentResourceStatus: "active" | "tobedeleted" = isActivityArticle ? "tobedeleted" : "active"
830:					onerosterPayload.componentResources.push({
832:						status: componentResourceStatus,
924:			onerosterPayload.componentResources.push({
1011:			onerosterPayload.componentResources.push({
1038:	for (const cr of onerosterPayload.componentResources) {
1046:				componentResourceId: cr.sourcedId,
1091:		const componentResources = onerosterPayload.componentResources.filter(
1094:		const hasActiveComponentResources = componentResources.some((cr) => cr.status === "active")
```


## Assistant

<thinking>


**Seeking code snippet near line 804**
</thinking>

**Tool Call: Read course.ts**
Status: Completed

```ts
						const aliStatus: "active" | "tobedeleted" = isActivityArticle ? "tobedeleted" : "active"
						onerosterPayload.assessmentLineItems.push({
							sourcedId: `${contentSourcedId}_ali`, // The ID is resource ID + _ali
							status: aliStatus,
							title: `Progress for: ${content.title}`,
								componentResource: {
									sourcedId: `nice_${lesson.id}_${content.id}`
								},
								course: {
									sourcedId: `nice_${course.id}`
								},
								metadata: {
									lessonType: content.type.toLowerCase(),
									courseSourcedId: `nice_${course.id}`
								}
							})
						}

						// --- NEW: Ensure exercises always have an ALI, even when not attached to a quiz ---
						if (content.type === "Exercise" && !exerciseIdsAttachedToQuizzes.has(content.id)) {
							onerosterPayload.assessmentLineItems.push({
								sourcedId: `${contentSourcedId}_ali`,
								status: "active",
								title: content.title,
								componentResource: {
									sourcedId: `nice_${lesson.id}_${content.id}`
								},
								course: {
									sourcedId: `nice_${course.id}`
								},
								metadata: {
									lessonType: "exercise",
									courseSourcedId: `nice_${course.id}`
								}
							})
						}
					}

					// Apply bracketed suffix to ComponentResource titles for Video/Article/Exercise only
					let componentTitle = content.title
					if (lc.contentType === "Video") {
						componentTitle = formatResourceTitleForDisplay(content.title, "Video")
					} else if (lc.contentType === "Article") {
						componentTitle = formatResourceTitleForDisplay(content.title, "Article")
					} else if (lc.contentType === "Exercise") {
						componentTitle = formatResourceTitleForDisplay(content.title, "Exercise")
					}

					const isActivityArticle = lc.contentType === "Article" && activityArticleIds.has(content.id)
					const componentResourceStatus: "active" | "tobedeleted" = isActivityArticle ? "tobedeleted" : "active"
					onerosterPayload.componentResources.push({
						sourcedId: `nice_${lesson.id}_${content.id}`,
						status: componentResourceStatus,
						title: componentTitle,
						courseComponent: { sourcedId: `nice_${lesson.id}`, type: "courseComponent" },
					resource: { sourcedId: contentSourcedId, type: "resource" },
					sortOrder: lc.ordering
					})
				}
			}
		}
```


## Assistant

<thinking>


**Analyzing componentResource ID mismatches**
</thinking>

**Tool Call: Read proficiency.ts**
Status: Completed

```ts

	// Step 4: Aggregate performance by exercise
	const performanceMap = new Map<string, ExercisePerformance>()

	for (const question of questionResultsFromSession) {
		const onerosterResourceSourcedId = qtiItemIdToOneRosterResourceSourcedIdMap.get(question.id)
		if (!onerosterResourceSourcedId) {
			logger.warn("could not map question to exercise", {
				qtiItemId: question.id,
				onerosterComponentResourceSourcedId,
				correlationId
			})
			continue
		}

		if (!performanceMap.has(onerosterResourceSourcedId)) {
			performanceMap.set(onerosterResourceSourcedId, {
				exerciseId: onerosterResourceSourcedId,
				correctCount: 0,
				totalCount: 0
			})
		}

		const performance = performanceMap.get(onerosterResourceSourcedId)
		if (performance) {
			performance.totalCount++
			if (question.correct) {
				performance.correctCount++
			}

			// Log each question's contribution to help debug
			logger.debug("processing question for exercise", {
				qtiItemId: question.id,
				onerosterResourceSourcedId,
				isCorrect: question.correct,
				runningCorrect: performance.correctCount,
				runningTotal: performance.totalCount,
				correlationId
			})
		}
	}

	if (performanceMap.size === 0) {
		logger.info("no exercises found with answered questions to update", {
			onerosterComponentResourceSourcedId,
			correlationId
		})
		return { success: true, exercisesUpdated: 0 }
	}

	// Step 5: Calculate proficiency scores with mastery upgrade logic
	const updatePromises: Promise<unknown>[] = []
	for (const [exerciseId, performance] of performanceMap.entries()) {
		const percentageCorrect = performance.totalCount > 0 ? performance.correctCount / performance.totalCount : 0

		// Use the centralized proficiency calculation service
		const proficiencyScore = calculateProficiencyScore({
			percentageCorrect,
			lessonType,
			currentScore: currentProficiencyMap.get(exerciseId)
		})

		logger.info("calculated exercise proficiency", {
			exerciseId,
			score: proficiencyScore,
			performance,
			currentScore: currentProficiencyMap.get(exerciseId),
			lessonType,
			correlationId
		})

		// Only save if there's a meaningful update
		const shouldSaveResult =
			proficiencyScore > 0 ||
			(percentageCorrect === 0 &&
				(lessonType === "unittest" || lessonType === "coursechallenge") &&
				currentProficiencyMap.has(exerciseId)) ||
			(proficiencyScore === 0 && currentProficiencyMap.has(exerciseId)) ||
			(proficiencyScore === 0 &&
				(lessonType === "quiz" || lessonType === "unittest" || lessonType === "coursechallenge"))

		if (shouldSaveResult) {
			// Use base id (no attempt) with descriptive comment/xpReason
			const resultSourcedId = generateResultSourcedId(onerosterUserSourcedId, exerciseId, false)
			const lineItemId = getAssessmentLineItemId(exerciseId)
			const metadata = {
				masteredUnits: 0,
				totalQuestions: performance.totalCount,
				correctQuestions: performance.correctCount,
				accuracy: Math.round(percentageCorrect * 100),
				xp: 0,
				multiplier: 0,
				penaltyApplied: false,
				xpReason: "Proficiency update from summative assessment",
				completedAt: new Date().toISOString(),
				courseSourcedId: onerosterCourseSourcedId
			}

			updatePromises.push(
				gradebook.saveResult({
					resultSourcedId,
					lineItemSourcedId: lineItemId,
					userSourcedId: onerosterUserSourcedId,
					score: assertPercentageInteger(proficiencyScore, "proficiency score"),
					comment: `Proficiency updated from assessment ${onerosterComponentResourceSourcedId}`,
					metadata,
					correlationId
				})
			)
		}
	}

	const results = await Promise.allSettled(updatePromises)
	const successfulUpdates = results.filter((r) => r.status === "fulfilled").length

	logger.info("granular proficiency analysis complete", {
		onerosterComponentResourceSourcedId,
		exercisesAnalyzed: performanceMap.size,
		exercisesUpdated: successfulUpdates,
		questionsMapped: qtiItemIdToOneRosterResourceSourcedIdMap.size,
		totalQuestions: questionResultsFromSession.length,
		correlationId
	})

	return { success: true, exercisesUpdated: successfulUpdates }
}
```


## Assistant

<thinking>


**Analyzing failure cause in proficiency update**
</thinking>

**Tool Call: Search khanExerciseId in convert-cartridge-to-oneroster.ts**
Status: Completed

```sh
684:                  khanExerciseId: stripNicePrefix(resourceId),
841:            khanExerciseId: stripNicePrefix(resourceId),
```


**Tool Call: Read convert-cartridge-to-oneroster.ts**
Status: Completed

```ts
              const originalXml = q.xml?.trim() && q.xml.includes("<") ? q.xml : await readQuestionXml(reader, q.xml || "")
              if (!originalXml || originalXml === "") {
                logger.error("question xml empty after read", { quizId: res.id, questionNumber: q.number, xmlPath: q.xml })
                throw errors.new("question: xml is required")
              }
            // Debug: write and log exact original XML from cartridge
            const quizDebugDir = path.join(debugBaseDir, "quizzes", res.id)
            await ensureDir(quizDebugDir)
            const originalQuizItemPath = path.join(quizDebugDir, `question-${String(q.number).padStart(2, "0")}.original.xml`)
            const writeOrigQuizRes = await errors.try(fs.writeFile(originalQuizItemPath, originalXml, "utf-8"))
            if (writeOrigQuizRes.error) {
              logger.error("debug write failed (quiz original)", { file: originalQuizItemPath, error: writeOrigQuizRes.error })
            }
              logger.debug("quiz question xml (original)", {
                quizId: res.id,
                questionNumber: q.number,
                xml: originalXml
              })
              // Always rewrite identifier to our stable scheme: nice_<quizId>_<questionNumber>
              const newItemId = qtiItemIdForQuiz(slug, unit.id, lesson.id, res.id, q.number)
            const rewriteRes = errors.trySync(() => replaceRootAttributes(originalXml, "qti-assessment-item", newItemId, lesson.title))
            if (rewriteRes.error) {
              logger.error("identifier rewrite failed (quiz)", { quizId: res.id, questionNumber: q.number, error: rewriteRes.error })
              // keep original file already written; bail out fast
              throw rewriteRes.error
            }
            const rewrittenXml = rewriteRes.data
              // Debug: log the rewritten XML
              logger.debug("quiz question xml (rewritten)", {
                quizId: res.id,
                questionNumber: q.number,
                identifier: newItemId,
                xml: rewrittenXml
              })
            const rewrittenQuizItemPath = path.join(quizDebugDir, `question-${String(q.number).padStart(2, "0")}.rewritten.xml`)
            const writeRewQuizRes = await errors.try(fs.writeFile(rewrittenQuizItemPath, rewrittenXml, "utf-8"))
            if (writeRewQuizRes.error) {
              logger.error("debug write failed (quiz rewritten)", { file: rewrittenQuizItemPath, error: writeRewQuizRes.error })
            }
              questionIds.push(newItemId)
              qtiItems.push({
                xml: rewrittenXml,
                metadata: {
                  khanId: newItemId,
                  khanExerciseId: stripNicePrefix(resourceId),
                  khanExerciseSlug: quizSlug,
                  khanExerciseTitle: lesson.title
                }
              })
            }
            // Generate test for this quiz
            // IMPORTANT: Set test identifier equal to the resource sourcedId so providers can map directly
            const quizTestId = resourceId
            const quizTestXml = generateTestXml(quizTestId, lesson.title, questionIds)
            // Debug: log the generated test XML
            logger.debug("quiz test xml", { quizId: res.id, xml: quizTestXml })
            const quizTestPath = path.join(path.join(debugBaseDir, "quizzes", res.id), `test.xml`)
            const writeQuizTestRes = await errors.try(fs.writeFile(quizTestPath, quizTestXml, "utf-8"))
            if (writeQuizTestRes.error) {
              logger.error("debug write failed (quiz test)", { file: quizTestPath, error: writeQuizTestRes.error })
            }
            qtiTestsXml.push(quizTestXml)
            exerciseToItemIds.set(res.id, questionIds)
            logger.debug("generated qti items and test for quiz", { quizId: res.id, itemCount: questionIds.length })
          }

          totalXp += QUIZ_XP
          totalLessons += 1
        }
      }
    }

    // Unit test (optional) - process once per unit, OUTSIDE lesson loop
    if (unit.unitTest) {
      const unitEntry = indexJson.units.find((u) => u.id === unit.id)
      const unitSlug = normalizePathSlug(unitEntry?.path ?? unit.id)
      const lastLesson = lessons[lessons.length - 1]
      if (!lastLesson) {
        logger.error("assessment launch url: no lessons in unit", { unitId: unit.id })
        throw errors.new("assessment launch url: no lessons in unit")
      }
```


## Assistant

<thinking>


**Analyzing script course finalization failure**

I'm untangling a complex issue where script courses fail to save final results during finalization. The root seems to stem from mismatched metadata: `khanExerciseId` is set to a hashed quiz resource ID, not the actual exercise, causing proficiency updates to target the quiz's line item rather than the exercise's. This leads to conflicts or missing data in gradebook calls, though the quiz line item exists. I'm also examining how componentResources are structured differently in scripts—assigned under units instead of lessons—and how hashed IDs might cause unexpected clashes or missing expected metadata fields like `khanActivityType`. Despite several hypotheses and logical tracing, the exact failing step remains uncertain without concrete logs. There is a lot here, so I’m carefully following through the interactions between assessment saving, proficiency updating, and resource metadata parsing to identify where the final save breaks down.
</thinking>

**Tool Call: Read oneroster.log.txt**
Status: Failed

```txt
tail: oneroster.log.txt: No such file or directory
```


## Assistant

<thinking>


**Checking file path for log**
</thinking>

**Tool Call: List /Users/bjorn/Documents/Code/nice/oneroster.log.txt**
Status: Failed

```sh
ls: oneroster.log.txt: No such file or directory
```


## Assistant

<thinking>


**Verifying filename discrepancies**
</thinking>

**Tool Call: List /Users/bjorn/Documents/Code/nice, Search oneroster**
Status: Failed

```json
{"aggregated_output":"","call_id":"call_zEuvkMGvuXVShLYc8J67hA42","duration":{"nanos":43792167,"secs":0},"exit_code":1,"formatted_output":"","stderr":"","stdout":""}
```

## Assistant

<thinking>


**Analyzing script-generated quiz finalization failure**

I'm tracing why the quiz finalization fails only for script-created courses. The script uses hashed IDs and seems to create component resources and line items, but the gradebook finalization trips when saving results—likely due to missing or mismatched assessment line items or componentResource typings. I need to confirm if ingestion expects specific fields like `type` on componentResource, which the script might omit, causing gradebook saveResult to fail despite the quiz completing correctly.
</thinking>

**Tool Call: Read convert-cartridge-to-oneroster.ts**
Status: Completed

```ts
type OneRosterGUIDRef = { sourcedId: string; type: "course" | "academicSession" | "org" | "courseComponent" | "resource" | "term" | "district" }

type OneRosterCourse = {
  sourcedId: string
  status: "active"
  title: string
  subjects: string[]
  grades: number[]
  courseCode: string
  org: OneRosterGUIDRef
  academicSession: OneRosterGUIDRef
  metadata?: Record<string, unknown>
}

type OneRosterClass = {
  sourcedId: string
  status: "active"
  title: string
  classType: "scheduled"
  course: OneRosterGUIDRef
  school: OneRosterGUIDRef
  terms: OneRosterGUIDRef[]
}

type OneRosterCourseComponent = {
  sourcedId: string
  status: "active" | "tobedeleted"
  title: string
  course: OneRosterGUIDRef
  parent?: OneRosterGUIDRef
  sortOrder: number
  metadata?: Record<string, unknown>
}

type OneRosterResource = {
  sourcedId: string
  status: "active" | "tobedeleted"
  title: string
  vendorResourceId: string
  vendorId: string
  applicationId: string
  roles: string[]
  importance: "primary" | "secondary"
  metadata: Record<string, unknown>
}

type OneRosterCourseComponentResource = {
  sourcedId: string
  status: "active" | "tobedeleted"
  title: string
  courseComponent: OneRosterGUIDRef
  resource: OneRosterGUIDRef
  sortOrder: number
}

type OneRosterAssessmentLineItem = {
  sourcedId: string
  status: "active" | "tobedeleted"
  title: string
  componentResource?: { sourcedId: string }
  course: { sourcedId: string }
  metadata?: Record<string, unknown>
}

type OneRosterPayload = {
  course: OneRosterCourse
  class: OneRosterClass
  courseComponents: OneRosterCourseComponent[]
  resources: OneRosterResource[]
  componentResources: OneRosterCourseComponentResource[]
  assessmentLineItems: OneRosterAssessmentLineItem[]
}

function mapSubjectToOneRosterSubjects(subject: string): string[] {
  const mapping: Record<string, string[]> = {
```


## Assistant

<thinking>


**Analyzing componentResource type issues**
</thinking>

**Tool Call: Run python - <<'PY'…**
Status: Failed

Terminal:
```
bash: cannot create temp file for here document: Operation not permitted





```


## Assistant

<thinking>


**Checking file access limitations**
</thinking>

**Tool Call: Run perl -ne 'print if /assessmentLineItems.push/..$.==0' src/lib/payloads/oneroster/course.ts**
Status: Completed

Terminal:
```
		onerosterPayload.assessmentLineItems.push({
			sourcedId: `nice_${courseChallenge.id}_ali`,
			status: "active",
			title: courseChallenge.title,
			componentResource: {
				sourcedId: `nice_${course.id}_${courseChallenge.id}`
			},
			course: {
				sourcedId: `nice_${course.id}`
			},
			metadata: {
				lessonType: "coursechallenge",
				courseSourcedId: `nice_${course.id}`
			}
		})
	}

	for (const unit of units.sort((a, b) => a.ordering - b.ordering)) {
		// REFACTOR: Track passive resource IDs for next exercise to enable pre-calculated XP banking
		let passiveResourcesForNextExercise: string[] = []

		onerosterPayload.courseComponents.push({
			sourcedId: `nice_${unit.id}`,
			status: "active",
			title: unit.title,
			course: { sourcedId: `nice_${course.id}`, type: "course" },
			sortOrder: unit.ordering,
			metadata: {
				khanId: unit.id,
				khanSlug: unit.slug,
				khanTitle: unit.title,
				khanDescription: unit.description
			}
		})

		const unitTest = assessments.find((a) => a.parentId === unit.id && a.type === "UnitTest")

		if (unitTest) {
			onerosterPayload.assessmentLineItems.push({
				sourcedId: `nice_${unitTest.id}_ali`,
				status: "active",
				title: unitTest.title,
				componentResource: {
					sourcedId: `nice_${unitTest.id}_${unitTest.id}`
				},
				course: {
					sourcedId: `nice_${course.id}`
				},
				metadata: {
					lessonType: "unittest",
					courseSourcedId: `nice_${course.id}`
				}
			})
		}

		const unitQuizzes = assessments.filter((a) => a.parentId === unit.id && a.type === "Quiz")
		for (const quiz of unitQuizzes.sort((a, b) => a.ordering - b.ordering)) {
			onerosterPayload.assessmentLineItems.push({
				sourcedId: `nice_${quiz.id}_ali`,
				status: "active",
				title: quiz.title,
				componentResource: {
					sourcedId: `nice_${quiz.id}_${quiz.id}`
				},
				course: {
					sourcedId: `nice_${course.id}`
				},
				metadata: {
					lessonType: "quiz",
					courseSourcedId: `nice_${course.id}`
				}
			})

			// Find exercises for this quiz and create their line items
			const quizExerciseIds = exercisesByAssessmentId.get(quiz.id) || []
			for (const exerciseId of quizExerciseIds) {
				const exercise = exercises.find((e) => e.id === exerciseId)
				const lessonId = exerciseToLessonMap.get(exerciseId)
				if (exercise && lessonId) {
					onerosterPayload.assessmentLineItems.push({
						sourcedId: `nice_${exercise.id}_ali`,
						status: "active",
						title: exercise.title,
						componentResource: {
							sourcedId: `nice_${lessonId}_${exercise.id}`
						},
						course: {
							sourcedId: `nice_${course.id}`
						},
						metadata: {
							lessonType: "exercise",
							courseSourcedId: `nice_${course.id}`
						}
					})
				}
			}
		}

		const unitLessons = lessons.filter((l) => l.unitId === unit.id).sort((a, b) => a.ordering - b.ordering)
		for (const lesson of unitLessons) {
			onerosterPayload.courseComponents.push({
				sourcedId: `nice_${lesson.id}`,
				status: "active",
				title: lesson.title,
				course: { sourcedId: `nice_${course.id}`, type: "course" },
				parent: { sourcedId: `nice_${unit.id}`, type: "courseComponent" },
				sortOrder: lesson.ordering,
				metadata: {
					khanId: lesson.id,
					khanSlug: lesson.slug,
					khanTitle: lesson.title,
					khanDescription: lesson.description
				}
			})

			const lessonContentLinks = lessonContents
				.filter((lc) => lc.lessonId === lesson.id)
				.sort((a, b) => a.ordering - b.ordering)
			for (const lc of lessonContentLinks) {
				const content = contentMap.get(lc.contentId)
				if (content) {
					const contentSourcedId = `nice_${content.id}`
					if (!resourceSet.has(contentSourcedId)) {
						// No suffixing on Resource titles; suffixing is applied to ComponentResource titles below

						// Construct metadata based on content type
						let metadata: Record<string, unknown> = {
							khanId: content.id,
							khanSlug: content.slug,
							khanTitle: content.title,
							khanDescription: content.description,
							// Construct the base path for the launchUrl
							path: `/${subjectSlug}/${course.slug}/${unit.slug}/${lesson.slug}`
						}

					if (lc.contentType === "Article") {
						// CHANGE: Convert Articles to interactive type
						let articleXp: number | undefined
						const articleXpResult = await errors.try(computeArticleXpFromStimulus(content.id))
						if (articleXpResult.error) {
							logger.error("qti xp: failed computing article xp from stimulus", {
								articleId: content.id,
								slug: content.slug,
								error: articleXpResult.error
							})
							throw articleXpResult.error
						}
						articleXp = articleXpResult.data
						metadata = {
							...metadata,
							type: "interactive",
							toolProvider: "Nice Academy",
							khanActivityType: "Article",
							launchUrl: `${appDomain}${metadata.path}/a/${content.slug}`,
							url: `${appDomain}${metadata.path}/a/${content.slug}`,
							xp: articleXp
						}

						// REFACTOR: Collect sourcedId of passive resource if it grants XP AND is not an activity article
						const isActivityArticle = activityArticleIds.has(content.id)
						if (articleXp > 0 && !isActivityArticle) {
							passiveResourcesForNextExercise.push(contentSourcedId)
						}
					} else if (lc.contentType === "Video") {
						// CHANGE: Convert Videos to interactive type
						const videoData = videos.find((v) => v.id === content.id)
						if (!videoData?.youtubeId) {
							logger.error("CRITICAL: Missing youtubeId for video", { contentId: content.id, slug: content.slug })
							throw errors.new("video metadata: youtubeId is required for interactive video resource")
						}
						// XP calculation: round to nearest minute (>= 7:30 => 8xp), no fallbacks
						if (typeof videoData.duration !== "number") {
							logger.error("CRITICAL: Missing duration for video", { contentId: content.id, slug: content.slug })
							throw errors.new("video metadata: duration is required for interactive video resource")
						}
						const computedVideoXp = Math.max(1, Math.ceil(videoData.duration / 60))
						metadata = {
							...metadata,
							type: "interactive",
							toolProvider: "Nice Academy",
							khanActivityType: "Video",
							launchUrl: `${appDomain}${metadata.path}/v/${content.slug}`,
							url: `${appDomain}${metadata.path}/v/${content.slug}`,
							khanYoutubeId: videoData.youtubeId,
							xp: computedVideoXp
						}

						// REFACTOR: Collect sourcedId of passive resource if it grants XP
						if (computedVideoXp > 0) {
							passiveResourcesForNextExercise.push(contentSourcedId)
						}
					} else if (lc.contentType === "Exercise") {
						metadata = {
							...metadata,
							type: "interactive",
							toolProvider: "Nice Academy",
							khanActivityType: "Exercise",
							launchUrl: `${appDomain}${metadata.path}/e/${content.slug}`,
							url: `${appDomain}${metadata.path}/e/${content.slug}`,
							xp: EXERCISE_XP,
							// REFACTOR: Attach the collected list of passive resource IDs
							passiveResources: null,
							nice_passiveResources: passiveResourcesForNextExercise
						}
						// REFACTOR: Reset the collector for the next group
						passiveResourcesForNextExercise = []
						}

						// Attach CASE learning objectives to metadata when present
						{
							const caseIds = learningObjectivesByContentTypeId.get(`${lc.contentType}:${content.id}`)
							if (caseIds && caseIds.length > 0) {
								metadata = {
									...metadata,
									learningObjectiveSet: [
										{
											       source: "CASE",
											       learningObjectiveIds: caseIds
										}
									]
								}
							}
						}

						// Determine if this is an activity article that should be marked for deletion
						const isActivityArticle = lc.contentType === "Article" && activityArticleIds.has(content.id)
						const resourceStatus: "active" | "tobedeleted" = isActivityArticle ? "tobedeleted" : "active"

					onerosterPayload.resources.push({
						sourcedId: contentSourcedId,
						status: resourceStatus,
						title: content.title,
							vendorResourceId: `nice-academy-${content.id}`,
							vendorId: "superbuilders",
							applicationId: "nice",
							roles: ["primary"],
							importance: "primary",
							metadata
						})
						resourceSet.add(contentSourcedId)

					// --- NEW: Add flat line items for videos and articles here ---
					if (content.type === "Video" || content.type === "Article") {
						const isActivityArticle = content.type === "Article" && activityArticleIds.has(content.id)
						const aliStatus: "active" | "tobedeleted" = isActivityArticle ? "tobedeleted" : "active"
						onerosterPayload.assessmentLineItems.push({
							sourcedId: `${contentSourcedId}_ali`, // The ID is resource ID + _ali
							status: aliStatus,
							title: `Progress for: ${content.title}`,
								componentResource: {
									sourcedId: `nice_${lesson.id}_${content.id}`
								},
								course: {
									sourcedId: `nice_${course.id}`
								},
								metadata: {
									lessonType: content.type.toLowerCase(),
									courseSourcedId: `nice_${course.id}`
								}
							})
						}

						// --- NEW: Ensure exercises always have an ALI, even when not attached to a quiz ---
						if (content.type === "Exercise" && !exerciseIdsAttachedToQuizzes.has(content.id)) {
							onerosterPayload.assessmentLineItems.push({
								sourcedId: `${contentSourcedId}_ali`,
								status: "active",
								title: content.title,
								componentResource: {
									sourcedId: `nice_${lesson.id}_${content.id}`
								},
								course: {
									sourcedId: `nice_${course.id}`
								},
								metadata: {
									lessonType: "exercise",
									courseSourcedId: `nice_${course.id}`
								}
							})
						}
					}

					// Apply bracketed suffix to ComponentResource titles for Video/Article/Exercise only
					let componentTitle = content.title
					if (lc.contentType === "Video") {
						componentTitle = formatResourceTitleForDisplay(content.title, "Video")
					} else if (lc.contentType === "Article") {
						componentTitle = formatResourceTitleForDisplay(content.title, "Article")
					} else if (lc.contentType === "Exercise") {
						componentTitle = formatResourceTitleForDisplay(content.title, "Exercise")
					}

					const isActivityArticle = lc.contentType === "Article" && activityArticleIds.has(content.id)
					const componentResourceStatus: "active" | "tobedeleted" = isActivityArticle ? "tobedeleted" : "active"
					onerosterPayload.componentResources.push({
						sourcedId: `nice_${lesson.id}_${content.id}`,
						status: componentResourceStatus,
						title: componentTitle,
						courseComponent: { sourcedId: `nice_${lesson.id}`, type: "courseComponent" },
					resource: { sourcedId: contentSourcedId, type: "resource" },
					sortOrder: lc.ordering
					})
				}
			}
		}

		const unitAssessments = assessments.filter((a) => a.parentId === unit.id).sort((a, b) => a.ordering - b.ordering)
		for (const assessment of unitAssessments) {
			const assessmentSourcedId = `nice_${assessment.id}`
			if (!resourceSet.has(assessmentSourcedId)) {
				let assessmentXp: number
				if (assessment.type === "UnitTest") {
					assessmentXp = UNIT_TEST_XP
				} else if (assessment.type === "Quiz") {
					assessmentXp = QUIZ_XP
				} else {
					// Fallback for other assessment types
					assessmentXp = 1
				}

				// Determine lesson type for metadata tagging
				let khanLessonType: "quiz" | "unittest" | "coursechallenge" | undefined
				if (assessment.type === "Quiz") {
					khanLessonType = "quiz"
				} else if (assessment.type === "UnitTest") {
					khanLessonType = "unittest"
				} else if (assessment.type === "CourseChallenge") {
					khanLessonType = "coursechallenge"
				} else {
					khanLessonType = undefined
				}

				// Compute canonical practice path including last lesson slug for this unit
				const lastLessonInUnit = unitLessons[unitLessons.length - 1]
				if (!lastLessonInUnit) {
					logger.error("assessment launch url: no lessons in unit", { unitId: unit.id, unitSlug: unit.slug })
					throw errors.new("assessment launch url: no lessons in unit")
				}
				const lastLessonSlug = lastLessonInUnit.slug
				const assessmentPathSegment = assessment.type === "Quiz" ? "quiz" : "test"
				const canonicalAssessmentPath = `${appDomain}/${subjectSlug}/${course.slug}/${unit.slug}/${lastLessonSlug}/${assessmentPathSegment}/${normalizeKhanSlug(assessment.slug)}`

				onerosterPayload.resources.push({
					sourcedId: assessmentSourcedId,
					status: "active",
					title: assessment.title,
					vendorResourceId: `nice-academy-${assessment.id}`,
					vendorId: "superbuilders",
					applicationId: "nice",
					roles: ["primary"],
					importance: "primary",
					metadata: {
						type: "interactive",
						toolProvider: "Nice Academy",
						// Launch URL points directly to canonical path including last lesson slug
						launchUrl: canonicalAssessmentPath,
						url: canonicalAssessmentPath,
						// Keep Nice-controlled hints for our app (optional)
						khanActivityType: assessment.type,
						khanLessonType,
						// Khan-specific data
						khanId: assessment.id,
						khanSlug: normalizeKhanSlug(assessment.slug),
						khanTitle: assessment.title,
						khanDescription: assessment.description,
						xp: assessmentXp
					}
				})
				resourceSet.add(assessmentSourcedId)
			}

			// Create an intermediate course component for the quiz/unit test
			onerosterPayload.courseComponents.push({
				sourcedId: `nice_${assessment.id}`,
				status: "active",
				title: assessment.title,
				course: { sourcedId: `nice_${course.id}`, type: "course" },
				parent: { sourcedId: `nice_${unit.id}`, type: "courseComponent" },
				sortOrder: assessment.ordering,
				metadata: {
					khanId: assessment.id,
					khanSlug: assessment.slug,
					khanTitle: assessment.title,
					khanDescription: assessment.description
				}
			})

			// Now link the resource to the new course component instead of directly to the unit
			onerosterPayload.componentResources.push({
				sourcedId: `nice_${assessment.id}_${assessment.id}`,
				status: "active",
				title: assessment.title,
				courseComponent: { sourcedId: `nice_${assessment.id}`, type: "courseComponent" },
				resource: { sourcedId: assessmentSourcedId, type: "resource" },
				sortOrder: 0
			})

			// Note: Unit-level assessments are Quiz or UnitTest; exercises are represented as lesson content.
		}
	}

	// ADDED: Logic to handle course-level assessments (Course Challenges)
	if (courseAssessments.length > 0) {
		const DUMMY_COMPONENT_TITLE = "Course Challenge"

		// Find the highest unit ordering to place this component last.
		const maxUnitOrder = units.reduce((max, u) => Math.max(max, u.ordering), -1)

		onerosterPayload.courseComponents.push({
			sourcedId: `nice_${course.id}`,
			status: "active",
			title: DUMMY_COMPONENT_TITLE,
			course: { sourcedId: `nice_${course.id}`, type: "course" },
			sortOrder: maxUnitOrder + 1, // Place it after all units
			metadata: {
				khanId: `${course.id}-challenges`,
				khanSlug: "course-challenge",
				khanTitle: DUMMY_COMPONENT_TITLE,
				khanDescription: "A collection of course-level challenges."
			}
		})

		// Now, create resources and link them to this dummy component
		for (const assessment of courseAssessments.sort((a, b) => a.ordering - b.ordering)) {
			const assessmentSourcedId = `nice_${assessment.id}`
			if (!resourceSet.has(assessmentSourcedId)) {
				let assessmentXp: number
				if (assessment.type === "CourseChallenge") {
					assessmentXp = COURSE_CHALLENGE_XP
				} else if (assessment.type === "Quiz") {
					assessmentXp = QUIZ_XP
				} else {
					// Fallback for other assessment types
					assessmentXp = 1
				}

				let khanLessonType: "quiz" | "unittest" | "coursechallenge" | undefined
				if (assessment.type === "Quiz") {
					khanLessonType = "quiz"
				} else if (assessment.type === "UnitTest") {
					khanLessonType = "unittest"
				} else if (assessment.type === "CourseChallenge") {
					khanLessonType = "coursechallenge"
				} else {
					khanLessonType = undefined
				}

				onerosterPayload.resources.push({
					sourcedId: assessmentSourcedId,
					status: "active",
					title: assessment.title,
					vendorResourceId: `nice-academy-${assessment.id}`,
					vendorId: "superbuilders",
					applicationId: "nice",
					roles: ["primary"],
					importance: "primary",
					metadata: {
						type: "interactive",
						toolProvider: "Nice Academy",
						launchUrl: `${appDomain}/${subjectSlug}/${course.slug}/test/${normalizeKhanSlug(assessment.slug)}`,
						url: `${appDomain}/${subjectSlug}/${course.slug}/test/${normalizeKhanSlug(assessment.slug)}`,
						// Keep Nice-controlled hints for our app (optional)
						khanActivityType: assessment.type,
						khanLessonType,
						// Khan-specific data
						khanId: assessment.id,
						khanSlug: normalizeKhanSlug(assessment.slug),
						khanTitle: assessment.title,
						khanDescription: assessment.description,
						xp: assessmentXp
					}
				})
				resourceSet.add(assessmentSourcedId)
			}

			onerosterPayload.componentResources.push({
				sourcedId: `nice_${course.id}_${assessment.id}`,
				status: "active",
				title: assessment.title,
				courseComponent: { sourcedId: `nice_${course.id}`, type: "courseComponent" },
				resource: { sourcedId: assessmentSourcedId, type: "resource" },
				sortOrder: assessment.ordering
			})
		}
	}

	// 4. Compute course metrics
	logger.info("computing course metrics", { courseId })

	function getNumber(obj: Record<string, unknown>, key: string): number | undefined {
		const value = obj[key]
		return typeof value === "number" ? value : undefined
	}

	function getString(obj: Record<string, unknown>, key: string): string | undefined {
		const value = obj[key]
		return typeof value === "string" ? value : undefined
	}

	// Match UI semantics: sum XP per component-resource placement
	let totalXp = 0
	const resourceById = new Map(onerosterPayload.resources.map((r) => [r.sourcedId, r]))
	for (const cr of onerosterPayload.componentResources) {
		// skip tobedeleted component resources
		if (cr.status === "tobedeleted") {
			continue
		}
		const resource = resourceById.get(cr.resource.sourcedId)
		if (!resource) {
			logger.error("metrics: component resource references missing resource", {
				componentResourceId: cr.sourcedId,
				resourceId: cr.resource.sourcedId
			})
			throw errors.new("metrics: missing referenced resource")
		}
		// skip tobedeleted resources
		if (resource.status === "tobedeleted") {
			continue
		}
		const md = resource.metadata
		const activity = getString(md, "khanActivityType")
		const isRelevant =
			activity === "Article" ||
			activity === "Video" ||
			activity === "Exercise" ||
			activity === "Quiz" ||
			activity === "UnitTest" ||
			activity === "CourseChallenge"
		if (!isRelevant) {
			continue
		}
		const xp = getNumber(md, "xp")
		if (xp === undefined) {
			logger.error("metrics: missing xp for resource", {
				resourceId: resource.sourcedId,
				activity,
				title: resource.title
			})
			throw errors.new("metrics: xp missing on resource")
		}
		totalXp += xp
	}

	const unitTestCount = assessments.filter((a) => a.type === "UnitTest").length
	const courseChallengeCount = courseAssessments.filter((a) => a.type === "CourseChallenge").length
	const totalLessons = contentIds.Exercise.length + allQuizAssessments.length + unitTestCount + courseChallengeCount

	const courseMetadata: Record<string, unknown> = onerosterPayload.course.metadata ?? {}
	courseMetadata.metrics = { totalXp, totalLessons }
	onerosterPayload.course.metadata = courseMetadata

	// POST-PROCESSING: Mark lessons with no active component-resources as tobedeleted
	logger.debug("post-processing: marking lessons with no active component-resources")
	const lessonComponents = onerosterPayload.courseComponents.filter((cc) => cc.parent !== undefined)
	for (const lessonComponent of lessonComponents) {
		const componentResources = onerosterPayload.componentResources.filter(
			(cr) => cr.courseComponent.sourcedId === lessonComponent.sourcedId
		)
		const hasActiveComponentResources = componentResources.some((cr) => cr.status === "active")
		if (!hasActiveComponentResources) {
			lessonComponent.status = "tobedeleted"
			logger.debug("marking lesson as tobedeleted", {
				lessonId: lessonComponent.sourcedId,
				lessonTitle: lessonComponent.title
			})
		}
	}

	// POST-PROCESSING: Mark units with no active children as tobedeleted
	logger.debug("post-processing: marking units with no active children")
	const unitComponents = onerosterPayload.courseComponents.filter((cc) => cc.parent === undefined)
	for (const unitComponent of unitComponents) {
		const childComponents = onerosterPayload.courseComponents.filter(
			(cc) => cc.parent?.sourcedId === unitComponent.sourcedId
		)
		const hasActiveChildren = childComponents.some((child) => child.status === "active")
		if (!hasActiveChildren && childComponents.length > 0) {
			unitComponent.status = "tobedeleted"
			logger.debug("marking unit as tobedeleted", {
				unitId: unitComponent.sourcedId,
				unitTitle: unitComponent.title
			})
		}
	}

	logger.info("oneroster payload generation complete", { courseId })
	return onerosterPayload
}

```


## Assistant

<thinking>


**Analyzing script’s line item and resource ID mismatches**

This is quite a puzzle! I’m unpacking how the script generates hashed IDs for component resources and assessment line items, and suspect mismatches or missing `type` fields in references might cause ingestion failures. These likely lead to missing line items, which then cause gradebook’s save attempts to error out, making finalization fail despite the script pushing line items. The core seems to be how hashed IDs and metadata like `khanExerciseId` get mapped and recognized by the ingestion and gradebook services.
</thinking>

**Tool Call: Read ingest-assessment-line-items.ts**
Status: Completed

```json
{"aggregated_output":"","call_id":"call_SEERFrDKgEojNNZxIGj6oybx","duration":{"nanos":19251917,"secs":0},"exit_code":0,"formatted_output":"","stderr":"","stdout":""}
```

## Assistant

<thinking>


**Reading entire file**
</thinking>

**Tool Call: Read ingest-assessment-line-items.ts**
Status: Completed

```json
{"aggregated_output":"","call_id":"call_2loIfQZr0m9ejgFEHsK0PN83","duration":{"nanos":16344584,"secs":0},"exit_code":0,"formatted_output":"","stderr":"","stdout":""}
```

## Assistant

<thinking>


**Checking file start**
</thinking>

**Tool Call: Read ingest-assessment-line-items.ts**
Status: Completed

```ts
import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"
import { ONEROSTER_CONCURRENCY_KEY, ONEROSTER_CONCURRENCY_LIMIT } from "@/lib/constants/oneroster"

// Define the Zod schema for the line item payload
const AssessmentLineItemSchema = z.object({
	sourcedId: z.string(),
	status: z.literal("active"),
	title: z.string(),
	componentResource: z
		.object({
			sourcedId: z.string()
		})
		.optional(),
	course: z.object({
		sourcedId: z.string()
	}),
	metadata: z.record(z.string(), z.any()).optional()
})

type AssessmentLineItemPayload = z.infer<typeof AssessmentLineItemSchema>

const EventDataSchema = z.object({
	assessmentLineItems: z.array(z.unknown())
})

export const ingestAssessmentLineItems = inngest.createFunction(
	{
		id: "ingest-assessment-line-items",
		name: "Ingest Assessment Line Items Hierarchically",
		concurrency: { limit: ONEROSTER_CONCURRENCY_LIMIT, key: ONEROSTER_CONCURRENCY_KEY }
	},
	{ event: "oneroster/assessment-line-items.ingest" },
	async ({ event, step, logger }) => {
		// Validate event data structure
		const eventDataResult = EventDataSchema.safeParse(event.data)
		if (!eventDataResult.success) {
			logger.error("invalid event data structure", { error: eventDataResult.error })
			throw errors.new("event data must contain assessmentLineItems array")
		}

		// Validate each item in the array
		const validatedItems: AssessmentLineItemPayload[] = []
		const invalidItems: unknown[] = []

		for (const item of eventDataResult.data.assessmentLineItems) {
			const itemResult = AssessmentLineItemSchema.safeParse(item)
			if (itemResult.success) {
				validatedItems.push(itemResult.data)
			} else {
				invalidItems.push(item)
			}
		}

		logger.info("starting assessment line item ingestion", {
			totalCount: validatedItems.length,
			invalidCount: invalidItems.length
		})

		if (validatedItems.length === 0) {
			return { status: "skipped", reason: "no_line_items" }
		}

		// Group items by their type based on metadata
		const courseChallenges = validatedItems.filter((li) => li.metadata?.lessonType === "coursechallenge")
		const unitTests = validatedItems.filter((li) => li.metadata?.lessonType === "unittest")
		const quizzes = validatedItems.filter((li) => li.metadata?.lessonType === "quiz")
		const exercises = validatedItems.filter((li) => li.metadata?.lessonType === "exercise")
		const completionItems = validatedItems.filter(
			(li) => li.metadata?.lessonType === "video" || li.metadata?.lessonType === "article"
		)

		const runUpsertBatch = async (items: AssessmentLineItemPayload[], stepName: string) => {
			if (items.length === 0) {
				logger.info("no items to process for step", { stepName })
				return
			}
		await step.run(stepName, async () => {
			const promises = items.map(async (item) => {
				const result = await errors.try(oneroster.putAssessmentLineItem(item.sourcedId, { assessmentLineItem: item }))
				if (result.error) {
					logger.error("failed to upsert assessment line item", { sourcedId: item.sourcedId, error: result.error })
					throw result.error
				}
				return { sourcedId: item.sourcedId, success: true }
			})
			return Promise.all(promises)
		})
			logger.info("successfully ingested batch", { step: stepName, count: items.length })
		}

		// Ingest hierarchically, ensuring parents are created before children
		await runUpsertBatch(courseChallenges, "ingest-course-challenges")
		await runUpsertBatch(unitTests, "ingest-unit-tests")
		await runUpsertBatch(quizzes, "ingest-quizzes")
		await runUpsertBatch(exercises, "ingest-exercises")

		// Ingest non-hierarchical items in parallel
		await runUpsertBatch(completionItems, "ingest-completion-items")

		logger.info("all assessment line items ingestion steps completed")
		return { status: "success", totalIngested: validatedItems.length }
	}
)
```


## Assistant

<thinking>


**Investigating error logging paths**
</thinking>

**Tool Call: Search Could not save final result**
Status: Completed

```sh
src/components/practice/assessment-stepper.tsx:1004:				toast.error("Could not save final result. Please retry.")
src/components/practice/assessment-stepper.tsx:1119:				toast.error("Could not save final result. Please retry.")
src/components/practice/assessment-stepper.tsx:1236:					toast.error("Could not save final result. Please retry.")
```


## Assistant

<thinking>


**Searching for error context references**
</thinking>

**Tool Call: Read assessment-stepper.tsx**
Status: Completed

```tsx
   980			// First, check if the assessment is complete. This prevents updating
   981			// the visible index to an out-of-bounds value.
   982			if (isLast) {
   983				setIsFinalizing(true)
   984				beginProgressUpdate(onerosterResourceSourcedId)
   985
   986				const result = await errors.try(
   987					finalizeAssessment({
   988						onerosterResourceSourcedId,
   989						onerosterComponentResourceSourcedId,
   990						onerosterCourseSourcedId,
   991						expectedXp,
   992						assessmentTitle,
   993						assessmentPath,
   994						unitData,
   995						contentType
   996					})
   997				)
   998
   999				if (result.error) {
  1000					setIsFinalizing(false)
  1001					endProgressUpdate(onerosterResourceSourcedId)
  1002					// FIX: Release the navigation lock on failure to allow the user to retry.
  1003					isNavigatingRef.current = false
  1004					toast.error("Could not save final result. Please retry.")
  1005					return
  1006				}
  1007
  1008				// (Code to set summaryData and progress remains the same)...
  1009				const finalSummaryData = result.data
  1010				setSummaryData({
  1011					score: finalSummaryData.score,
  1012					correctAnswersCount: finalSummaryData.correctAnswersCount,
  1013					totalQuestions: finalSummaryData.totalQuestions,
  1014					xpPenaltyInfo: finalSummaryData.xpPenaltyInfo
  1015						? {
  1016							penaltyXp:
  1017								typeof finalSummaryData.xpPenaltyInfo.penaltyXp === "number"
  1018									? finalSummaryData.xpPenaltyInfo.penaltyXp
  1019									: 0,
  1020							reason:
  1021								typeof finalSummaryData.xpPenaltyInfo.reason === "string"
  1022									? finalSummaryData.xpPenaltyInfo.reason
  1023									: "Unknown penalty reason",
  1024							avgSecondsPerQuestion: finalSummaryData.xpPenaltyInfo.avgSecondsPerQuestion
  1025						}
  1026						: undefined
  1027				})
  1028
  1029				// (Code for setProgressForResource remains the same)...
  1030				const score = finalSummaryData.score
  1031				const calculateProficiency = () => {
  1032					if (score >= 100) return "proficient" as const
  1033					if (score >= 70) return "familiar" as const
  1034					return "attempted" as const
  1035				}
  1036				const proficiencyLevel = calculateProficiency()
  1037				setProgressForResource(onerosterResourceSourcedId, {
  1038					completed: true,
  1039					score,
  1040					proficiency: proficiencyLevel
```


## Assistant

<thinking>


**Diagnosing finalization failure causes**

I'm tracing how `finalize` errors may stem from `assessment.saveResult`, focusing on potential issues in XP awarding, attempt number logic, metadata integrity, and subject slugs mapping to expected front-end constants. I want to verify if metadata fields align properly and if subject slug mismatches could trigger the failure.
</thinking>

**Tool Call: Read subjects.ts**
Status: Completed

```ts
// Centralized subject definitions for strong typing and single-source-of-truth mapping
export type CaliperSubject = "Science" | "Math" | "Reading" | "Language" | "Social Studies" | "None"

export const SUBJECT_SLUGS = [
    "science",
    "math",
    "reading",
    "language",
    "social-studies",
    "humanities",
    "ela"
] as const

export type SubjectSlug = (typeof SUBJECT_SLUGS)[number]

// Runtime membership test without type assertions
const SUBJECT_SLUG_SET: ReadonlySet<string> = new Set(SUBJECT_SLUGS)
export function isSubjectSlug(value: string): value is SubjectSlug {
	return SUBJECT_SLUG_SET.has(value)
}

export const CALIPER_SUBJECT_MAPPING: Record<SubjectSlug, CaliperSubject> = {
	science: "Science",
	math: "Math",
	reading: "Reading",
	language: "Language",
	"social-studies": "Social Studies",
    humanities: "Social Studies",
    // Map ELA to Reading to align with Caliper subject taxonomy
    ela: "Reading"
} as const
```


## Assistant

<thinking>


**Analyzing subject slug mismatch causing finalization failure**

I’m unpacking how the script’s simple lowercase-and-hyphen conversion for subject names (like "English Language Arts" → "english-language-arts") doesn’t match the app’s canonical `SUBJECT_SLUGS` (e.g., 'ela', 'reading'), causing `finalizeAssessment` to reject paths and throw errors. This explains why script-generated courses fail finalization due to invalid slugs, unlike native courses using recognized slugs. I’ll also reference key code lines to give a precise diagnosis.
</thinking>

**Tool Call: Read convert-cartridge-to-oneroster.ts**
Status: Completed

```ts
   150	    logger.error("article stimulus has no readable text")
   151	    throw errors.new("article stimulus: no readable text")
   152	  }
   153	  const wordCount = cleaned.split(/\s+/).filter(Boolean).length
   154	  if (!Number.isFinite(wordCount) || wordCount <= 0) {
   155	    logger.error("article word count invalid", { wordCount })
   156	    throw errors.new("article stimulus: invalid word count")
   157	  }
   158	  return Math.max(1, Math.ceil(wordCount / READING_WORDS_PER_MINUTE))
   159	}
   160
   161	function subjectToRouteSegment(subject: string): string {
   162	  return subject.toLowerCase().replace(/\s+/g, "-")
   163	}
   164
   165	function normalizePathSlug(p: string): string {
   166	  const seg = getLastPathSegment(p)
   167	  return seg.endsWith(".json") ? seg.slice(0, -5) : seg
   168	}
   169
   170	function sha256Hex(input: string): string {
   171	  return crypto.createHash("sha256").update(input).digest("hex")
   172	}
   173
   174	function hashId(_prefix: string, parts: string[]): string {
   175	  // Always emit IDs starting with "nice_". The prefix argument is intentionally ignored
   176	  // for the returned value, but included in the hash key for type separation.
   177	  const key = parts.join("|")
   178	  const hex = sha256Hex(key)
   179	  return `nice_${hex.slice(0, 32)}`
   180	}
   181
   182	// QTI identifiers (hyphen-free):
   183	function qtiStimulusIdFromResource(resourceId: string): string {
   184	  // For articles, stimulus identifier MUST equal the resource sourcedId
   185	  return resourceId
   186	}
   187	function qtiItemIdForQuiz(courseSlug: string, unitId: string, lessonId: string, quizId: string, questionNumber: number): string {
   188	  return hashId("ni_", ["item", `kind=quiz`, `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `x=${quizId}`, `q=${String(questionNumber)}`])
   189	}
   190	function qtiItemIdForUnitTest(courseSlug: string, unitId: string, unitTestId: string, questionNumber: number): string {
```


**Tool Call: Read assessment.ts**
Status: Completed

```ts
   810			if (!clerkUserId) {
   811				logger.error("finalize assessment: user not authenticated", { correlationId })
   812				throw errors.new("user not authenticated")
   813			}
   814
   815			// Extract subject and course slugs from assessment path
   816			const pathParts = options.assessmentPath.split("/")
   817			if (pathParts.length < 3 || !pathParts[1] || !pathParts[2]) {
   818				logger.error("invalid assessment path structure", { assessmentPath: options.assessmentPath, correlationId })
   819				throw errors.new("assessment path invalid")
   820			}
   821			const subjectSlugRaw = pathParts[1]
   822			if (!isSubjectSlug(subjectSlugRaw)) {
   823				logger.error("invalid subject slug in assessment path", {
   824					subjectSlug: subjectSlugRaw,
   825					assessmentPath: options.assessmentPath,
   826					correlationId
   827				})
   828				throw errors.new("subject slug invalid")
   829			}
   830			const subjectSlug = subjectSlugRaw
   831			const courseSlug = pathParts[2]
   832
   833			// Build the command DTO for the service layer
   834			// Fetch user metadata for downstream services (streak)
   835			const clerk = await clerkClient()
   836			const user = await clerk.users.getUser(clerkUserId)
   837
   838			// Email is now required for Caliper analytics
   839			const userEmail = user.emailAddresses[0]?.emailAddress
   840			if (!userEmail) {
```


## Assistant

<thinking>


**Explaining subject slug mismatch causing finalize failure**
</thinking>

**Tool Call: Read convert-cartridge-to-oneroster.ts**
Status: Completed

```ts
   520	              khanActivityType: "Article",
   521	              launchUrl: launch,
   522	              url: launch,
   523	              khanId: res.id,
   524	              khanSlug: articleSlug,
   525	              khanTitle: lesson.title,
   526	              qtiStimulusIdentifier: undefined,
   527	              xp
   528	            }
   529	          })
   530
   531	          const compResId = orComponentResourceIdForArticle(slug, unit.id, lesson.id, res.id)
   532	          payload.componentResources.push({
   533	            sourcedId: compResId,
   534	            status: "active",
   535	            title: formatResourceTitleForDisplay(lesson.title, "Article"),
   536	            courseComponent: { sourcedId: lessonComponentId, type: "courseComponent" },
   537	            resource: { sourcedId: resourceId, type: "resource" },
   538	            sortOrder: resourceIndex
   539	          })
   540
   541	          payload.assessmentLineItems.push({
   542	            sourcedId: orAssessmentLineItemIdFromResource(resourceId),
   543	            status: "active",
   544	            title: `Progress for: ${lesson.title}`,
   545	            componentResource: { sourcedId: compResId },
   546	            course: { sourcedId: courseSourcedId },
   547	            metadata: { lessonType: "article", courseSourcedId }
   548	          })
   549
   550	          // Generate QTI stimulus for article: identifier MUST equal resource sourcedId
   551	          const stimId = qtiStimulusIdFromResource(resourceId)
   552	          const stimulusXml = generateStimulusXml(stimId, lesson.title, htmlResult.data)
   553	          qtiStimuli.push({
   554	            xml: stimulusXml,
   555	            metadata: {
   556	              khanId: res.id,
   557	              khanSlug: articleSlug,
   558	              lessonId: lesson.id,
   559	              unitId: unit.id,
   560	              khanTitle: lesson.title
   561	            }
   562	          })
   563	          logger.debug("generated qti stimulus for article", { articleId: res.id, lessonId: lesson.id })
   564
   565	          totalXp += xp
   566	          totalLessons += 1
   567	        } else if (res.type === "quiz") {
   568	          const quizSlug = getLastPathSegment(res.path)
   569	          // Create intermediate component for quiz
   570	          const quizComponentId = orCourseComponentIdForQuiz(slug, unit.id, lesson.id, res.id)
   571	          payload.courseComponents.push({
   572	            sourcedId: quizComponentId,
   573	            status: "active",
   574	            title: lesson.title,
   575	            course: { sourcedId: courseSourcedId, type: "course" },
   576	            parent: { sourcedId: unitComponentId, type: "courseComponent" },
   577	            sortOrder: lesson.lessonNumber, // position alongside lesson
   578	            metadata: { khanId: res.id, khanSlug: quizSlug, khanTitle: lesson.title }
   579	          })
   580
```


## Assistant

<thinking>


**Searching for launch commands**
</thinking>

**Tool Call: Read convert-cartridge-to-oneroster.ts**
Status: Completed

```ts
   580
   581	          const launch = `${baseDomain}/${subjectRoute}/${slug}/${unitSlugNorm}/${lessonSlug}/quiz/${quizSlug}`
   582	          const resourceId = orResourceIdForQuiz(slug, unit.id, lesson.id, res.id)
   583	          if (resourceSeen.has(resourceId)) {
   584	            logger.error("duplicate resource id", { id: res.id })
   585	            throw errors.new("resource id collision")
   586	          }
   587	          resourceSeen.add(resourceId)
   588
   589	          payload.resources.push({
   590	            sourcedId: resourceId,
   591	            status: "active",
   592	            title: lesson.title,
   593	            vendorResourceId: `nice-academy-${res.id}`,
   594	            vendorId: "superbuilders",
   595	            applicationId: "nice",
   596	            roles: ["primary"],
   597	            importance: "primary",
   598	            metadata: {
   599	              type: "interactive",
   600	              toolProvider: "Nice Academy",
   601	              khanActivityType: "Quiz",
   602	              khanLessonType: "quiz",
   603	              launchUrl: launch,
   604	              url: launch,
   605	              khanId: res.id,
   606	              khanSlug: quizSlug,
   607	              khanTitle: lesson.title,
   608	              xp: QUIZ_XP
   609	            }
   610	          })
   611
   612	          const compResIdQ = orComponentResourceIdForQuiz(slug, unit.id, lesson.id, res.id)
   613	          payload.componentResources.push({
   614	            sourcedId: compResIdQ,
   615	            status: "active",
   616	            title: lesson.title,
   617	            courseComponent: { sourcedId: quizComponentId, type: "courseComponent" },
   618	            resource: { sourcedId: resourceId, type: "resource" },
   619	            sortOrder: 0
   620	          })
   621
   622	          payload.assessmentLineItems.push({
   623	            sourcedId: orAssessmentLineItemIdFromResource(resourceId),
   624	            status: "active",
   625	            title: lesson.title,
   626	            componentResource: { sourcedId: compResIdQ },
   627	            course: { sourcedId: courseSourcedId },
   628	            metadata: { lessonType: "quiz", courseSourcedId }
   629	          })
   630
   631	          // Generate QTI items and test for quiz
   632	          {
   633	            if (!res.questions || res.questions.length === 0) {
   634	              logger.error("quiz has no questions", { quizId: res.id, path: res.path })
   635	              throw errors.new("quiz: no questions available")
   636	            }
   637	            const questionIds: string[] = []
   638	            for (const q of res.questions) {
   639	              // Load actual XML from cartridge if q.xml is a path
   640	              const originalXml = q.xml?.trim() && q.xml.includes("<") ? q.xml : await readQuestionXml(reader, q.xml || "")
```


## Assistant

<thinking>


**Summarizing root cause and impact**

I'll explain how `assessmentPath` inherits the slug from the `launch` path, leading to a finalization failure due to slug mismatch. I'll reference key code locations like the finalization check in `src/lib/actions/assessment.ts:821` and the `SUBJECT_SLUGS` list in `src/lib/constants/subjects.ts`. The message will clarify that an invalid slug causes `finalizeAssessment` to throw an error, which the stepper surfaces, illustrating with examples like `'english-language-arts'` vs `'ela'`. I'll keep it concise and bullet-pointed for clarity.
</thinking>

**Bug Diagnosis**
- In the cartridge converter we derive the public URL segment with `subjectToRouteSegment`, which simply lowercases and hyphenates the raw subject label (e.g. “English Language Arts” → `english-language-arts`) (`scripts/convert-cartridge-to-oneroster.ts:161` and the launch URL build at `scripts/convert-cartridge-to-oneroster.ts:581`).
- That slug is embedded in every resource’s `launchUrl`, so the assessment path handed back to the stepper includes that value. During finalization we split the path and insist the first segment is one of the canonical subject slugs listed in `SUBJECT_SLUGS` (`src/lib/actions/assessment.ts:815-828`, `src/lib/constants/subjects.ts:1-19`).
- Slugs like `english-language-arts`, `english`, `computing`, etc. are **not** in that allow-list (we expect `ela`, `reading`, `science`, …), so `isSubjectSlug` returns false and `finalizeAssessment` throws “subject slug invalid”. The client catches that as “Could not save final result. Please retry.”
- Native courses don’t hit this because their builder emits the canonical subject slug (`reading`, `science`, etc.), while every payload produced by the cartridge script injects the non-canonical form, so finalize always fails there.

**What to Fix**
- Replace the naive `subjectToRouteSegment` logic with a mapping that emits the same canonical slug set we accept elsewhere (e.g., map “English Language Arts” → `ela`, “Computing” → `science`, etc.), and reuse it when composing `launchUrl`. Once the paths use an allowed slug, finalization will pass the subject check and the gradebook write will succeed.

Natural next step: update the script with a subject-to-slug lookup aligned with `SUBJECT_SLUGS`, regenerate a course, and re-ingest to confirm finalization succeeds.
