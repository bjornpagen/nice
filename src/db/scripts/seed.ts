#!/usr/bin/env bun
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { InferInsertModel } from "drizzle-orm"
import { sql } from "drizzle-orm"
import { createInsertSchema } from "drizzle-zod"
import { ZodError } from "zod"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { type CourseInfo, CourseInfoSchema } from "@/lib/khan-academy-api"

// Set default log level for the script
logger.setDefaultLogLevel(logger.INFO)

// --- CONFIGURATION ---
const BATCH_SIZE = 2000

// --- TYPE DEFINITIONS FOR DATABASE INSERTION ---
type InsertCourse = InferInsertModel<typeof schema.niceCourses>
type InsertUnit = InferInsertModel<typeof schema.niceUnits>
type InsertLesson = InferInsertModel<typeof schema.niceLessons>
type InsertVideo = InferInsertModel<typeof schema.niceVideos>
type InsertArticle = InferInsertModel<typeof schema.niceArticles>
type InsertExercise = InferInsertModel<typeof schema.niceExercises>
type InsertQuestion = InferInsertModel<typeof schema.niceQuestions>
type InsertAssessment = InferInsertModel<typeof schema.niceAssessments>
type InsertAssessmentExercise = InferInsertModel<typeof schema.niceAssessmentExercises>
type InsertSubject = InferInsertModel<typeof schema.niceSubjects>
type InsertLessonContent = InferInsertModel<typeof schema.niceLessonContents>

// --- ZOD SCHEMAS FOR PRE-FLIGHT VALIDATION ---
const courseInsertSchema = createInsertSchema(schema.niceCourses)
const unitInsertSchema = createInsertSchema(schema.niceUnits)
const lessonInsertSchema = createInsertSchema(schema.niceLessons)
const videoInsertSchema = createInsertSchema(schema.niceVideos)
const articleInsertSchema = createInsertSchema(schema.niceArticles)
const exerciseInsertSchema = createInsertSchema(schema.niceExercises)
const questionInsertSchema = createInsertSchema(schema.niceQuestions)
const assessmentInsertSchema = createInsertSchema(schema.niceAssessments)
const assessmentExerciseInsertSchema = createInsertSchema(schema.niceAssessmentExercises)
const subjectInsertSchema = createInsertSchema(schema.niceSubjects)
const lessonContentInsertSchema = createInsertSchema(schema.niceLessonContents)

/**
 * The main function that orchestrates the entire seeding process.
 */
