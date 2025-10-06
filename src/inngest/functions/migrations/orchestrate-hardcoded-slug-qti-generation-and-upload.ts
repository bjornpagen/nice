import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { HARDCODED_EXERCISE_SLUGS } from "@/inngest/functions/migrations/orchestrate-hardcoded-exercise-slugs-item-migration"
import { buildDeterministicKBuckets } from "@/lib/utils/k-bucketing"
import { escapeXmlAttribute, replaceRootAttributes } from "@/lib/xml-utils"

type ExerciseRow = {
	exerciseId: string
	exerciseTitle: string
	exerciseSlug: string
	courseId: string
}

type QuestionRow = {
	id: string
	xml: string | null
	exerciseId: string
	problemType: string
}

export const orchestrateHardcodedSlugQtiGenerationAndUpload = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-slug-qti-generation-and-upload",
		name: "Orchestrate QTI Generation and Upload for Hardcoded Exercise Slugs"
	},
	{ event: "migration/hardcoded.exercise-slugs.qti.generate-and-upload" },
	async ({ step, logger }) => {
		logger.info("starting qti generation and upload for exercise slugs", {
			slugCount: HARDCODED_EXERCISE_SLUGS.length
		})

		// 1) Resolve exercises and their courses for the provided slugs
		const exercisesResult = await errors.try<ExerciseRow[]>(
			db
				.select({
					exerciseId: schema.niceExercises.id,
					exerciseTitle: schema.niceExercises.title,
					exerciseSlug: schema.niceExercises.slug,
					courseId: schema.niceUnits.courseId
				})
				.from(schema.niceExercises)
				.innerJoin(schema.niceLessonContents, eq(schema.niceLessonContents.contentId, schema.niceExercises.id))
				.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
				.innerJoin(schema.niceUnits, eq(schema.niceLessons.unitId, schema.niceUnits.id))
				.where(inArray(schema.niceExercises.slug, HARDCODED_EXERCISE_SLUGS))
		)
		if (exercisesResult.error) {
			logger.error("db query for exercises by slug failed", { error: exercisesResult.error })
			throw errors.wrap(exercisesResult.error, "db query for exercises by slug")
		}

		const exercises = exercisesResult.data
		if (exercises.length === 0) {
			logger.info("no exercises found for provided slugs")
			return { status: "completed", slugCount: HARDCODED_EXERCISE_SLUGS.length, items: 0, tests: 0 }
		}

		// 2) Fetch all questions for these exercises with existing XML (across all courses)
		const exerciseIdToTitle = new Map<string, string>(exercises.map((e) => [e.exerciseId, e.exerciseTitle]))

		const questionsResult = await errors.try<QuestionRow[]>(
			db
				.select({
					id: schema.niceQuestions.id,
					xml: schema.niceQuestions.xml,
					exerciseId: schema.niceQuestions.exerciseId,
					problemType: schema.niceQuestions.problemType
				})
				.from(schema.niceQuestions)
				.where(and(inArray(schema.niceQuestions.exerciseId, exercises.map((e) => e.exerciseId)), isNotNull(schema.niceQuestions.xml)))
		)
		if (questionsResult.error) {
			logger.error("db query for questions failed", { error: questionsResult.error })
			throw errors.wrap(questionsResult.error, "db query for questions")
		}

		// 3) Build item XMLs across all exercises
		const items = questionsResult.data.map((q) => {
			if (!q.xml) {
				throw errors.new("question xml missing")
			}
			const exerciseTitle = exerciseIdToTitle.get(q.exerciseId) ?? ""
			const finalXml = replaceRootAttributes(q.xml, "qti-assessment-item", `nice_${q.id}`, exerciseTitle)
			return { xml: finalXml, metadata: { khanId: q.id, khanExerciseId: q.exerciseId } }
		})

		// 4) Build tests: one test per exercise (identifier nice_<exerciseId>)
		const questionsByExerciseId = new Map<string, QuestionRow[]>()
		for (const q of questionsResult.data) {
			const list = questionsByExerciseId.get(q.exerciseId) ?? []
			list.push(q)
			questionsByExerciseId.set(q.exerciseId, list)
		}

		const tests = exercises
			.map((ex) => {
				const questionsForExercise = questionsByExerciseId.get(ex.exerciseId) ?? []
				if (questionsForExercise.length === 0) return null
				const safeTitle = escapeXmlAttribute(ex.exerciseTitle)
				const buckets = buildDeterministicKBuckets(
					ex.exerciseId,
					questionsForExercise.map((q) => ({ id: q.id, problemType: q.problemType })),
					4
				).buckets
				const sectionsXml = buckets
					.map((bucket, i) => {
						const itemRefsXml = bucket
							.map(
								(q, idx) => `
<qti-assessment-item-ref identifier=\"nice_${q.id}\" href=\"/assessment-items/nice_${q.id}\" sequence=\"${idx + 1}\"></qti-assessment-item-ref>`
							)
							.join("\n                ")
						return `        <qti-assessment-section identifier=\"SECTION_${ex.exerciseId}_BUCKET_${i}\" title=\"${safeTitle}\" visible=\"false\">\n\t\t    <qti-selection select=\"1\" with-replacement=\"false\"/>\n\t\t    <qti-ordering shuffle=\"true\"/>\n\t\t    ${itemRefsXml}\n\t\t</qti-assessment-section>`
					})
					.join("\n")

				return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<qti-assessment-test xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\" identifier=\"nice_${ex.exerciseId}\" title=\"${safeTitle}\">\n    <qti-outcome-declaration identifier=\"SCORE\" cardinality=\"single\" base-type=\"float\">\n        <qti-default-value><qti-value>0.0</qti-value></qti-default-value>\n    </qti-outcome-declaration>\n    <qti-test-part identifier=\"PART_1\" navigation-mode=\"nonlinear\" submission-mode=\"individual\">\n${sectionsXml}\n    </qti-test-part>\n</qti-assessment-test>`
			})
			.filter(Boolean) as string[]

		// 5) Write aggregated items and tests to a single directory
		const OUTPUT_SLUG = "hardcoded-exercise-slugs"
		const outDir = path.join(process.cwd(), "data", OUTPUT_SLUG, "qti")
		const mkdirResult = await errors.try(fs.mkdir(outDir, { recursive: true }))
		if (mkdirResult.error) {
			logger.error("directory creation failed", { error: mkdirResult.error, file: outDir })
			throw errors.wrap(mkdirResult.error, "directory creation")
		}

		const writeResults = await errors.try(
			Promise.all([
				fs.writeFile(path.join(outDir, "assessmentItems.json"), JSON.stringify(items, null, 2)),
				fs.writeFile(path.join(outDir, "assessmentTests.json"), JSON.stringify(tests, null, 2))
			])
		)
		if (writeResults.error) {
			logger.error("file write failed", { error: writeResults.error })
			throw errors.wrap(writeResults.error, "file write")
		}

		// 6) Dispatch ingestion events directly for this directory
		const itemEvents = questionsResult.data.map((q) => ({
			name: "qti/assessment-item.ingest.one" as const,
			data: { courseSlug: OUTPUT_SLUG, identifier: `nice_${q.id}` }
		}))
		const testEvents = exercises
			.filter((ex) => (questionsByExerciseId.get(ex.exerciseId) ?? []).length > 0)
			.map((ex) => ({ name: "qti/assessment-test.ingest.one" as const, data: { courseSlug: OUTPUT_SLUG, identifier: `nice_${ex.exerciseId}` } }))

		const allEvents = [...itemEvents, ...testEvents]
		if (allEvents.length > 0) {
			const BATCH_SIZE = 500
			for (let i = 0; i < allEvents.length; i += BATCH_SIZE) {
				const batch = allEvents.slice(i, i + BATCH_SIZE)
				const sendResult = await errors.try(inngest.send(batch))
				if (sendResult.error) {
					logger.error("failed to send ingestion event batch", { error: sendResult.error })
					throw errors.wrap(sendResult.error, "inngest batch send")
				}
				logger.debug("sent ingestion event batch", { batchNumber: i / BATCH_SIZE + 1, size: batch.length })
			}
		}

		logger.info("completed aggregated qti generation and upload for exercise slugs", {
			items: items.length,
			tests: tests.length,
			outputSlug: OUTPUT_SLUG
		})

		return { status: "completed", items: items.length, tests: tests.length, outputSlug: OUTPUT_SLUG }
	}
)


