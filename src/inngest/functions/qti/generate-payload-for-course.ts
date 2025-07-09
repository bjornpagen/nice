import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { env } from "@/env"
import { inngest } from "@/inngest/client"
import type { CreateAssessmentTestInput } from "@/lib/qti"

// Define our own type that includes metadata for the JSON output
type AssessmentTestPayload = CreateAssessmentTestInput & {
	metadata: {
		khanId: string
		slug: string
		path: string
		assessmentType: string
		description: string
	}
}

export const generatePayloadForCourse = inngest.createFunction(
	{
		id: "generate-qti-payload-for-course",
		name: "Generate QTI Payload for Course"
	},
	{ event: "qti/course.payload.generate" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting qti payload generation", { courseId })

		// Step 1: Fetch all required course data in a single, non-step operation.
		const courseDataResult = await errors.try(
			db.transaction(async (tx) => {
				const course = await tx.query.niceCourses.findFirst({ where: eq(schema.niceCourses.id, courseId) })
				if (!course) {
					return null
				}

				const units = await tx.query.niceUnits.findMany({ where: eq(schema.niceUnits.courseId, course.id) })
				const unitIds = units.map((u) => u.id)
				if (unitIds.length === 0) {
					return { course, exercises: [], assessments: [], questions: [], assessmentExercises: [] }
				}

				const assessments = await tx.query.niceAssessments.findMany({
					where: and(inArray(schema.niceAssessments.parentId, unitIds), eq(schema.niceAssessments.parentType, "Unit"))
				})
				const assessmentIds = assessments.map((a) => a.id)

				const lessonContents = await tx.query.niceLessonContents.findMany({
					where: inArray(
						schema.niceLessonContents.lessonId,
						tx
							.select({ id: schema.niceLessons.id })
							.from(schema.niceLessons)
							.where(inArray(schema.niceLessons.unitId, unitIds))
					)
				})

				const exerciseIdsFromLessons = lessonContents
					.filter((lc) => lc.contentType === "Exercise")
					.map((lc) => lc.contentId)

				const exerciseIdsFromAssessments =
					assessmentIds.length > 0
						? (
								await tx.query.niceAssessmentExercises.findMany({
									where: inArray(schema.niceAssessmentExercises.assessmentId, assessmentIds)
								})
							).map((ae) => ae.exerciseId)
						: []

				const allExerciseIds = [...new Set([...exerciseIdsFromLessons, ...exerciseIdsFromAssessments])]

				const [exercises, questions] = await Promise.all([
					allExerciseIds.length > 0
						? tx.query.niceExercises.findMany({ where: inArray(schema.niceExercises.id, allExerciseIds) })
						: [],
					allExerciseIds.length > 0
						? tx.query.niceQuestions.findMany({
								where: and(
									inArray(schema.niceQuestions.exerciseId, allExerciseIds),
									isNotNull(schema.niceQuestions.qtiIdentifier),
									ne(schema.niceQuestions.qtiIdentifier, "")
								),
								columns: { id: true, exerciseId: true, qtiIdentifier: true }
							})
						: []
				])

				// Pre-fetch assessment exercises for use in the step function
				const assessmentExercises =
					assessmentIds.length > 0
						? await tx.query.niceAssessmentExercises.findMany({
								where: inArray(schema.niceAssessmentExercises.assessmentId, assessmentIds)
							})
						: []

				return { course, exercises, assessments, questions, assessmentExercises }
			})
		)

		if (courseDataResult.error) {
			logger.error("failed to fetch course data", { courseId, error: courseDataResult.error })
			throw errors.wrap(courseDataResult.error, "database transaction")
		}

		const courseData = courseDataResult.data
		if (!courseData?.course) {
			logger.warn("no course data found, aborting", { courseId })
			throw errors.new(`course not found for id: ${courseId}`)
		}

		const { course, exercises, assessments, questions, assessmentExercises } = courseData

		// Step 2: Generate Assessment Test Payloads. This is a pure data transformation step.
		const testsPayloads = await step.run("generate-tests-payloads", async () => {
			const payloads: AssessmentTestPayload[] = []
			const allTestableEntities = [...exercises, ...assessments]
			const questionsByExerciseId = new Map<string, { id: string; qtiIdentifier: string }[]>()

			for (const q of questions) {
				if (!questionsByExerciseId.has(q.exerciseId)) {
					questionsByExerciseId.set(q.exerciseId, [])
				}
				questionsByExerciseId.get(q.exerciseId)?.push(q)
			}

			for (const testable of allTestableEntities) {
				let questionIdentifiersForTest: string[] = []
				const isAssessment = "type" in testable && testable.type

				if (isAssessment) {
					const relatedExerciseIds = assessmentExercises
						.filter((ae) => ae.assessmentId === testable.id)
						.map((ae) => ae.exerciseId)
					questionIdentifiersForTest = relatedExerciseIds
						.flatMap((exId) => questionsByExerciseId.get(exId) || [])
						.map((q) => q.qtiIdentifier)
				} else {
					questionIdentifiersForTest = (questionsByExerciseId.get(testable.id) || []).map((q) => q.qtiIdentifier)
				}

				const validQtiIdentifiers = questionIdentifiersForTest.filter((id) => id)
				if (validQtiIdentifiers.length === 0) {
					logger.debug("skipping testable with no migrated questions", {
						testableId: testable.id,
						title: testable.title
					})
					continue
				}

				const identifier = `nice-academy-${testable.id}`
				payloads.push({
					identifier,
					title: testable.title,
					"qti-test-part": [
						{
							identifier: "main",
							navigationMode: "nonlinear",
							submissionMode: "individual",
							"qti-assessment-section": [
								{
									identifier: "main-section",
									title: "Main Section",
									visible: true,
									sequence: 1,
									"qti-assessment-item-ref": validQtiIdentifiers.map((id) => ({
										identifier: id,
										href: `https://${env.TIMEBACK_QTI_SERVER_URL}/assessment-items/${id}`
									}))
								}
							]
						}
					],
					metadata: {
						khanId: testable.id,
						slug: testable.slug,
						path: testable.path,
						assessmentType: isAssessment ? String(testable.type) : "Exercise",
						description: testable.description
					}
				})
			}
			return payloads
		})

		// Step 3: Write all payloads to files.
		const outputDir = await step.run("write-payloads-to-files", async () => {
			const baseDir = path.join(process.cwd(), "qti-payloads")
			const courseDir = path.join(baseDir, course.slug)
			await fs.mkdir(courseDir, { recursive: true })

			const filesToWrite = [
				{ name: "assessmentStimuli.json", data: [] },
				{ name: "assessmentItems.json", data: [] },
				{ name: "assessmentTests.json", data: testsPayloads }
			]

			for (const file of filesToWrite) {
				const result = await errors.try(
					fs.writeFile(path.join(courseDir, file.name), JSON.stringify(file.data, null, 2))
				)
				if (result.error) {
					logger.error("failed to write payload file", { file: file.name, error: result.error })
					throw errors.wrap(result.error, `file write failed for ${file.name}`)
				}
			}
			return courseDir
		})

		logger.info("successfully generated all qti payloads", { courseId, outputDir })
		return { status: "success", outputDir, stats: { tests: testsPayloads.length } }
	}
)