async function main() {
	logger.info("starting database seed script")

	const dataDir = path.join(process.cwd(), "data")

	// --- CLI FILTERS: allow partial uploads by table type ---
	// usage examples:
	//   bun run src/db/scripts/seed.ts --only=articles
	//   bun run src/db/scripts/seed.ts --only=articles,questions
	//   bun run src/db/scripts/seed.ts --only=videos --only=lessonContents
	const args = process.argv.slice(2)
	const onlyArgs = args.filter((a) => a.startsWith("--only="))
	const onlySet = new Set<string>()
	for (const onlyArg of onlyArgs) {
		const val = onlyArg.split("=", 2)[1] || ""
		for (const t of val.split(",")) {
			const trimmed = t.trim()
			if (trimmed) onlySet.add(trimmed)
		}
	}
	const hasFilter = onlySet.size > 0
	if (hasFilter) {
		logger.info("seeding with partial table selection", { only: Array.from(onlySet) })
	} else {
		logger.info("seeding all tables (no --only filter provided)")
	}

	function shouldSeed(type: string): boolean {
		if (!hasFilter) return true
		return onlySet.has(type)
	}

	// --- 1. Read all JSON data files from the data directory ---
	const fileReadResult = await errors.try(fs.readdir(dataDir))
	if (fileReadResult.error) {
		logger.error("failed to read data directory", { error: fileReadResult.error, path: dataDir })
		throw errors.wrap(fileReadResult.error, "file system read")
	}

	const jsonFileNames = fileReadResult.data.filter((f) => f.endsWith(".json"))
	if (jsonFileNames.length === 0) {
		logger.warn("no .json files found in data directory, exiting", { path: dataDir })
		return
	}
	logger.info("found json files to process", { count: jsonFileNames.length })

	// --- 2. Process and validate all files, collecting data for bulk insertion ---
	const coursesMap = new Map<string, InsertCourse>()
	const unitsMap = new Map<string, InsertUnit>()
	const lessonsMap = new Map<string, InsertLesson>()
	const videosMap = new Map<string, InsertVideo>()
	const articlesMap = new Map<string, InsertArticle>()
	const exercisesMap = new Map<string, InsertExercise>()
	const questionsMap = new Map<string, InsertQuestion>()
	const assessmentsMap = new Map<string, InsertAssessment>()
	const assessmentExercisesMap = new Map<string, InsertAssessmentExercise>()
	const lessonContentsMap = new Map<string, InsertLessonContent>()

	for (const fileName of jsonFileNames) {
		const filePath = path.join(dataDir, fileName)
		logger.info("processing file", { file: fileName })

		const contentReadResult = await errors.try(fs.readFile(filePath, "utf-8"))
		if (contentReadResult.error) {
			logger.error("failed to read file content", { file: fileName, error: contentReadResult.error })
			throw errors.wrap(contentReadResult.error, "file read")
		}

		const parseResult = errors.trySync(() => JSON.parse(contentReadResult.data))
		if (parseResult.error) {
			logger.error("failed to parse json", { file: fileName, error: parseResult.error })
			throw errors.wrap(parseResult.error, "json parse")
		}

		const validationResult = CourseInfoSchema.safeParse(parseResult.data)
		if (!validationResult.success) {
			logger.error("skipping course due to validation error", { file: fileName, error: validationResult.error })
			continue // Skip this course and move to the next file
		}

		const courseData: CourseInfo = validationResult.data

		// --- Traverse the validated data and populate our maps ---
		if (!coursesMap.has(courseData.id)) {
			coursesMap.set(courseData.id, {
				id: courseData.id,
				slug: courseData.slug, // Read slug directly
				title: courseData.title,
				description: courseData.description,
				path: courseData.path
			})
		}

		for (const [courseChildIndex, child] of courseData.children.entries()) {
			if (child.type === "Unit") {
				if (!unitsMap.has(child.id)) {
					unitsMap.set(child.id, {
						id: child.id,
						courseId: courseData.id,
						slug: child.slug, // Read slug directly
						title: child.title,
						description: child.description,
						path: child.path,
						ordering: courseChildIndex
					})
				}
				for (const [unitChildIndex, unitChild] of child.children.entries()) {
					if (unitChild.type === "Lesson") {
						if (!lessonsMap.has(unitChild.id)) {
							lessonsMap.set(unitChild.id, {
								id: unitChild.id,
								unitId: child.id,
								slug: unitChild.slug, // Read slug directly
								title: unitChild.title,
								description: unitChild.description,
								path: unitChild.path,
								ordering: unitChildIndex
							})
						}
						for (const [lessonChildIndex, lessonChild] of unitChild.children.entries()) {
							const key = `${unitChild.id}-${lessonChild.id}`
							if (!lessonContentsMap.has(key)) {
								lessonContentsMap.set(key, {
									lessonId: unitChild.id,
									contentId: lessonChild.id,
									contentType: lessonChild.type,
									ordering: lessonChildIndex
								})
							}

							if (lessonChild.type === "Video" && !videosMap.has(lessonChild.id)) {
								// Validate required fields for videos
								if (!lessonChild.youtubeId) {
									logger.error("video missing youtubeId", { videoId: lessonChild.id })
									throw errors.new("video missing youtubeId")
								}
								if (lessonChild.duration == null) {
									logger.error("video missing duration", { videoId: lessonChild.id })
									throw errors.new("video missing duration")
								}

								videosMap.set(lessonChild.id, {
									id: lessonChild.id,
									title: lessonChild.title,
									slug: lessonChild.slug,
									path: lessonChild.path,
									youtubeId: lessonChild.youtubeId,
									duration: lessonChild.duration,
									description: lessonChild.description
								})
							} else if (lessonChild.type === "Article" && !articlesMap.has(lessonChild.id)) {
								if (!lessonChild.translatedPerseusContent) {
									logger.error("article missing perseus content", { articleId: lessonChild.id })
									throw errors.new("article missing perseus content")
								}

								const perseusContent = lessonChild.translatedPerseusContent
								const perseusResult = errors.trySync(() => JSON.parse(perseusContent))
								if (perseusResult.error) {
									logger.error("failed to parse perseus content", {
										articleId: lessonChild.id,
										title: lessonChild.title,
										error: perseusResult.error
									})
									throw errors.wrap(perseusResult.error, "article perseus content parse")
								}

								articlesMap.set(lessonChild.id, {
									id: lessonChild.id,
									title: lessonChild.title,
									slug: lessonChild.slug,
									path: lessonChild.path,
									perseusContent: perseusResult.data
								})
							} else if (lessonChild.type === "Exercise" && !exercisesMap.has(lessonChild.id)) {
								exercisesMap.set(lessonChild.id, {
									id: lessonChild.id,
									title: lessonChild.title,
									slug: lessonChild.slug,
									path: lessonChild.path,
									description: lessonChild.description
								})
							}
						}
					} else if (
						(unitChild.type === "Quiz" || unitChild.type === "UnitTest") &&
						!assessmentsMap.has(unitChild.id)
					) {
						assessmentsMap.set(unitChild.id, {
							id: unitChild.id,
							type: unitChild.type,
							parentId: child.id,
							parentType: "Unit",
							title: unitChild.title,
							slug: unitChild.slug,
							path: unitChild.path,
							ordering: unitChildIndex,
							description: unitChild.description
						})
						for (const exerciseId of unitChild.exerciseIds) {
							const key = `${unitChild.id}-${exerciseId}`
							if (!assessmentExercisesMap.has(key)) {
								assessmentExercisesMap.set(key, { assessmentId: unitChild.id, exerciseId })
							}
						}
					}
				}
			} else if (
				(child.type === "CourseChallenge" || child.type === "MasteryChallenge") &&
				!assessmentsMap.has(child.id)
			) {
				assessmentsMap.set(child.id, {
					id: child.id,
					type: "CourseChallenge",
					parentId: courseData.id,
					parentType: "Course",
					title: child.title,
					slug: child.slug,
					path: child.path,
					ordering: courseChildIndex,
					description: child.description
				})
				for (const exerciseId of courseData.masterableExerciseIds) {
					const key = `${child.id}-${exerciseId}`
					if (!assessmentExercisesMap.has(key)) {
						assessmentExercisesMap.set(key, { assessmentId: child.id, exerciseId })
					}
				}
			}
		}

		for (const [exerciseId, questionsArray] of Object.entries(courseData.questions)) {
			for (const question of questionsArray) {
				if (!questionsMap.has(question.id)) {
					// Validate required fields for questions
					if (!question.sha) {
						logger.error("question missing sha", { questionId: question.id })
						throw errors.new("question missing sha")
					}
					if (!question.parsedData) {
						logger.error("question missing parsedData", { questionId: question.id })
						throw errors.new("question missing parsedData")
					}

					questionsMap.set(question.id, {
						id: question.id,
						exerciseId: exerciseId,
						sha: question.sha,
						parsedData: question.parsedData,
						problemType: question.problemType
					})
				}
			}
		}
	}

	if (coursesMap.size === 0) {
		logger.info("no validated data found to seed")
		return
	}

	// --- Seed Subjects ---
	logger.info("seeding subjects table")
	const subjectsToInsert: InsertSubject[] = [
		{ slug: "math", title: "Math" },
		{ slug: "science", title: "Science" },
		{ slug: "ela", title: "English Language Arts" },
		{ slug: "humanities", title: "Arts and Humanities" },
		{ slug: "economics-finance-domain", title: "Economics" },
		{ slug: "computing", title: "Computing" },
		{ slug: "test-prep", title: "Test Prep" },
		{ slug: "college-careers-more", title: "College, Careers, and More" }
	]

	for (const subject of subjectsToInsert) {
		const validation = subjectInsertSchema.safeParse(subject)
		if (!validation.success) {
			logger.error("invalid subject data", { subject, error: validation.error.flatten() })
			throw errors.wrap(validation.error, "subject data validation")
		}
	}

	if (shouldSeed("subjects")) {
		const subjectInsertResult = await errors.try(
			db
				.insert(schema.niceSubjects)
				.values(subjectsToInsert)
				.onConflictDoUpdate({ target: schema.niceSubjects.slug, set: { title: sql.raw("excluded.title") } })
		)
		if (subjectInsertResult.error) {
			logger.error("failed to upsert subjects", { error: subjectInsertResult.error })
			throw errors.wrap(subjectInsertResult.error, "subject seeding")
		}
		logger.info("successfully upserted subjects", { count: subjectsToInsert.length })
	} else {
		logger.info("skipping subjects seeding due to --only filter")
	}

	// --- 3. Perform bulk inserts for each table in batches ---
	logger.info("starting database inserts with validation")

	// --- Courses ---
	const coursesToInsert: InsertCourse[] = []
	for (const course of coursesMap.values()) {
		const validation = courseInsertSchema.safeParse(course)
		if (validation.success) {
			coursesToInsert.push(validation.data)
		} else {
			logger.error("invalid course data", {
				courseId: course.id,
				title: course.title,
				error: validation.error.flatten()
			})
			throw errors.wrap(validation.error, "course data validation")
		}
	}
	if (coursesToInsert.length > 0 && shouldSeed("courses")) {
		logger.info("seeding courses", { total: coursesToInsert.length, batchSize: BATCH_SIZE })
		for (let i = 0; i < coursesToInsert.length; i += BATCH_SIZE) {
			const batch = coursesToInsert.slice(i, i + BATCH_SIZE)
			logger.debug("inserting course batch", { batch: i / BATCH_SIZE + 1, count: batch.length })
			const result = await errors.try(
				db
					.insert(schema.niceCourses)
					.values(batch)
					.onConflictDoUpdate({
						target: schema.niceCourses.id,
						set: {
							slug: sql.raw("excluded.slug"),
							title: sql.raw("excluded.title"),
							description: sql.raw("excluded.description"),
							path: sql.raw("excluded.path")
						}
					})
			)
			if (result.error) {
				logger.error("failed to insert course batch, retrying one-by-one", {
					error: result.error
				})
				for (const record of batch) {
					const singleResult = await errors.try(
						db
							.insert(schema.niceCourses)
							.values(record)
							.onConflictDoUpdate({
								target: schema.niceCourses.id,
								set: {
									slug: sql.raw("excluded.slug"),
									title: sql.raw("excluded.title"),
									description: sql.raw("excluded.description"),
									path: sql.raw("excluded.path")
								}
							})
					)
					if (singleResult.error) {
						logger.error("failed to insert single course record", {
							record,
							error: singleResult.error
						})
					}
				}
			}
		}
	}

	// --- Units ---
	const unitsToInsert: InsertUnit[] = []
	for (const unit of unitsMap.values()) {
		const validation = unitInsertSchema.safeParse(unit)
		if (validation.success) {
			unitsToInsert.push(validation.data)
		} else {
			logger.error("invalid unit data", {
				unitId: unit.id,
				title: unit.title,
				error: validation.error.flatten()
			})
			throw errors.wrap(validation.error, "unit data validation")
		}
	}
	if (unitsToInsert.length > 0 && shouldSeed("units")) {
		logger.info("seeding units", { total: unitsToInsert.length, batchSize: BATCH_SIZE })
		for (let i = 0; i < unitsToInsert.length; i += BATCH_SIZE) {
			const batch = unitsToInsert.slice(i, i + BATCH_SIZE)
			logger.debug("inserting unit batch", { batch: i / BATCH_SIZE + 1, count: batch.length })
			const result = await errors.try(
				db
					.insert(schema.niceUnits)
					.values(batch)
					.onConflictDoUpdate({
						target: schema.niceUnits.id,
						set: {
							courseId: sql.raw("excluded.course_id"),
							slug: sql.raw("excluded.slug"),
							title: sql.raw("excluded.title"),
							description: sql.raw("excluded.description"),
							path: sql.raw("excluded.path"),
							ordering: sql.raw("excluded.ordering")
						}
					})
			)
			if (result.error) {
				logger.error("failed to insert unit batch, retrying one-by-one", {
					error: result.error
				})
				for (const record of batch) {
					const singleResult = await errors.try(
						db
							.insert(schema.niceUnits)
							.values(record)
							.onConflictDoUpdate({
								target: schema.niceUnits.id,
								set: {
									courseId: sql.raw("excluded.course_id"),
									slug: sql.raw("excluded.slug"),
									title: sql.raw("excluded.title"),
									description: sql.raw("excluded.description"),
									path: sql.raw("excluded.path"),
									ordering: sql.raw("excluded.ordering")
								}
							})
					)
					if (singleResult.error) {
						logger.error("failed to insert single unit record", {
							record,
							error: singleResult.error
						})
					}
				}
			}
		}
	}

	// --- Lessons ---
	const lessonsToInsert: InsertLesson[] = []
	for (const lesson of lessonsMap.values()) {
		const validation = lessonInsertSchema.safeParse(lesson)
		if (validation.success) {
			lessonsToInsert.push(validation.data)
		} else {
			logger.error("invalid lesson data", {
				lessonId: lesson.id,
				title: lesson.title,
				error: validation.error.flatten()
			})
			throw errors.wrap(validation.error, "lesson data validation")
		}
	}
	if (lessonsToInsert.length > 0 && shouldSeed("lessons")) {
		logger.info("seeding lessons", { total: lessonsToInsert.length, batchSize: BATCH_SIZE })
		for (let i = 0; i < lessonsToInsert.length; i += BATCH_SIZE) {
			const batch = lessonsToInsert.slice(i, i + BATCH_SIZE)
			logger.debug("inserting lesson batch", { batch: i / BATCH_SIZE + 1, count: batch.length })
			const result = await errors.try(
				db
					.insert(schema.niceLessons)
					.values(batch)
					.onConflictDoUpdate({
						target: schema.niceLessons.id,
						set: {
							unitId: sql.raw("excluded.unit_id"),
							slug: sql.raw("excluded.slug"),
							title: sql.raw("excluded.title"),
							description: sql.raw("excluded.description"),
							path: sql.raw("excluded.path"),
							ordering: sql.raw("excluded.ordering")
						}
					})
			)
			if (result.error) {
				logger.error("failed to insert lesson batch, retrying one-by-one", {
					error: result.error
				})
				for (const record of batch) {
					const singleResult = await errors.try(
						db
							.insert(schema.niceLessons)
							.values(record)
							.onConflictDoUpdate({
								target: schema.niceLessons.id,
								set: {
									unitId: sql.raw("excluded.unit_id"),
									slug: sql.raw("excluded.slug"),
									title: sql.raw("excluded.title"),
									description: sql.raw("excluded.description"),
									path: sql.raw("excluded.path"),
									ordering: sql.raw("excluded.ordering")
								}
							})
					)
					if (singleResult.error) {
						logger.error("failed to insert single lesson record", {
							record,
							error: singleResult.error
						})
					}
				}
			}
		}
	}

	// --- Lesson Contents ---
	const lessonContentsToInsert: InsertLessonContent[] = []
	for (const lessonContent of lessonContentsMap.values()) {
		const validation = lessonContentInsertSchema.safeParse(lessonContent)
		if (validation.success) {
			lessonContentsToInsert.push(validation.data)
		} else {
			logger.error("invalid lesson content data", { data: lessonContent, error: validation.error.flatten() })
			throw errors.wrap(validation.error, "lesson content data validation")
		}
	}
	if (lessonContentsToInsert.length > 0 && shouldSeed("lessonContents")) {
		logger.info("seeding lesson_contents", { total: lessonContentsToInsert.length, batchSize: BATCH_SIZE })
		for (let i = 0; i < lessonContentsToInsert.length; i += BATCH_SIZE) {
			const batch = lessonContentsToInsert.slice(i, i + BATCH_SIZE)
			logger.debug("inserting lesson_content batch", { batch: i / BATCH_SIZE + 1, count: batch.length })
			const result = await errors.try(
				db
					.insert(schema.niceLessonContents)
					.values(batch)
					.onConflictDoUpdate({
						target: [schema.niceLessonContents.lessonId, schema.niceLessonContents.contentId],
						set: {
							contentType: sql.raw("excluded.content_type"),
							ordering: sql.raw("excluded.ordering")
						}
					})
			)
			if (result.error) {
				logger.error("failed to insert lesson_content batch, retrying one-by-one", { error: result.error })
				for (const record of batch) {
					const singleResult = await errors.try(
						db
							.insert(schema.niceLessonContents)
							.values(record)
							.onConflictDoUpdate({
								target: [schema.niceLessonContents.lessonId, schema.niceLessonContents.contentId],
								set: {
									contentType: sql.raw("excluded.content_type"),
									ordering: sql.raw("excluded.ordering")
								}
							})
					)
					if (singleResult.error) {
						logger.error("failed to insert single lesson_content record", {
							record,
							error: singleResult.error
						})
					}
				}
			}
		}
	}

	// --- Videos ---
	const videosToInsert: InsertVideo[] = []
	for (const video of videosMap.values()) {
		const validation = videoInsertSchema.safeParse(video)
		if (validation.success) {
			videosToInsert.push(validation.data)
		} else {
			logger.error("invalid video data", {
				videoId: video.id,
				title: video.title,
				error: validation.error.flatten()
			})
			throw errors.wrap(validation.error, "video data validation")
		}
	}
	if (videosToInsert.length > 0 && shouldSeed("videos")) {
		logger.info("seeding videos", { total: videosToInsert.length, batchSize: BATCH_SIZE })
		for (let i = 0; i < videosToInsert.length; i += BATCH_SIZE) {
			const batch = videosToInsert.slice(i, i + BATCH_SIZE)
			logger.debug("inserting video batch", { batch: i / BATCH_SIZE + 1, count: batch.length })
			const result = await errors.try(
				db
					.insert(schema.niceVideos)
					.values(batch)
					.onConflictDoUpdate({
						target: schema.niceVideos.id,
						set: {
							title: sql.raw("excluded.title"),
							slug: sql.raw("excluded.slug"),
							path: sql.raw("excluded.path"),
							youtubeId: sql.raw("excluded.youtube_id"),
							duration: sql.raw("excluded.duration"),
							description: sql.raw("excluded.description")
						}
					})
			)
			if (result.error) {
				logger.error("failed to insert video batch, retrying one-by-one", {
					error: result.error
				})
				for (const record of batch) {
					const singleResult = await errors.try(
						db
							.insert(schema.niceVideos)
							.values(record)
							.onConflictDoUpdate({
								target: schema.niceVideos.id,
								set: {
									title: sql.raw("excluded.title"),
									slug: sql.raw("excluded.slug"),
									path: sql.raw("excluded.path"),
									youtubeId: sql.raw("excluded.youtube_id"),
									duration: sql.raw("excluded.duration"),
									description: sql.raw("excluded.description")
								}
							})
					)
					if (singleResult.error) {
						logger.error("failed to insert single video record", {
							record,
							error: singleResult.error
						})
					}
				}
			}
		}
	}

	// --- Articles ---
	const articlesToInsert: InsertArticle[] = []
	for (const article of articlesMap.values()) {
		const validation = articleInsertSchema.safeParse(article)
		if (validation.success) {
			articlesToInsert.push(validation.data)
		} else {
			logger.error("invalid article data", {
				articleId: article.id,
				title: article.title,
				error: validation.error.flatten()
			})
			throw errors.wrap(validation.error, "article data validation")
		}
	}
	if (articlesToInsert.length > 0 && shouldSeed("articles")) {
		logger.info("seeding articles", { total: articlesToInsert.length, batchSize: BATCH_SIZE })
		for (let i = 0; i < articlesToInsert.length; i += BATCH_SIZE) {
			const batch = articlesToInsert.slice(i, i + BATCH_SIZE)
			logger.debug("inserting article batch", { batch: i / BATCH_SIZE + 1, count: batch.length })
			const result = await errors.try(
				db
					.insert(schema.niceArticles)
					.values(batch)
					.onConflictDoUpdate({
						target: schema.niceArticles.id,
						set: {
							title: sql.raw("excluded.title"),
							slug: sql.raw("excluded.slug"),
							path: sql.raw("excluded.path"),
							perseusContent: sql.raw("excluded.perseus_content")
						}
					})
			)
			if (result.error) {
				logger.error("failed to insert article batch, retrying one-by-one", {
					error: result.error
				})
				for (const record of batch) {
					const singleResult = await errors.try(
						db
							.insert(schema.niceArticles)
							.values(record)
							.onConflictDoUpdate({
								target: schema.niceArticles.id,
								set: {
									title: sql.raw("excluded.title"),
									slug: sql.raw("excluded.slug"),
									path: sql.raw("excluded.path"),
									perseusContent: sql.raw("excluded.perseus_content")
								}
							})
					)
					if (singleResult.error) {
						logger.error("failed to insert single article record", {
							record,
							error: singleResult.error
						})
					}
				}
			}
		}
	}

	// --- Exercises ---
	const exercisesToInsert: InsertExercise[] = []
	for (const exercise of exercisesMap.values()) {
		const validation = exerciseInsertSchema.safeParse(exercise)
		if (validation.success) {
			exercisesToInsert.push(validation.data)
		} else {
			logger.error("invalid exercise data", {
				exerciseId: exercise.id,
				title: exercise.title,
				error: validation.error.flatten()
			})
			throw errors.wrap(validation.error, "exercise data validation")
		}
	}
	if (exercisesToInsert.length > 0 && shouldSeed("exercises")) {
		logger.info("seeding exercises", { total: exercisesToInsert.length, batchSize: BATCH_SIZE })
		for (let i = 0; i < exercisesToInsert.length; i += BATCH_SIZE) {
			const batch = exercisesToInsert.slice(i, i + BATCH_SIZE)
			logger.debug("inserting exercise batch", { batch: i / BATCH_SIZE + 1, count: batch.length })
			const result = await errors.try(
				db
					.insert(schema.niceExercises)
					.values(batch)
					.onConflictDoUpdate({
						target: schema.niceExercises.id,
						set: {
							title: sql.raw("excluded.title"),
							slug: sql.raw("excluded.slug"),
							path: sql.raw("excluded.path"),
							description: sql.raw("excluded.description")
						}
					})
			)
			if (result.error) {
				logger.error("failed to insert exercise batch, retrying one-by-one", {
					error: result.error
				})
				for (const record of batch) {
					const singleResult = await errors.try(
						db
							.insert(schema.niceExercises)
							.values(record)
							.onConflictDoUpdate({
								target: schema.niceExercises.id,
								set: {
									title: sql.raw("excluded.title"),
									slug: sql.raw("excluded.slug"),
									path: sql.raw("excluded.path"),
									description: sql.raw("excluded.description")
								}
							})
					)
					if (singleResult.error) {
						logger.error("failed to insert single exercise record", {
							record,
							error: singleResult.error
						})
					}
				}
			}
		}
	}

	// --- Questions ---
	const questionsToInsert: InsertQuestion[] = []
	for (const question of questionsMap.values()) {
		const validation = questionInsertSchema.safeParse(question)
		if (validation.success) {
			questionsToInsert.push(validation.data)
		} else {
			logger.error("invalid question data", {
				questionId: question.id,
				error: validation.error.flatten()
			})
			throw errors.wrap(validation.error, "question data validation")
		}
	}
	if (questionsToInsert.length > 0 && shouldSeed("questions")) {
		logger.info("seeding questions", { total: questionsToInsert.length, batchSize: BATCH_SIZE })
		for (let i = 0; i < questionsToInsert.length; i += BATCH_SIZE) {
			const batch = questionsToInsert.slice(i, i + BATCH_SIZE)
			logger.debug("inserting question batch", { batch: i / BATCH_SIZE + 1, count: batch.length })
			const result = await errors.try(
				db
					.insert(schema.niceQuestions)
					.values(batch)
					.onConflictDoUpdate({
						target: schema.niceQuestions.id,
						set: {
							exerciseId: sql.raw("excluded.exercise_id"),
							sha: sql.raw("excluded.sha"),
							parsedData: sql.raw("excluded.parsed_data"),
							problemType: sql.raw("excluded.problem_type")
						}
					})
			)
			if (result.error) {
				logger.error("failed to insert question batch, retrying one-by-one", {
					error: result.error
				})
				for (const record of batch) {
					const singleResult = await errors.try(
						db
							.insert(schema.niceQuestions)
							.values(record)
							.onConflictDoUpdate({
								target: schema.niceQuestions.id,
								set: {
									exerciseId: sql.raw("excluded.exercise_id"),
									sha: sql.raw("excluded.sha"),
									parsedData: sql.raw("excluded.parsed_data"),
									problemType: sql.raw("excluded.problem_type")
								}
							})
					)
					if (singleResult.error) {
						logger.error("failed to upsert single question record", {
							record,
							error: singleResult.error
						})
					}
				}
			}
		}
	}

	// --- Assessments ---
	const assessmentsToInsert: InsertAssessment[] = []
	for (const assessment of assessmentsMap.values()) {
		const validation = assessmentInsertSchema.safeParse(assessment)
		if (validation.success) {
			assessmentsToInsert.push(validation.data)
		} else {
			logger.error("invalid assessment data", {
				assessmentId: assessment.id,
				title: assessment.title,
				error: validation.error.flatten()
			})
			throw errors.wrap(validation.error, "assessment data validation")
		}
	}
	if (assessmentsToInsert.length > 0 && shouldSeed("assessments")) {
		logger.info("seeding assessments", { total: assessmentsToInsert.length, batchSize: BATCH_SIZE })
		for (let i = 0; i < assessmentsToInsert.length; i += BATCH_SIZE) {
			const batch = assessmentsToInsert.slice(i, i + BATCH_SIZE)
			logger.debug("inserting assessment batch", { batch: i / BATCH_SIZE + 1, count: batch.length })
			const result = await errors.try(
				db
					.insert(schema.niceAssessments)
					.values(batch)
					.onConflictDoUpdate({
						target: schema.niceAssessments.id,
						set: {
							type: sql.raw("excluded.type"),
							parentId: sql.raw("excluded.parent_id"),
							parentType: sql.raw("excluded.parent_type"),
							title: sql.raw("excluded.title"),
							slug: sql.raw("excluded.slug"),
							path: sql.raw("excluded.path"),
							ordering: sql.raw("excluded.ordering"),
							description: sql.raw("excluded.description")
						}
					})
			)
			if (result.error) {
				logger.error("failed to insert assessment batch, retrying one-by-one", {
					error: result.error
				})
				for (const record of batch) {
					const singleResult = await errors.try(
						db
							.insert(schema.niceAssessments)
							.values(record)
							.onConflictDoUpdate({
								target: schema.niceAssessments.id,
								set: {
									type: sql.raw("excluded.type"),
									parentId: sql.raw("excluded.parent_id"),
									parentType: sql.raw("excluded.parent_type"),
									title: sql.raw("excluded.title"),
									slug: sql.raw("excluded.slug"),
									path: sql.raw("excluded.path"),
									ordering: sql.raw("excluded.ordering"),
									description: sql.raw("excluded.description")
								}
							})
					)
					if (singleResult.error) {
						logger.error("failed to insert single assessment record", {
							record,
							error: singleResult.error
						})
					}
				}
			}
		}
	}

	// --- Assessment Exercises ---
	const assessmentExercisesToInsert: InsertAssessmentExercise[] = []
	for (const assessmentExercise of assessmentExercisesMap.values()) {
		const validation = assessmentExerciseInsertSchema.safeParse(assessmentExercise)
		if (validation.success) {
			assessmentExercisesToInsert.push(validation.data)
		} else {
			logger.error("invalid assessment exercise data", {
				assessmentId: assessmentExercise.assessmentId,
				exerciseId: assessmentExercise.exerciseId,
				error: validation.error.flatten()
			})
			throw errors.wrap(validation.error, "assessment exercise data validation")
		}
	}
	if (assessmentExercisesToInsert.length > 0 && shouldSeed("assessmentExercises")) {
		logger.info("seeding assessment exercises", { total: assessmentExercisesToInsert.length, batchSize: BATCH_SIZE })
		for (let i = 0; i < assessmentExercisesToInsert.length; i += BATCH_SIZE) {
			const batch = assessmentExercisesToInsert.slice(i, i + BATCH_SIZE)
			logger.debug("inserting assessment exercise batch", { batch: i / BATCH_SIZE + 1, count: batch.length })
			const result = await errors.try(
				db
					.insert(schema.niceAssessmentExercises)
					.values(batch)
					.onConflictDoNothing() // This table only has primary key columns, nothing to update
			)
			if (result.error) {
				logger.error("failed to insert assessment exercise batch, retrying one-by-one", {
					error: result.error
				})
				for (const record of batch) {
					const singleResult = await errors.try(
						db
							.insert(schema.niceAssessmentExercises)
							.values(record)
							.onConflictDoNothing() // This table only has primary key columns, nothing to update
					)
					if (singleResult.error) {
						logger.error("failed to insert single assessment exercise record", {
							record,
							error: singleResult.error
						})
					}
				}
			}
		}
	} else {
		logger.info("skipping assessment exercises due to --only filter", { skipped: assessmentExercisesToInsert.length })
	}

	logger.info("database seeding completed")
}

// --- Script Entry Point ---
const result = await errors.try(main())
if (result.error) {
	if (result.error instanceof ZodError) {
		logger.error("a zod validation error occurred during seeding", { error: result.error.flatten() })
	} else {
		logger.error("seed script failed with an unexpected error", { error: result.error })
	}
	process.exit(1)
}

process.exit(0)
