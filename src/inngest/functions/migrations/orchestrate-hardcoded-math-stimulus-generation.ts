import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { HARDCODED_MATH_COURSE_IDS } from "@/lib/constants/course-mapping"
import { replaceRootAttributes } from "@/lib/xml-utils"

export const orchestrateHardcodedMathStimulusGeneration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-math-stimulus-generation",
		name: "Orchestrate Hardcoded Math Course QTI Stimulus Generation"
	},
	{ event: "migration/hardcoded.math.stimuli.generate" },
	async ({ logger }) => {
		logger.info("starting hardcoded qti generation for stimuli", {
			courseCount: HARDCODED_MATH_COURSE_IDS.length
		})

		const courses = await db.query.niceCourses.findMany({
			where: inArray(schema.niceCourses.id, [...HARDCODED_MATH_COURSE_IDS]),
			columns: { id: true, slug: true }
		})

		await Promise.all(
			courses.map(async (course) => {
				const courseId = course.id
				logger.info("generating stimuli for course", { courseId })

				const units = await db.query.niceUnits.findMany({
					where: eq(schema.niceUnits.courseId, courseId),
					columns: { id: true }
				})
				if (units.length === 0) {
					logger.info("no units found for course, skipping", { courseId })
					return
				}
				const unitIds = units.map((u) => u.id)

				const allArticles = await db
					.select({
						id: schema.niceArticles.id,
						xml: schema.niceArticles.xml,
						title: schema.niceArticles.title,
						slug: schema.niceArticles.slug
					})
					.from(schema.niceArticles)
					.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
					.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
					.where(inArray(schema.niceLessons.unitId, unitIds))

				for (const a of allArticles) {
					if (!a.xml) {
						logger.error("CRITICAL: stimulus missing xml", { articleId: a.id })
						throw errors.new("stimulus missing xml")
					}
				}

				const assessmentStimuli = allArticles.map((a) => {
					if (!a.xml) {
						logger.error("unreachable: article should have xml after validation", { articleId: a.id })
						throw errors.new("unreachable: article should have xml after validation")
					}
					const finalXml = replaceRootAttributes(a.xml, "qti-assessment-stimulus", `nice_${a.id}`, a.title)
					return { xml: finalXml, metadata: { khanId: a.id, khanSlug: a.slug, khanTitle: a.title } }
				})

				const courseDir = path.join(process.cwd(), "data", course.slug, "qti")
				const mkdirResult = await errors.try(fs.mkdir(courseDir, { recursive: true }))
				if (mkdirResult.error) {
					logger.error("directory creation failed", { error: mkdirResult.error, file: courseDir })
					throw errors.wrap(mkdirResult.error, "directory creation")
				}

				const writeStimuli = await errors.try(
					fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(assessmentStimuli, null, 2))
				)
				if (writeStimuli.error) {
					logger.error("file write failed", {
						error: writeStimuli.error,
						file: path.join(courseDir, "assessmentStimuli.json")
					})
					throw errors.wrap(writeStimuli.error, "file write")
				}

				logger.info("generated stimuli for course", {
					courseId,
					stimuli: assessmentStimuli.length
				})
			})
		)

		logger.info("completed hardcoded qti generation for stimuli")
		return { status: "complete", courseCount: HARDCODED_MATH_COURSE_IDS.length }
	}
)
