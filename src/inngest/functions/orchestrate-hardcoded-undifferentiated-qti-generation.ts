import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNotNull } from "drizzle-orm"
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

const HARDCODED_COURSE_IDS = [
	"x0267d782", // 6th grade math (Common Core)
	"x6b17ba59", // 7th grade math (Common Core)
	"x7c7044d7" // 8th grade math (Common Core)
]

export const orchestrateHardcodedUndifferentiatedQtiGeneration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-undifferentiated-qti-generation",
		name: "Orchestrate Hardcoded Undifferentiated QTI Generation"
	},
	{ event: "migration/hardcoded.qti.generate-undifferentiated" },
	async ({ logger }) => {
		logger.info("starting hardcoded undifferentiated qti generation", {
			courseCount: HARDCODED_COURSE_IDS.length
		})

		const courses = await db.query.niceCourses.findMany({
			where: inArray(schema.niceCourses.id, HARDCODED_COURSE_IDS),
			columns: { id: true, slug: true }
		})

		await Promise.all(
			courses.map(async (course) => {
				const courseId = course.id
				logger.info("processing course for undifferentiated generation", { courseId })

				const units = await db.query.niceUnits.findMany({
					where: eq(schema.niceUnits.courseId, course.id),
					columns: { id: true }
				})
				if (units.length === 0) {
					logger.info("no units found for course, skipping", { courseId })
					return
				}
				const unitIds = units.map((u) => u.id)

				const [allQuestions, allArticles, unitAssessments, courseAssessments, allExercises] = await Promise.all([
					db
						.select({
							id: schema.niceQuestions.id,
							xml: schema.niceQuestions.xml,
							exerciseId: schema.niceQuestions.exerciseId,
							exerciseTitle: schema.niceExercises.title,
							exerciseSlug: schema.niceExercises.slug
						})
						.from(schema.niceQuestions)
						.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
						.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
						.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
						.where(and(inArray(schema.niceLessons.unitId, unitIds), isNotNull(schema.niceQuestions.xml))),

					db
						.select({
							id: schema.niceArticles.id,
							xml: schema.niceArticles.xml,
							title: schema.niceArticles.title,
							slug: schema.niceArticles.slug
						})
						.from(schema.niceArticles)
						.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
						.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
						.where(and(inArray(schema.niceLessons.unitId, unitIds), isNotNull(schema.niceArticles.xml))),

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
						.where(and(eq(schema.niceAssessments.parentId, courseId), eq(schema.niceAssessments.parentType, "Course"))),

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

				const itemsUnvalidated: AssessmentItem[] = allQuestions.map((q) => {
					if (!q.xml) {
						throw errors.new(`question ${q.id} is missing XML`)
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

					if (i + batchSize < itemsUnvalidated.length) {
						await new Promise((resolve) => setTimeout(resolve, delayMs))
					}
				}

				const skippedItemsCount = skippedItems.length
				for (const result of skippedItems) {
					logger.warn("skipping invalid qti item after ghetto-validate", {
						questionId: result.item.metadata.khanId,
						error: result.error
					})
				}

				const stimuli = allArticles.map((a) => {
					if (!a.xml) {
						throw errors.new(`article ${a.id} is missing XML`)
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

				const allAssessments = [...unitAssessments, ...courseAssessments]
				const questionsByExerciseId = new Map<string, string[]>()
				for (const q of allQuestions) {
					if (!questionsByExerciseId.has(q.exerciseId)) {
						questionsByExerciseId.set(q.exerciseId, [])
					}
					questionsByExerciseId.get(q.exerciseId)?.push(q.id)
				}

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

				const buildTestObject = (
					id: string,
					title: string,
					questions: { id: string; exerciseId: string; exerciseTitle: string }[]
				): string => {
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

					return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="nice_${id}" title="${safeTitle}">
    <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
${sectionsXml}
    </qti-test-part>
</qti-assessment-test>`
				}

				const validOriginalIds = new Set(items.map((it) => String(it.metadata.khanId)))

				const explicitTests = Array.from(assessmentMap.entries()).map(([assessmentId, data]) => {
					const questionIds = data.exerciseIds.flatMap((exerciseId) => questionsByExerciseId.get(exerciseId) || [])
					const filteredIds = questionIds.filter((id) => validOriginalIds.has(String(id)))
					const allQuestionsForTest = filteredIds.map((id) => {
						const question = allQuestions.find((q) => q.id === id)
						if (!question) {
							throw errors.new(`question ${id} not found when building test`)
						}
						return { id: question.id, exerciseId: question.exerciseId, exerciseTitle: question.exerciseTitle }
					})
					return buildTestObject(assessmentId, data.title, allQuestionsForTest)
				})

				const exerciseTests = allExercises.map((exercise) => {
					const questionIds = (questionsByExerciseId.get(exercise.id) || []).filter((id) =>
						validOriginalIds.has(String(id))
					)
					const safeTitle = escapeXmlAttribute(exercise.title)
					const itemRefsXml = questionIds
						.map(
							(itemId, index) =>
								`<qti-assessment-item-ref identifier="nice_${itemId}" href="/assessment-items/nice_${itemId}" sequence="${index + 1}"></qti-assessment-item-ref>`
						)
						.join("\n                ")
					const selectCountForExercise = Math.min(5, questionIds.length)
					return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<qti-assessment-test xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\" identifier=\"nice_${exercise.id}\" title=\"${safeTitle}\">
    <qti-test-part identifier=\"PART_1\" navigation-mode=\"nonlinear\" submission-mode=\"individual\">
        <qti-assessment-section identifier=\"SECTION_${exercise.id}\" title=\"${safeTitle}\" visible=\"true\">
            <qti-selection select=\"${selectCountForExercise}\" with-replacement=\"false\"/>
            <qti-ordering shuffle=\"true\"/>
            ${itemRefsXml}
        </qti-assessment-section>
    </qti-test-part>
</qti-assessment-test>`
				})

				const courseDir = path.join(process.cwd(), "data", course.slug, "qti")
				const mkdirResult = await errors.try(fs.mkdir(courseDir, { recursive: true }))
				if (mkdirResult.error) {
					logger.error("directory creation failed", { error: mkdirResult.error, file: courseDir })
					throw errors.wrap(mkdirResult.error, "directory creation")
				}

				const writeResults = await errors.try(
					Promise.all([
						fs.writeFile(path.join(courseDir, "assessmentItems.json"), JSON.stringify(items, null, 2)),
						fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(stimuli, null, 2)),
						fs.writeFile(
							path.join(courseDir, "assessmentTests.json"),
							JSON.stringify([...explicitTests, ...exerciseTests], null, 2)
						)
					])
				)
				if (writeResults.error) {
					logger.error("file write failed", { error: writeResults.error, courseId })
					throw errors.wrap(writeResults.error, "file write")
				}

				logger.info("generated undifferentiated items, stimuli, and tests for course", {
					courseId,
					items: items.length,
					stimuli: stimuli.length,
					tests: explicitTests.length + exerciseTests.length,
					skippedItems: skippedItemsCount
				})
			})
		)

		logger.info("completed hardcoded undifferentiated qti generation for all courses")
		return { status: "complete", courseCount: HARDCODED_COURSE_IDS.length }
	}
)
