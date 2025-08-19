import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNotNull } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { scienceCollection } from "@/lib/widget-collections/science"
import { simpleVisualCollection } from "@/lib/widget-collections/simple-visual"

// Hardcoded science course IDs copied from the science orchestration job
const HARDCODED_SCIENCE_COURSE_IDS = [
	"x0c5bb03129646fd6", // ms-biology
	"x1baed5db7c1bb50b", // ms-physics
	"x87d03b443efbea0a", // middle-school-earth-and-space-science
	"x230b3ff252126bb6", // hs-bio
	"xc370bc422b7f75fc" // ms-chemistry
]

// Schema to safely inspect widget type names inside structuredJson
const WidgetsMapSchema = z.record(z.object({ type: z.string() }).passthrough())
const StructuredJsonSchema = z
	.object({
		widgets: WidgetsMapSchema.nullable().optional()
	})
	.passthrough()

// Precompute the science-only widget type names (exclude simple-visual types)
const SIMPLE_WIDGET_TYPES = new Set<string>(simpleVisualCollection.widgetTypeKeys.map((t) => `${t}`))
const SCIENCE_ONLY_WIDGET_TYPES = new Set<string>(
	scienceCollection.widgetTypeKeys.map((t) => `${t}`).filter((t) => !SIMPLE_WIDGET_TYPES.has(t))
)

export const orchestrateHardcodedScienceClearXmlForScienceWidgets = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-science-clear-xml-for-science-widgets",
		name: "Clear XML for Science-Only Widgets in Hardcoded Science Courses"
	},
	{ event: "migration/hardcoded.science.clear-xml-for-science-widgets" },
	async ({ logger }) => {
		logger.info("starting clear of xml/structuredJson for science-only widgets", {
			courseCount: HARDCODED_SCIENCE_COURSE_IDS.length
		})

		const coursesResult = await errors.try(
			db
				.select({ id: schema.niceCourses.id, slug: schema.niceCourses.slug })
				.from(schema.niceCourses)
				.where(inArray(schema.niceCourses.id, HARDCODED_SCIENCE_COURSE_IDS))
		)
		if (coursesResult.error) {
			logger.error("db query for science courses failed", { error: coursesResult.error })
			throw errors.wrap(coursesResult.error, "db query for science courses")
		}

		let totalCleared = 0

		for (const course of coursesResult.data) {
			const unitsResult = await errors.try(
				db.select({ id: schema.niceUnits.id }).from(schema.niceUnits).where(eq(schema.niceUnits.courseId, course.id))
			)
			if (unitsResult.error) {
				logger.error("db query for units failed", { error: unitsResult.error, courseId: course.id })
				throw errors.wrap(unitsResult.error, "db query for units")
			}
			const unitIds = unitsResult.data.map((u) => u.id)
			if (unitIds.length === 0) {
				logger.info("no units found for science course, skipping", { courseId: course.id })
				continue
			}

			// Fetch questions scoped to the course via unit -> lesson joins; only those with structuredJson present
			const questionsResult = await errors.try(
				db
					.select({ id: schema.niceQuestions.id, structuredJson: schema.niceQuestions.structuredJson })
					.from(schema.niceQuestions)
					.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
					.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
					.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
					.where(and(inArray(schema.niceLessons.unitId, unitIds), isNotNull(schema.niceQuestions.structuredJson)))
			)
			if (questionsResult.error) {
				logger.error("db query for questions failed", { error: questionsResult.error, courseId: course.id })
				throw errors.wrap(questionsResult.error, "db query for questions")
			}

			const toClearIds: string[] = []

			for (const row of questionsResult.data) {
				const validation = StructuredJsonSchema.safeParse(row.structuredJson)
				if (!validation.success) {
					logger.warn("skipping question due to invalid structuredJson", { questionId: row.id })
					continue
				}
				const widgets = validation.data.widgets
				if (!widgets || Object.keys(widgets).length === 0) {
					// No widgets; ignore
					continue
				}

				// If ANY widget type belongs to science-only set, mark for clearing
				let hasScienceOnly = false
				for (const widget of Object.values(widgets)) {
					const typeName = `${widget.type}`
					if (SCIENCE_ONLY_WIDGET_TYPES.has(typeName)) {
						hasScienceOnly = true
						break
					}
				}

				if (hasScienceOnly) {
					toClearIds.push(row.id)
				}
			}

			if (toClearIds.length === 0) {
				logger.info("no questions require clearing for course", { courseId: course.id })
				continue
			}

			logger.info("clearing xml and structuredJson for questions", {
				courseId: course.id,
				count: toClearIds.length
			})

			const updateResult = await errors.try(
				db
					.update(schema.niceQuestions)
					.set({ xml: null, structuredJson: null })
					.where(inArray(schema.niceQuestions.id, toClearIds))
			)
			if (updateResult.error) {
				logger.error("failed to clear xml/structuredJson for questions", {
					error: updateResult.error,
					courseId: course.id
				})
				throw errors.wrap(updateResult.error, "clear question xml/json for science widgets")
			}

			totalCleared += toClearIds.length
			logger.info("completed clearing for course", { courseId: course.id, cleared: toClearIds.length })
		}

		logger.info("completed clearing xml/structuredJson for science-only widgets across all science courses", {
			totalCleared
		})
		return { status: "complete", totalCleared }
	}
)
