import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { convertPerseusQuestionToDifferentiatedQtiItems } from "@/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items"
import { qti } from "@/lib/clients"
import { QtiItemMetadataSchema } from "@/lib/metadata/qti"
import { ErrQtiNotFound } from "@/lib/qti"
import { escapeXmlAttribute } from "@/lib/xml-utils"

type AssessmentTestCandidate = {
	id: string
	xml: string
}

const HARDCODED_COURSE_IDS = [
	"x0267d782", // 6th grade math (Common Core)
	"x6b17ba59", // 7th grade math (Common Core)
	"x7c7044d7" // 8th grade math (Common Core)
]

const DIFFERENTIATION_COUNT = 3

// Schema for the expected assessment item format
const AssessmentItemSchema = z.object({
	xml: z.string(),
	metadata: QtiItemMetadataSchema
})
type AssessmentItem = z.infer<typeof AssessmentItemSchema>

export const orchestrateHardcodedQtiGenerationForItemsAndTests = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-qti-generation-for-items-and-tests",
		name: "Orchestrate Hardcoded QTI Generation for Items and Tests"
	},
	{ event: "migration/hardcoded.qti.generate-items-and-tests" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded qti generation for items and tests", {
			courseCount: HARDCODED_COURSE_IDS.length,
			variationsPerItem: DIFFERENTIATION_COUNT
		})

		const coursesResult = await errors.try(
			db.query.niceCourses.findMany({
				where: inArray(schema.niceCourses.id, HARDCODED_COURSE_IDS),
				columns: { id: true, slug: true }
			})
		)
		if (coursesResult.error) {
			logger.error("db query for courses failed", { error: coursesResult.error, courseIds: HARDCODED_COURSE_IDS })
			throw errors.wrap(coursesResult.error, "db query for courses")
		}
		const courses = coursesResult.data
		logger.info("fetched courses for generation", { count: courses.length, courseIds: courses.map((c) => c.id) })

		const skippedCountsPerCourse = await Promise.all(
			courses.map(async (course) => {
				const courseId = course.id
				logger.info("processing course for item and test generation", { courseId })

				const unitsResult = await errors.try(
					db.query.niceUnits.findMany({
						where: eq(schema.niceUnits.courseId, course.id),
						columns: { id: true }
					})
				)
				if (unitsResult.error) {
					logger.error("db query for units failed", { courseId, error: unitsResult.error })
					throw errors.wrap(unitsResult.error, "db query for units")
				}
				const units = unitsResult.data
				logger.debug("fetched units for course", { courseId, unitCount: units.length })
				if (units.length === 0) {
					logger.info("no units found for course, skipping", { courseId })
					return 0
				}
				const unitIds = units.map((u) => u.id)

				const questionsResult = await errors.try(
					db
						.selectDistinct({ id: schema.niceQuestions.id })
						.from(schema.niceQuestions)
						.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
						.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
						.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
						.where(inArray(schema.niceLessons.unitId, unitIds))
				)
				if (questionsResult.error) {
					logger.error("db query for questions failed", {
						courseId,
						unitCount: unitIds.length,
						error: questionsResult.error
					})
					throw errors.wrap(questionsResult.error, "db query for questions")
				}
				const questions = questionsResult.data
				logger.info("fetched questions for course", { courseId, questionCount: questions.length })

				if (questions.length === 0) {
					logger.info("no questions found for course, skipping", { courseId })
					return 0
				}

				const differentiationPromises = questions.map((q) =>
					step.invoke(`differentiate-${course.id}-${q.id}`, {
						function: convertPerseusQuestionToDifferentiatedQtiItems,
						data: { questionId: q.id, n: DIFFERENTIATION_COUNT }
					})
				)

				const settledResults = await Promise.allSettled(differentiationPromises)
				logger.debug("differentiation results settled", {
					courseId,
					total: settledResults.length,
					fulfilled: settledResults.filter((r) => r.status === "fulfilled").length,
					rejected: settledResults.filter((r) => r.status === "rejected").length
				})

				function isFulfilled<T>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> {
					return r.status === "fulfilled" && r.value !== null
				}

				const successfulResults = settledResults.filter(isFulfilled)
				const failedResults = settledResults.filter(
					(result): result is PromiseRejectedResult => result.status === "rejected"
				)

				if (failedResults.length > 0) {
					logger.warn("some item differentiations failed", {
						courseId,
						failedCount: failedResults.length,
						total: questions.length,
						errors: failedResults.map((r) => r.reason)
					})
				}

				const allGeneratedItems = successfulResults.flatMap((result) => result.value).filter(Boolean)
				logger.debug("flattened generated items", { courseId, count: allGeneratedItems.length })

				// Parse and validate generated items structure
				const parsedItems: AssessmentItem[] = []
				for (const item of allGeneratedItems) {
					const parseResult = AssessmentItemSchema.safeParse(item)
					if (parseResult.success) {
						parsedItems.push(parseResult.data)
					} else {
						logger.warn("item has invalid schema", {
							error: parseResult.error.issues,
							item: JSON.stringify(item).substring(0, 200) // Log first 200 chars for debugging
						})
					}
				}

				// Validate generated items via QTI API and skip invalid ones (batched)
				const assessmentItems: AssessmentItem[] = []
				const skippedItems: Array<{ item: AssessmentItem; error?: unknown }> = []
				const batchSize = 20
				const delayMs = 500

				for (let i = 0; i < parsedItems.length; i += batchSize) {
					const batch = parsedItems.slice(i, i + batchSize)
					logger.debug("ghetto-validate batch starting", {
						batchStart: i,
						batchSize: batch.length,
						total: parsedItems.length
					})

					const batchResults = await Promise.all(
						batch.map(async (item) => {
							const tempIdentifier = `nice_${item.metadata.khanId}`
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
										logger.error("ghetto-validate create failed", {
											identifier: tempIdentifier,
											error: createResult.error
										})
										return { success: false, item, error: createResult.error }
									}
								} else {
									logger.error("ghetto-validate update failed", {
										identifier: tempIdentifier,
										error: updateResult.error
									})
									return { success: false, item, error: updateResult.error }
								}
							}

							// Delete immediately
							const deleteResult = await errors.try(qti.deleteAssessmentItem(tempIdentifier))
							if (deleteResult.error) {
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
							assessmentItems.push(result.item)
						} else {
							skippedItems.push(result)
						}
					}

					if (i + batchSize < parsedItems.length) {
						await new Promise((resolve) => setTimeout(resolve, delayMs))
					}
				}

				const skippedItemsCount = skippedItems.length
				for (const result of skippedItems) {
					logger.warn("skipping invalid differentiated qti item after ghetto-validate", {
						questionId: result.item.metadata.khanId,
						error: result.error
					})
				}
				logger.info("ghetto-validate completed", {
					courseId,
					validatedItems: assessmentItems.length,
					skippedItems: skippedItemsCount
				})

				const courseDir = path.join(process.cwd(), "data", course.slug, "qti")
				const mkdirResult = await errors.try(fs.mkdir(courseDir, { recursive: true }))
				if (mkdirResult.error) {
					logger.error("directory creation failed", { error: mkdirResult.error, file: courseDir })
					throw errors.wrap(mkdirResult.error, "directory creation")
				}
				const writeItems = await errors.try(
					fs.writeFile(path.join(courseDir, "assessmentItems.json"), JSON.stringify(assessmentItems, null, 2))
				)
				if (writeItems.error) {
					logger.error("file write failed", {
						error: writeItems.error,
						file: path.join(courseDir, "assessmentItems.json")
					})
					throw errors.wrap(writeItems.error, "file write")
				}

				logger.info("successfully differentiated and saved items for course", {
					courseId,
					successfulSources: successfulResults.length,
					totalSources: questions.length,
					itemsGenerated: assessmentItems.length,
					skippedItems: skippedItemsCount
				})

				// --- Test generation ---
				logger.info("starting test generation for course", { courseId })
				const testsDataResult = await errors.try(
					Promise.all([
						db
							.select({
								id: schema.niceQuestions.id,
								exerciseId: schema.niceQuestions.exerciseId,
								exerciseTitle: schema.niceExercises.title
							})
							.from(schema.niceQuestions)
							.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
							.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
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
							.where(
								and(inArray(schema.niceAssessments.parentId, unitIds), eq(schema.niceAssessments.parentType, "Unit"))
							),
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
							.where(
								and(eq(schema.niceAssessments.parentId, courseId), eq(schema.niceAssessments.parentType, "Course"))
							),
						db.query.niceExercises.findMany({
							where: inArray(
								schema.niceExercises.id,
								db
									.selectDistinct({ id: schema.niceLessonContents.contentId })
									.from(schema.niceLessonContents)
									.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
									.where(
										and(
											eq(schema.niceLessonContents.contentType, "Exercise"),
											inArray(schema.niceLessons.unitId, unitIds)
										)
									)
							)
						})
					])
				)
				if (testsDataResult.error) {
					logger.error("db queries for test generation failed", { courseId, error: testsDataResult.error })
					throw errors.wrap(testsDataResult.error, "db queries for test generation")
				}
				const [allQuestionsForTests, unitAssessments, courseAssessments, allExercises] = testsDataResult.data
				logger.debug("fetched data for test generation", {
					courseId,
					questions: allQuestionsForTests.length,
					unitAssessments: unitAssessments.length,
					courseAssessments: courseAssessments.length,
					exercises: allExercises.length
				})

				const questionsByExerciseId = new Map<string, string[]>()
				for (const q of allQuestionsForTests) {
					if (!questionsByExerciseId.has(q.exerciseId)) {
						questionsByExerciseId.set(q.exerciseId, [])
					}
					questionsByExerciseId.get(q.exerciseId)?.push(q.id)
				}

				const assessmentMap = new Map<
					string,
					{ title: string; type: string; path: string; slug: string; description: string | null; exerciseIds: string[] }
				>()
				for (const row of [...unitAssessments, ...courseAssessments]) {
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

				const buildTestObject = (
					id: string,
					title: string,
					questions: { id: string; exerciseId: string; exerciseTitle: string }[],
					_metadata: Record<string, unknown>
				): AssessmentTestCandidate => {
					const safeTitle = escapeXmlAttribute(title)

					const questionsByExercise = new Map<string, { title: string; questionIds: string[] }>()
					for (const q of questions) {
						if (!questionsByExercise.has(q.exerciseId)) {
							questionsByExercise.set(q.exerciseId, { title: q.exerciseTitle, questionIds: [] })
						}
						questionsByExercise.get(q.exerciseId)?.questionIds.push(q.id)
					}

					const selectCount = 2

					const sectionsXml = Array.from(questionsByExercise.entries())
						.map(([exerciseId, { title: exerciseTitle, questionIds }]) => {
							const safeExerciseTitle = escapeXmlAttribute(exerciseTitle)
							const itemRefsXml = questionIds
								.map(
									(itemId, itemIndex) =>
										`<qti-assessment-item-ref identifier="nice_${itemId}" href="/assessment-items/nice_${itemId}" sequence="${itemIndex + 1}"></qti-assessment-item-ref>`
								)
								.join("\n                ")

							return `        <qti-assessment-section identifier="SECTION_${exerciseId}" title="${safeExerciseTitle}" visible="false">
            <qti-selection select="${Math.min(selectCount, questionIds.length)}" with-replacement="false"/>
            <qti-ordering shuffle="true"/>
            ${itemRefsXml}
        </qti-assessment-section>`
						})
						.join("\n")

					const xml = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${id}" title="${safeTitle}">
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0.0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
${sectionsXml}
    </qti-test-part>
</qti-assessment-test>`
					return { id, xml }
				}

				const explicitTestsCandidates: AssessmentTestCandidate[] = Array.from(assessmentMap.entries()).map(
					([assessmentId, data]) => {
						const questionIds = data.exerciseIds.flatMap((exerciseId) => questionsByExerciseId.get(exerciseId) || [])

						const allQuestionsForTest = questionIds.map((id) => {
							const question = allQuestionsForTests.find((q) => q.id === id)
							if (!question) {
								logger.error("question not found when building test", { questionId: id, assessmentId })
								throw errors.new("question not found when building test")
							}
							return { id: question.id, exerciseId: question.exerciseId, exerciseTitle: question.exerciseTitle }
						})

						return buildTestObject(assessmentId, data.title, allQuestionsForTest, {
							khanId: assessmentId,
							khanSlug: data.slug,
							khanTitle: data.title,
							khanDescription: data.description,
							khanAssessmentType: data.type
						})
					}
				)

				const exerciseTestsCandidates: AssessmentTestCandidate[] = allExercises.map((exercise) => {
					const questionIds = questionsByExerciseId.get(exercise.id) || []

					const safeTitle = escapeXmlAttribute(exercise.title)
					const itemRefsXml = questionIds
						.map(
							(itemId, index) =>
								`<qti-assessment-item-ref identifier="nice_${itemId}" href="/assessment-items/nice_${itemId}" sequence="${index + 1}"></qti-assessment-item-ref>`
						)
						.join("\n                ")

					const selectCountForExercise = Math.min(5, questionIds.length)

					const xml = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${exercise.id}" title="${safeTitle}">
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0.0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
        <qti-assessment-section identifier="SECTION_${exercise.id}" title="${safeTitle}" visible="true">
            <qti-selection select="${selectCountForExercise}" with-replacement="false"/>
            <qti-ordering shuffle="true"/>
            ${itemRefsXml}
        </qti-assessment-section>
    </qti-test-part>
</qti-assessment-test>`
					return { id: exercise.id, xml }
				})

				// Ghetto-validate assessment tests (batched upsert + immediate delete)
				const testCandidates = [...explicitTestsCandidates, ...exerciseTestsCandidates]
				const validatedTests: AssessmentTestCandidate[] = []
				const skippedTests: Array<{ test: AssessmentTestCandidate; error?: unknown }> = []
				const testBatchSize = 20
				const testDelayMs = 500

				for (let i = 0; i < testCandidates.length; i += testBatchSize) {
					const batch = testCandidates.slice(i, i + testBatchSize)
					logger.debug("ghetto-validate batch starting", {
						batchStart: i,
						batchSize: batch.length,
						total: testCandidates.length
					})

					const batchResults = await Promise.all(
						batch.map(async (test) => {
							const identifier = `nice_${test.id}`
							// Upsert test
							const updateResult = await errors.try(qti.updateAssessmentTest(identifier, test.xml))
							if (updateResult.error) {
								if (errors.is(updateResult.error, ErrQtiNotFound)) {
									const createResult = await errors.try(qti.createAssessmentTest(test.xml))
									if (createResult.error) {
										logger.error("ghetto-validate create failed", { identifier, error: createResult.error })
										return { success: false, test, error: createResult.error }
									}
								} else {
									logger.error("ghetto-validate update failed", { identifier, error: updateResult.error })
									return { success: false, test, error: updateResult.error }
								}
							}

							// Delete immediately
							const deleteResult = await errors.try(qti.deleteAssessmentTest(identifier))
							if (deleteResult.error) {
								logger.warn("failed to clean up temp validation item", { identifier, error: deleteResult.error })
							}

							return { success: true, test }
						})
					)

					for (const result of batchResults) {
						if (result.success) {
							validatedTests.push(result.test)
						} else {
							skippedTests.push(result)
						}
					}

					if (i + testBatchSize < testCandidates.length) {
						await new Promise((resolve) => setTimeout(resolve, testDelayMs))
					}
				}

				for (const result of skippedTests) {
					logger.warn("skipping invalid qti test after ghetto-validate", {
						testId: `nice_${result.test.id}`,
						error: result.error
					})
				}

				const assessmentTests = validatedTests.map((t) => t.xml)

				const writeTests = await errors.try(
					fs.writeFile(path.join(courseDir, "assessmentTests.json"), JSON.stringify(assessmentTests, null, 2))
				)
				if (writeTests.error) {
					logger.error("file write failed", {
						error: writeTests.error,
						file: path.join(courseDir, "assessmentTests.json")
					})
					throw errors.wrap(writeTests.error, "file write")
				}

				logger.info("generated tests for course", {
					courseId,
					tests: assessmentTests.length
				})
				return skippedItemsCount
			})
		)

		const overallSkipped = skippedCountsPerCourse.reduce((sum, n) => sum + n, 0)

		logger.info("completed hardcoded qti item and test generation for all courses", {
			courses: HARDCODED_COURSE_IDS.length,
			skippedItems: overallSkipped
		})
		return { status: "complete", courseCount: HARDCODED_COURSE_IDS.length, skippedItems: overallSkipped }
	}
)
