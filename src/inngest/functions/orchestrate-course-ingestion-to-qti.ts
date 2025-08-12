import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { qti } from "@/lib/clients"
import { QtiItemMetadataSchema } from "@/lib/metadata/qti"
import { ErrQtiNotFound } from "@/lib/qti"
import { escapeXmlAttribute, replaceRootAttributes } from "@/lib/xml-utils"

// Schema for the expected assessment item format
const AssessmentItemSchema = z.object({
	xml: z.string(),
	metadata: QtiItemMetadataSchema
})
type AssessmentItem = z.infer<typeof AssessmentItemSchema>

function encodeProblemType(problemType: string): string {
	return createHash("sha256").update(problemType).digest("hex").slice(0, 12)
}

export const orchestrateCourseIngestionToQti = inngest.createFunction(
	{
		id: "orchestrate-course-ingestion-to-qti",
		name: "Orchestrate Course Ingestion to QTI"
	},
	{ event: "qti/course.generate" },
	async ({ event, logger }) => {
		const startedAt = Date.now()
		const { courseId } = event.data
		logger.info("starting qti json dump workflow", { courseId })

		// --- STANDARD PATH: Direct DB-to-JSON dump (original logic) ---
		logger.info("executing standard qti generation pipeline", { courseId })

		// Step 1: Fetch all course structure and content IDs from the database.
		const units = await db.query.niceUnits.findMany({
			where: eq(schema.niceUnits.courseId, courseId),
			columns: { id: true }
		})
		if (units.length === 0) {
			logger.info("no units found for course", { courseId })
			return { message: "No units found for course", courseId }
		}
		const unitIds = units.map((u) => u.id)

		// Log standard path units for comparison with differentiation path
		logger.info("units fetched for standard path", {
			unitIds: unitIds,
			unitCount: units.length,
			courseId
		})

		// Fetch all content entities in parallel for efficiency.
		const [allQuestions, allArticles, unitAssessments, courseAssessments, allExercises] = await Promise.all([
			db
				.select({
					id: schema.niceQuestions.id,
					xml: schema.niceQuestions.xml,
					exerciseId: schema.niceQuestions.exerciseId,
					exerciseTitle: schema.niceExercises.title,
					exercisePath: schema.niceExercises.path,
					exerciseSlug: schema.niceExercises.slug,
					problemType: schema.niceQuestions.problemType, // ADD THIS LINE
					unitId: schema.niceLessons.unitId
				})
				.from(schema.niceQuestions)
				.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
				.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
				.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
				.where(inArray(schema.niceLessons.unitId, unitIds)),

			db
				.select({
					id: schema.niceArticles.id,
					xml: schema.niceArticles.xml,
					title: schema.niceArticles.title,
					path: schema.niceArticles.path,
					slug: schema.niceArticles.slug
				})
				.from(schema.niceArticles)
				.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
				.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
				.where(inArray(schema.niceLessons.unitId, unitIds)),

			db
				.select({
					assessmentId: schema.niceAssessments.id,
					assessmentTitle: schema.niceAssessments.title,
					assessmentType: schema.niceAssessments.type,
					assessmentPath: schema.niceAssessments.path,
					assessmentSlug: schema.niceAssessments.slug,
					assessmentDescription: schema.niceAssessments.description,
					exerciseId: schema.niceAssessmentExercises.exerciseId
				})
				.from(schema.niceAssessments)
				.innerJoin(
					schema.niceAssessmentExercises,
					eq(schema.niceAssessments.id, schema.niceAssessmentExercises.assessmentId)
				)
				.where(and(inArray(schema.niceAssessments.parentId, unitIds), eq(schema.niceAssessments.parentType, "Unit"))),

			// ADDED: Fetch course-level assessments as well
			db
				.select({
					assessmentId: schema.niceAssessments.id,
					assessmentTitle: schema.niceAssessments.title,
					assessmentType: schema.niceAssessments.type,
					assessmentPath: schema.niceAssessments.path,
					assessmentSlug: schema.niceAssessments.slug,
					assessmentDescription: schema.niceAssessments.description,
					exerciseId: schema.niceAssessmentExercises.exerciseId
				})
				.from(schema.niceAssessments)
				.innerJoin(
					schema.niceAssessmentExercises,
					eq(schema.niceAssessments.id, schema.niceAssessmentExercises.assessmentId)
				)
				.where(and(eq(schema.niceAssessments.parentId, courseId), eq(schema.niceAssessments.parentType, "Course"))),

			db.query.niceExercises.findMany({
				where: inArray(
					schema.niceExercises.id,
					db
						.selectDistinct({ id: schema.niceLessonContents.contentId })
						.from(schema.niceLessonContents)
						.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
						.where(
							and(eq(schema.niceLessonContents.contentType, "Exercise"), inArray(schema.niceLessons.unitId, unitIds))
						)
				)
			})
		])

		logger.info("fetched course content from db", {
			courseId,
			questionsCount: allQuestions.length,
			articlesCount: allArticles.length,
			exercisesCount: allExercises.length,
			unitAssessmentsCount: unitAssessments.length,
			courseAssessmentsCount: courseAssessments.length
		})

		// ADDED: Combine unit and course assessments into a single list
		const allAssessments = [...unitAssessments, ...courseAssessments]

		// CRITICAL VALIDATION: Ensure data integrity before proceeding
		logger.info("validating data integrity", {
			questionsCount: allQuestions.length,
			articlesCount: allArticles.length,
			exercisesCount: allExercises.length,
			assessmentsCount: allAssessments.length // Use combined count
		})

		// Filter out questions with missing XML instead of hard-failing
		const validQuestions = allQuestions.filter((q) => {
			if (q.xml) {
				return true
			}
			logger.warn("skipping question with missing xml", {
				questionId: q.id,
				exerciseId: q.exerciseId,
				exerciseTitle: q.exerciseTitle
			})
			return false
		})

		logger.info("validated questions", {
			totalQuestions: allQuestions.length,
			validQuestions: validQuestions.length,
			skippedCount: allQuestions.length - validQuestions.length
		})

		// Validate ALL articles have XML - if not, we'll create a default
		const articlesWithXml = allArticles.map((a) => {
			if (!a.xml) {
				logger.warn("Article missing XML, using default 'Article not found' template", {
					articleId: a.id,
					articleTitle: a.title,
					articlePath: a.path
				})

				// Create a default "Article not found" QTI XML
				const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-stimulus
    xmlns="http://www.imsglobal.org/xsd/qti/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/qti/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_stimulusv3p0p1_v1p0.xsd"
    identifier="${a.id}"
    title="${escapeXmlAttribute(a.title)}"
    xml:lang="en-US">
    <qti-stimulus-body>
        <h2>Article Not Found</h2>
        <p>The content for this article is currently unavailable.</p>
        <p><em>Article ID: ${a.id}</em></p>
        <p><em>Title: ${escapeXmlAttribute(a.title)}</em></p>
    </qti-stimulus-body>
</qti-assessment-stimulus>`

				return { ...a, xml: defaultXml }
			}
			return a
		})

		// Group questions by exerciseId for efficient lookup using only valid questions.
		const questionsByExerciseId = new Map<string, string[]>()
		for (const q of validQuestions) {
			if (!questionsByExerciseId.has(q.exerciseId)) {
				questionsByExerciseId.set(q.exerciseId, [])
			}
			questionsByExerciseId.get(q.exerciseId)?.push(q.id)
		}

		// Log warnings for exercises without questions but don't throw
		for (const exercise of allExercises) {
			const questions = questionsByExerciseId.get(exercise.id)
			if (!questions || questions.length === 0) {
				logger.warn("Exercise has no questions - will create empty test", {
					exerciseId: exercise.id,
					exerciseTitle: exercise.title,
					exercisePath: exercise.path,
					exerciseSlug: exercise.slug
				})
			}
		}

		// Group assessments and their exercises
		const assessmentMap = new Map<
			string,
			{ title: string; type: string; path: string; slug: string; description: string | null; exerciseIds: string[] }
		>()
		for (const row of allAssessments) {
			if (!assessmentMap.has(row.assessmentId)) {
				assessmentMap.set(row.assessmentId, {
					title: row.assessmentTitle,
					type: row.assessmentType,
					path: row.assessmentPath,
					slug: row.assessmentSlug,
					description: row.assessmentDescription,
					exerciseIds: []
				})
			}
			assessmentMap.get(row.assessmentId)?.exerciseIds.push(row.exerciseId)
		}

		// Step 3: Assemble the JSON payloads from the fetched data using only valid questions.
		const itemsUnvalidated: AssessmentItem[] = validQuestions.map((q) => {
			// TypeScript can't infer that validation happened above, so we need to check
			if (!q.xml) {
				logger.error("unreachable: question missing xml after filtering", { questionId: q.id })
				throw errors.new("unreachable: question should have been validated for XML")
			}
			const finalXml = replaceRootAttributes(q.xml, "qti-assessment-item", `nice_${q.id}`, q.exerciseTitle)
			return {
				xml: finalXml,
				metadata: {
					khanId: q.id,
					khanExerciseId: q.exerciseId,
					khanExerciseSlug: q.exerciseSlug,
					khanExerciseTitle: q.exerciseTitle
				}
			}
		})

		// Validate all items via QTI API and skip invalid ones (batched)
		const items: AssessmentItem[] = []
		const skippedItems: Array<{ item: AssessmentItem; error?: unknown }> = []
		const batchSize = 20
		const delayMs = 500

		for (let i = 0; i < itemsUnvalidated.length; i += batchSize) {
			const batch = itemsUnvalidated.slice(i, i + batchSize)
			logger.debug("ghetto-validate batch starting", {
				batchStart: i,
				batchSize: batch.length,
				total: itemsUnvalidated.length
			})

			const batchResults = await Promise.all(
				batch.map(async (item) => {
					const tempIdentifier = `nice_${item.metadata.khanId}`
					// Use a simple payload. We only care if the XML is structurally valid for the API.
					const payload = {
						identifier: tempIdentifier,
						xml: item.xml,
						metadata: { temp: true, sourceId: item.metadata.khanId }
					}

					// Upsert
					const updateResult = await errors.try(qti.updateAssessmentItem(payload))
					if (updateResult.error) {
						if (errors.is(updateResult.error, ErrQtiNotFound)) {
							const createResult = await errors.try(qti.createAssessmentItem(payload))
							if (createResult.error) {
								logger.error("ghetto-validate create failed", { identifier: tempIdentifier, error: createResult.error })
								return { success: false, item, error: createResult.error }
							}
						} else {
							logger.error("ghetto-validate update failed", { identifier: tempIdentifier, error: updateResult.error })
							return { success: false, item, error: updateResult.error }
						}
					}

					// Delete immediately
					const deleteResult = await errors.try(qti.deleteAssessmentItem(tempIdentifier))
					if (deleteResult.error) {
						// This is a warning because the validation itself succeeded. The temp item just needs cleanup.
						logger.warn("failed to clean up temp validation item", {
							identifier: tempIdentifier,
							error: deleteResult.error
						})
					}

					return { success: true, item }
				})
			)

			for (const result of batchResults) {
				if (result.success) {
					items.push(result.item)
				} else {
					skippedItems.push(result)
				}
			}

			const batchSuccesses = batchResults.filter((r) => r.success).length
			const batchFailures = batchResults.length - batchSuccesses
			logger.debug("ghetto-validate batch complete", {
				batchStart: i,
				batchSize: batchResults.length,
				successCount: batchSuccesses,
				failureCount: batchFailures
			})

			if (i + batchSize < itemsUnvalidated.length) {
				await new Promise((resolve) => setTimeout(resolve, delayMs))
			}
		}

		const skippedItemsCount = skippedItems.length
		logger.info("ghetto-validate complete", {
			courseId,
			totalItems: itemsUnvalidated.length,
			validItems: items.length,
			skippedItems: skippedItemsCount
		})
		for (const result of skippedItems) {
			logger.warn("skipping invalid qti item after ghetto-validate", {
				questionId: result.item.metadata.khanId,
				error: result.error
			})
		}

		const stimuli = articlesWithXml.map((a) => {
			// All articles now have XML (either original or default)
			if (!a.xml) {
				throw errors.new("unreachable: article should have xml after default generation")
			}
			const finalXml = replaceRootAttributes(a.xml, "qti-assessment-stimulus", `nice_${a.id}`, a.title)
			return {
				xml: finalXml,
				metadata: {
					khanId: a.id,
					khanSlug: a.slug,
					khanTitle: a.title
				}
			}
		})

		logger.info("assembled stimuli", { courseId, stimuliCount: stimuli.length })

		const validOriginalQuestionIds = new Set(items.map((it) => String(it.metadata.khanId)))

		const buildTestObject = (
			id: string,
			title: string,
			questions: {
				id: string
				exerciseId: string
				exerciseTitle: string
				problemType: string
				unitId?: string
			}[],
			metadata: { khanAssessmentType?: string } & Record<string, unknown>
		): string => {
			const safeTitle = escapeXmlAttribute(title)

			// Decide target cap by assessment type
			let assessmentType: string | undefined
			if (typeof metadata.khanAssessmentType === "string") {
				assessmentType = metadata.khanAssessmentType
			} else {
				assessmentType = undefined
			}
			let targetTotal: number | undefined
			if (assessmentType === "CourseChallenge") {
				targetTotal = 30
			} else if (assessmentType === "UnitTest") {
				targetTotal = 12
			} else {
				targetTotal = undefined
			}

			// Strategy:
			// - CourseChallenge: single grab-bag section across all questions with select=30 (pure random)
			// - UnitTest: single grab-bag section across all questions with select=12 (pure random) to avoid starvation
			// - Else (e.g., Quiz): include all problemTypes as before

			type GroupKey = string
			const groups = new Map<GroupKey, typeof questions>()

			if (assessmentType === "UnitTest") {
				for (const q of questions) {
					const key = `${q.exerciseId}::${q.problemType}`
					const existing = groups.get(key)
					if (existing) {
						existing.push(q)
					} else {
						groups.set(key, [q])
					}
				}
			} else {
				for (const q of questions) {
					const key = q.problemType
					const existing = groups.get(key)
					if (existing) {
						existing.push(q)
					} else {
						groups.set(key, [q])
					}
				}
			}

			// Build a round-robin order over buckets (outer by unit/exercise, inner by problemType), stable and deterministic
			// First, index buckets by their outer id to interleave fairly
			const outerToInner = new Map<string, Array<[string, typeof questions]>>()
			const sortedEntries = Array.from(groups.entries()).sort(([a], [b]) => (a < b ? -1 : 1))
			for (const [key, arr] of sortedEntries) {
				let outer: string
				if (key.includes("::")) {
					const parts = key.split("::")
					outer = parts[0] ?? "__"
				} else {
					outer = "__"
				}
				const existingList = outerToInner.get(outer)
				if (existingList) {
					existingList.push([key, arr])
				} else {
					outerToInner.set(outer, [[key, arr]])
				}
			}
			for (const entry of outerToInner.entries()) {
				const list = entry[1]
				list.sort(([ka], [kb]) => (ka < kb ? -1 : 1))
			}

			const chosenKeys: string[] = []
			if (assessmentType === "CourseChallenge") {
				// grab-bag: use a single synthetic key representing all questions
				chosenKeys.push("__grab_bag__")
			} else if (assessmentType === "UnitTest") {
				// grab-bag for unit tests as well
				chosenKeys.push("__grab_bag__")
			} else if (typeof targetTotal === "number") {
				// Round-robin pick one inner per outer until target reached or buckets exhausted
				const outers = Array.from(outerToInner.keys()).sort((a, b) => (a < b ? -1 : 1))
				let picked = 0
				// Prepare per-outer cursors
				const cursors = new Map<string, number>(outers.map((o) => [o, 0]))
				let progress = true
				while (picked < targetTotal && progress) {
					progress = false
					for (const outer of outers) {
						if (picked >= targetTotal) break
						const cursor = cursors.get(outer) ?? 0
						const listForOuter = outerToInner.get(outer) ?? []
						if (cursor >= listForOuter.length) {
							continue
						}
						const tuple = listForOuter[cursor]
						if (!Array.isArray(tuple)) {
							continue
						}
						const keyToPush = tuple[0]
						chosenKeys.push(keyToPush)
						cursors.set(outer, cursor + 1)
						picked++
						progress = true
					}
				}
			} else {
				// No cap: include all
				chosenKeys.push(...sortedEntries.map(([k]) => k))
			}

			const sectionsXml = (() => {
				if (assessmentType === "CourseChallenge") {
					const itemRefsXml = questions
						.map(
							(q, idx) =>
								`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
						)
						.join("\n                ")
					// Single grab-bag section with select=30
					return `        <qti-assessment-section identifier="SECTION_COURSE_GRAB_BAG" title="Course Challenge" visible="false">
            <qti-selection select="30" with-replacement="false"/>
            <qti-ordering shuffle="true"/>
            ${itemRefsXml}
        </qti-assessment-section>`
				}
				if (assessmentType === "UnitTest") {
					const itemRefsXml = questions
						.map(
							(q, idx) =>
								`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${idx + 1}"></qti-assessment-item-ref>`
						)
						.join("\n                ")
					// Single grab-bag section with select=12
					return `        <qti-assessment-section identifier="SECTION_UNITTEST_GRAB_BAG" title="Unit Test" visible="false">
            <qti-selection select="12" with-replacement="false"/>
            <qti-ordering shuffle="true"/>
            ${itemRefsXml}
        </qti-assessment-section>`
				}

				return chosenKeys
					.map((key) => {
						const split = key.split("::")
						let problemType: string
						if (split.length > 1 && typeof split[1] === "string" && split[1].length > 0) {
							problemType = split[1]
						} else {
							problemType = key
						}
						const encodedProblemType = encodeProblemType(problemType)
						const problemTypeQuestions = groups.get(key) ?? []
						const first = problemTypeQuestions[0]
						if (!first || !first.exerciseTitle || !first.exerciseId) {
							logger.error("invalid problemType group: missing exercise info", {
								problemType,
								groupSize: problemTypeQuestions.length
							})
							throw errors.new("invalid question grouping")
						}
						const safeExerciseTitle = escapeXmlAttribute(first.exerciseTitle)
						const exerciseId = first.exerciseId
						const itemRefsXml = problemTypeQuestions
							.map(
								(q, itemIndex) =>
									`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${itemIndex + 1}"></qti-assessment-item-ref>`
							)
							.join("\n                ")

						return `        <qti-assessment-section identifier="SECTION_${exerciseId}_${encodedProblemType}" title="${safeExerciseTitle}" visible="false">
            <qti-selection select="1" with-replacement="false"/>
            <qti-ordering shuffle="true"/>
            ${itemRefsXml}
        </qti-assessment-section>`
					})
					.join("\n")
			})()

			// The entire test is now constructed as a single XML string.
			return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${id}" title="${safeTitle}">
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0.0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
${sectionsXml}
    </qti-test-part>
</qti-assessment-test>`
		}

		const explicitTests = Array.from(assessmentMap.entries()).map(([assessmentId, data]) => {
			const questionIds = data.exerciseIds.flatMap((exerciseId) => {
				const questions = questionsByExerciseId.get(exerciseId)
				if (!questions) {
					logger.warn("Exercise referenced by assessment has no questions", {
						assessmentId,
						exerciseId,
						assessmentTitle: data.title
					})
					return []
				}
				return questions
			})

			if (questionIds.length === 0) {
				logger.info("Creating empty test for assessment without questions", {
					assessmentId,
					assessmentTitle: data.title,
					assessmentType: data.type
				})
			}

			// Map question IDs to full question objects with exercise information
			// Filter out invalid questions by original question id
			const filteredIds = questionIds.filter((id) => validOriginalQuestionIds.has(String(id)))
			const allQuestionsForTest = filteredIds.map((id) => {
				const question = allQuestions.find((q) => q.id === id)
				if (!question) {
					logger.error("Question not found when building test", { questionId: id, assessmentId })
					throw errors.new(`question ${id} not found when building test`)
				}
				return {
					id: question.id,
					exerciseId: question.exerciseId,
					exerciseTitle: question.exerciseTitle,
					problemType: question.problemType, // ADD THIS LINE
					unitId: question.unitId
				}
			})

			return buildTestObject(assessmentId, data.title, allQuestionsForTest, {
				khanId: assessmentId,
				khanSlug: data.slug,
				khanTitle: data.title,
				khanDescription: data.description,
				khanAssessmentType: data.type
			})
		})

		const exerciseTests = allExercises.map((exercise) => {
			const questionsForExercise = validQuestions.filter((q) => q.exerciseId === exercise.id)

			if (questionsForExercise.length === 0) {
				logger.info("Creating empty test for exercise without questions", {
					exerciseId: exercise.id,
					exerciseTitle: exercise.title
				})
			}

			// Group questions by their problemType.
			const questionsByProblemType = new Map<string, typeof questionsForExercise>()
			for (const q of questionsForExercise) {
				if (!questionsByProblemType.has(q.problemType)) {
					questionsByProblemType.set(q.problemType, [])
				}
				questionsByProblemType.get(q.problemType)?.push(q)
			}

			const safeTitle = escapeXmlAttribute(exercise.title)

			const sectionsXml = Array.from(questionsByProblemType.entries())
				.map(([problemType, problemTypeQuestions]) => {
					const encodedProblemType = encodeProblemType(problemType)
					const itemRefsXml = problemTypeQuestions
						.map(
							(q, index) =>
								`<qti-assessment-item-ref identifier="nice_${q.id}" href="/assessment-items/nice_${q.id}" sequence="${index + 1}"></qti-assessment-item-ref>`
						)
						.join("\n                ")

					return `        <qti-assessment-section identifier="SECTION_${exercise.id}_${encodedProblemType}" title="${safeTitle}" visible="true">
            <qti-selection select="1" with-replacement="false"/>
            <qti-ordering shuffle="true"/>
            ${itemRefsXml}
        </qti-assessment-section>`
				})
				.join("\n")

			// For standalone exercises, we now create a test that selects one random question per problemType.
			return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${exercise.id}" title="${safeTitle}">
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0.0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
${sectionsXml}
    </qti-test-part>
</qti-assessment-test>`
		})

		const tests = [...explicitTests, ...exerciseTests]
		logger.info("assembled tests", {
			courseId,
			explicitTestsCount: explicitTests.length,
			exerciseTestsCount: exerciseTests.length,
			totalTests: tests.length
		})

		const assessmentItems = items
		const assessmentStimuli = stimuli
		const assessmentTests = tests

		// Step 4: Write the final JSON files to the data/ directory.
		const course = await db.query.niceCourses.findFirst({
			where: eq(schema.niceCourses.id, courseId)
		})
		if (!course) {
			logger.error("course not found for final dump", { courseId })
			throw errors.new("course not found for final dump")
		}

		const courseDir = path.join(process.cwd(), "data", course.slug, "qti")
		const mkdirResult = await errors.try(fs.mkdir(courseDir, { recursive: true }))
		if (mkdirResult.error) {
			logger.error("directory creation failed", { courseDir, error: mkdirResult.error })
			throw errors.wrap(mkdirResult.error, "directory creation")
		}

		logger.info("writing qti json files", {
			courseId,
			courseDir,
			items: assessmentItems.length,
			stimuli: assessmentStimuli.length,
			tests: assessmentTests.length
		})

		const itemsWrite = await errors.try(
			fs.writeFile(path.join(courseDir, "assessmentItems.json"), JSON.stringify(assessmentItems, null, 2))
		)
		if (itemsWrite.error) {
			logger.error("file write failed", { file: path.join(courseDir, "assessmentItems.json"), error: itemsWrite.error })
			throw errors.wrap(itemsWrite.error, "file write")
		}

		const stimuliWrite = await errors.try(
			fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(assessmentStimuli, null, 2))
		)
		if (stimuliWrite.error) {
			logger.error("file write failed", {
				file: path.join(courseDir, "assessmentStimuli.json"),
				error: stimuliWrite.error
			})
			throw errors.wrap(stimuliWrite.error, "file write")
		}

		const testsWrite = await errors.try(
			fs.writeFile(path.join(courseDir, "assessmentTests.json"), JSON.stringify(assessmentTests, null, 2))
		)
		if (testsWrite.error) {
			logger.error("file write failed", { file: path.join(courseDir, "assessmentTests.json"), error: testsWrite.error })
			throw errors.wrap(testsWrite.error, "file write")
		}

		const outputDir = courseDir

		const durationMs = Date.now() - startedAt
		logger.info("completed QTI JSON dump workflow successfully", {
			courseId,
			outputDir,
			stats: {
				items: assessmentItems.length,
				stimuli: assessmentStimuli.length,
				tests: assessmentTests.length,
				skippedItems: skippedItemsCount
			},
			durationMs
		})

		return {
			message: "QTI JSON dump workflow completed successfully.",
			courseId,
			outputDir,
			skippedItems: skippedItemsCount
		}
	}
)
