#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as clack from "@clack/prompts"
import { eq, inArray } from "drizzle-orm"
import { parse } from "csv-parse/sync"
import * as crypto from "node:crypto"
import * as fs from "node:fs"
import * as fsp from "node:fs/promises"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { generateCoursePayload } from "@/lib/payloads/oneroster/course"

interface CsvRow {
	Standard: string
	"Khan Academy Lesson Name"?: string
	"Khan Academy Exercise Name"?: string
	"Exercise Link": string
	"Video Link": string
	[key: string]: string | undefined
}

function getLessonNameFromRow(row: CsvRow): string {
	return row["Khan Academy Lesson Name"] || row["Khan Academy Exercise Name"] || ""
}

function extractSlugFromKhanUrl(url: string): string | null {
	if (!url || url === "") {
		return null
	}
	const videoMatch = url.match(/\/v\/([^/?#]+)/)
	if (videoMatch?.[1]) {
		return videoMatch[1]
	}
	const exerciseMatch = url.match(/\/e\/([^/?#]+)/)
	if (exerciseMatch?.[1]) {
		return exerciseMatch[1]
	}
	return null
}

function extractLessonSlugFromKhanUrl(url: string): string | null {
	if (!url || url === "") {
		return null
	}
	const lessonMatch = url.match(/\/([^/]+)\/[ev]\/[^/?#]+$/)
	if (lessonMatch?.[1]) {
		return lessonMatch[1]
	}
	return null
}

function extractYoutubeIdFromUrl(url: string): string | null {
	if (!url || url === "") {
		return null
	}
	const youtubeMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^/?#&]+)/)
	if (youtubeMatch?.[1]) {
		return youtubeMatch[1]
	}
	return null
}

function extractMultipleVideoUrls(videoLinkCell: string): string[] {
	if (!videoLinkCell || videoLinkCell === "") {
		return []
	}
	// Split by newline and extract URLs after the "N - " prefix
	const lines = videoLinkCell.split("\n").map((line) => line.trim())
	const urls: string[] = []
	for (const line of lines) {
		// Match pattern like "1 - https://..." or just "https://..."
		const urlMatch = line.match(/(?:\d+\s*-\s*)?(https?:\/\/[^\s]+)/)
		if (urlMatch?.[1]) {
			urls.push(urlMatch[1])
		}
	}
	return urls.length > 0 ? urls : [videoLinkCell]
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
}

function generateId(): string {
	return `x${crypto.randomBytes(8).toString("hex")}`
}

async function main(): Promise<void> {
	clack.intro("frankenstein course builder")

	// Get CSV file path
	const csvPath = await clack.text({
		message: "path to csv file:",
		placeholder: "/path/to/your/filename.csv",
		validate: (value) => {
			if (!value || value === "") {
				return "csv path is required"
			}
			if (!fs.existsSync(value)) {
				return "file does not exist"
			}
			return undefined
		}
	})

	if (clack.isCancel(csvPath)) {
		clack.cancel("operation cancelled")
		process.exit(0)
	}

	// Parse CSV
	const csvContent = fs.readFileSync(csvPath, "utf-8")
	const parseResult = errors.trySync(() =>
		parse(csvContent, {
			columns: true,
			skip_empty_lines: true,
			trim: true
		})
	)
	if (parseResult.error) {
		logger.error("csv parse failed", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "csv parse")
	}

	const rows = parseResult.data as CsvRow[]
	clack.log.info(`parsed csv: ${rows.length} rows`)

	// Get course details
	const courseTitle = await clack.text({
		message: "course title:",
		placeholder: "Math Academy 6th Grade CCSS Coverage",
		validate: (value) => {
			if (!value || value === "") {
				return "course title is required"
			}
			return undefined
		}
	})

	if (clack.isCancel(courseTitle)) {
		clack.cancel("operation cancelled")
		process.exit(0)
	}

	const courseSlug = await clack.text({
		message: "course slug:",
		placeholder: "math-academy-6th-ccss-coverage",
		validate: (value) => {
			if (!value || value === "") {
				return "course slug is required"
			}
			return undefined
		}
	})

	if (clack.isCancel(courseSlug)) {
		clack.cancel("operation cancelled")
		process.exit(0)
	}

	const courseDescription = await clack.text({
		message: "course description:",
		placeholder: "A curated collection of Khan Academy lessons covering Grade 6 Common Core State Standards",
		validate: (value) => {
			if (!value || value === "") {
				return "course description is required"
			}
			return undefined
		}
	})

	if (clack.isCancel(courseDescription)) {
		clack.cancel("operation cancelled")
		process.exit(0)
	}

	// Get unit details
	const unitTitle = await clack.text({
		message: "mega unit title:",
		placeholder: "CCSS Coverage",
		validate: (value) => {
			if (!value || value === "") {
				return "unit title is required"
			}
			return undefined
		}
	})

	if (clack.isCancel(unitTitle)) {
		clack.cancel("operation cancelled")
		process.exit(0)
	}

	const unitSlug = await clack.text({
		message: "mega unit slug:",
		placeholder: "ccss-coverage",
		validate: (value) => {
			if (!value || value === "") {
				return "unit slug is required"
			}
			return undefined
		}
	})

	if (clack.isCancel(unitSlug)) {
		clack.cancel("operation cancelled")
		process.exit(0)
	}

	const unitDescription = await clack.text({
		message: "mega unit description:",
		placeholder: "Common Core State Standards coverage for Grade 6 mathematics",
		validate: (value) => {
			if (!value || value === "") {
				return "unit description is required"
			}
			return undefined
		}
	})

	if (clack.isCancel(unitDescription)) {
		clack.cancel("operation cancelled")
		process.exit(0)
	}

	// Analyze CSV to find missing videos
	const spinner = clack.spinner()
	spinner.start("analyzing csv content")

	const videoSlugs = new Set<string>()
	const videoUrlsByRow = new Map<number, string[]>()
	const exerciseSlugs = new Set<string>()

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i]
		if (!row) {
			continue
		}

		const videoUrls = extractMultipleVideoUrls(row["Video Link"])
		const nonKhanUrls: string[] = []

		for (const videoUrl of videoUrls) {
			const videoSlug = extractSlugFromKhanUrl(videoUrl)
			if (videoSlug) {
				videoSlugs.add(videoSlug)
			} else {
				// Check for non-khan video URLs (youtube, etc)
				const youtubeId = extractYoutubeIdFromUrl(videoUrl)
				if (youtubeId) {
					nonKhanUrls.push(videoUrl)
				}
			}
		}

		if (nonKhanUrls.length > 0) {
			videoUrlsByRow.set(i, nonKhanUrls)
		}

		const exerciseSlug = extractSlugFromKhanUrl(row["Exercise Link"])
		if (exerciseSlug) {
			exerciseSlugs.add(exerciseSlug)
		}
	}

	// Check which videos exist in the database
	const videoSlugArray = Array.from(videoSlugs)
	const videosResult = await errors.try(
		videoSlugArray.length > 0
			? db
					.select({
						id: schema.niceVideos.id,
						slug: schema.niceVideos.slug
					})
					.from(schema.niceVideos)
					.where(inArray(schema.niceVideos.slug, videoSlugArray))
			: Promise.resolve([])
	)
	if (videosResult.error) {
		spinner.stop("failed to lookup videos")
		logger.error("video lookup failed", { error: videosResult.error })
		throw errors.wrap(videosResult.error, "video lookup")
	}

	const foundVideoSlugs = new Set(videosResult.data.map((v) => v.slug))
	const missingVideoSlugs = videoSlugArray.filter((slug) => !foundVideoSlugs.has(slug))

	// Check which exercises exist in the database
	const exerciseSlugArray = Array.from(exerciseSlugs)
	const exercisesResult = await errors.try(
		exerciseSlugArray.length > 0
			? db
					.select({
						id: schema.niceExercises.id,
						slug: schema.niceExercises.slug
					})
					.from(schema.niceExercises)
					.where(inArray(schema.niceExercises.slug, exerciseSlugArray))
			: Promise.resolve([])
	)
	if (exercisesResult.error) {
		spinner.stop("failed to lookup exercises")
		logger.error("exercise lookup failed", { error: exercisesResult.error })
		throw errors.wrap(exercisesResult.error, "exercise lookup")
	}

	const foundExerciseSlugs = new Set(exercisesResult.data.map((e) => e.slug))
	const missingExerciseSlugs = exerciseSlugArray.filter((slug) => !foundExerciseSlugs.has(slug))

	spinner.stop(`found ${videosResult.data.length}/${videoSlugArray.length} videos, ${exercisesResult.data.length}/${exerciseSlugArray.length} exercises`)

	if (missingVideoSlugs.length > 0) {
		clack.log.warn(`missing ${missingVideoSlugs.length} khan academy videos (will need to import those courses first)`)
	}

	if (missingExerciseSlugs.length > 0) {
		clack.log.warn(`missing ${missingExerciseSlugs.length} exercises (will need to import those courses first)`)
	}

	// Handle custom videos (non-khan URLs)
	const customVideosToCreate: Array<{
		id: string
		title: string
		slug: string
		youtubeId: string
		duration: number
		description: string
		lessonSlug: string
	}> = []

	if (videoUrlsByRow.size > 0) {
		const totalCustomVideos = Array.from(videoUrlsByRow.values()).reduce((sum, urls) => sum + urls.length, 0)
		clack.log.info(`found ${totalCustomVideos} non-khan video urls across ${videoUrlsByRow.size} rows`)

		for (const [rowIndex, videoUrls] of videoUrlsByRow.entries()) {
			const row = rows[rowIndex]
			if (!row) {
				continue
			}

			for (let videoIdx = 0; videoIdx < videoUrls.length; videoIdx++) {
				const videoUrl = videoUrls[videoIdx]
				if (!videoUrl) {
					continue
				}

				const youtubeId = extractYoutubeIdFromUrl(videoUrl)
				if (!youtubeId) {
					continue
				}

				// Check if video already exists by youtube ID
				const existingVideoResult = await errors.try(
					db
						.select({ id: schema.niceVideos.id, title: schema.niceVideos.title })
						.from(schema.niceVideos)
						.where(eq(schema.niceVideos.youtubeId, youtubeId))
						.limit(1)
				)
				if (existingVideoResult.error) {
					logger.error("failed to check existing video", { youtubeId, error: existingVideoResult.error })
					throw errors.wrap(existingVideoResult.error, "check existing video")
				}

				if (existingVideoResult.data.length > 0) {
					clack.log.success(
						`video with youtube id ${youtubeId} already exists: ${existingVideoResult.data[0]?.title}`
					)
					continue
				}

				clack.log.warn(
					`row ${rowIndex + 1} ("${getLessonNameFromRow(row)}") video ${videoIdx + 1}/${videoUrls.length} needs custom video`
				)

				const createVideo = await clack.confirm({
					message: `create custom video for youtube.com/watch?v=${youtubeId}?`
				})

				if (clack.isCancel(createVideo) || !createVideo) {
					clack.log.warn(`skipping video ${videoIdx + 1} for row ${rowIndex + 1}`)
					continue
				}

				const videoTitle = await clack.text({
					message: "video title:",
					placeholder:
						videoUrls.length > 1
							? `${getLessonNameFromRow(row)} (Part ${videoIdx + 1})`
							: getLessonNameFromRow(row),
					validate: (value) => {
						if (!value || value === "") {
							return "video title is required"
						}
						return undefined
					}
				})

				if (clack.isCancel(videoTitle)) {
					clack.cancel("operation cancelled")
					process.exit(0)
				}

				const videoSlug = await clack.text({
					message: "video slug:",
					placeholder: slugify(videoTitle),
					validate: (value) => {
						if (!value || value === "") {
							return "video slug is required"
						}
						return undefined
					}
				})

				if (clack.isCancel(videoSlug)) {
					clack.cancel("operation cancelled")
					process.exit(0)
				}

				const videoDurationInput = await clack.text({
					message: "video duration (in seconds):",
					placeholder: "299",
					validate: (value) => {
						if (!value || value === "") {
							return "duration is required"
						}
						const parsed = Number(value)
						if (!Number.isInteger(parsed) || parsed <= 0) {
							return "duration must be a positive integer"
						}
						return undefined
					}
				})

				if (clack.isCancel(videoDurationInput)) {
					clack.cancel("operation cancelled")
					process.exit(0)
				}

				const videoDescription = await clack.text({
					message: "video description:",
					placeholder: "Description of the video content",
					validate: (value) => {
						if (!value || value === "") {
							return "video description is required"
						}
						return undefined
					}
				})

				if (clack.isCancel(videoDescription)) {
					clack.cancel("operation cancelled")
					process.exit(0)
				}

				const lessonSlug = extractLessonSlugFromKhanUrl(row["Exercise Link"]) || slugify(getLessonNameFromRow(row))

				customVideosToCreate.push({
					id: `x${youtubeId}`,
					title: videoTitle,
					slug: videoSlug,
					youtubeId,
					duration: Number(videoDurationInput),
					description: videoDescription,
					lessonSlug
				})
			}
		}
	}

	// Check if course already exists
	const existingCourseResult = await errors.try(
		db.select({ id: schema.niceCourses.id }).from(schema.niceCourses).where(eq(schema.niceCourses.slug, courseSlug)).limit(1)
	)
	if (existingCourseResult.error) {
		logger.error("failed to check existing course", { error: existingCourseResult.error })
		throw errors.wrap(existingCourseResult.error, "check existing course")
	}

	if (existingCourseResult.data.length > 0) {
		const shouldDelete = await clack.confirm({
			message: `course with slug "${courseSlug}" already exists. delete and recreate?`
		})

		if (clack.isCancel(shouldDelete)) {
			clack.cancel("operation cancelled")
			process.exit(0)
		}

		if (!shouldDelete) {
			clack.cancel("course already exists - aborting")
			process.exit(0)
		}

		const deleteResult = await errors.try(db.delete(schema.niceCourses).where(eq(schema.niceCourses.slug, courseSlug)))
		if (deleteResult.error) {
			logger.error("failed to delete existing course", { error: deleteResult.error })
			throw errors.wrap(deleteResult.error, "delete existing course")
		}

		clack.log.success("deleted existing course")
	}

	// Generate IDs
	const courseId = generateId()
	const coursePath = `/math/${courseSlug}`
	const unitId = generateId()
	const unitPath = `${coursePath}/${unitSlug}`

	const creationSpinner = clack.spinner()
	creationSpinner.start("creating course structure")

	// Use transaction for atomic insertion
	const txResult = await errors.try(
		db.transaction(async (tx) => {
			// 1. Create custom videos first
			for (const customVideo of customVideosToCreate) {
				const videoPath = `${coursePath}/${unitSlug}/${customVideo.lessonSlug}/v/${customVideo.slug}`
				const videoInsertResult = await errors.try(
					tx.insert(schema.niceVideos).values({
						id: customVideo.id,
						title: customVideo.title,
						slug: customVideo.slug,
						path: videoPath,
						youtubeId: customVideo.youtubeId,
						duration: customVideo.duration,
						description: customVideo.description
					})
				)
				if (videoInsertResult.error) {
					logger.error("custom video insert failed", { videoId: customVideo.id, error: videoInsertResult.error })
					throw errors.wrap(videoInsertResult.error, "custom video insert")
				}
				logger.info("inserted custom video", { videoId: customVideo.id, youtubeId: customVideo.youtubeId })
			}

			// 2. Insert course
			const courseInsertResult = await errors.try(
				tx.insert(schema.niceCourses).values({
					id: courseId,
					slug: courseSlug,
					title: courseTitle,
					path: coursePath,
					description: courseDescription
				})
			)
			if (courseInsertResult.error) {
				logger.error("course insert failed", { error: courseInsertResult.error })
				throw errors.wrap(courseInsertResult.error, "course insert")
			}

			// 3. Insert unit
			const unitInsertResult = await errors.try(
				tx.insert(schema.niceUnits).values({
					id: unitId,
					courseId,
					slug: unitSlug,
					title: unitTitle,
					path: unitPath,
					description: unitDescription,
					ordering: 0
				})
			)
			if (unitInsertResult.error) {
				logger.error("unit insert failed", { error: unitInsertResult.error })
				throw errors.wrap(unitInsertResult.error, "unit insert")
			}

			// 4. Process each CSV row to create lessons and link content
			const lessonInserts: Array<{
				id: string
				unitId: string
				slug: string
				title: string
				path: string
				description: string
				ordering: number
			}> = []
			const lessonContentInserts: Array<{
				lessonId: string
				contentId: string
				contentType: "Video" | "Article" | "Exercise"
				ordering: number
			}> = []

			for (let i = 0; i < rows.length; i++) {
				const row = rows[i]
				if (!row) {
					continue
				}

				const exerciseSlug = extractSlugFromKhanUrl(row["Exercise Link"])
				const baseLessonSlug =
					extractLessonSlugFromKhanUrl(row["Exercise Link"]) || slugify(getLessonNameFromRow(row))
				const lessonSlug = `${baseLessonSlug}-${i + 1}`

				const lessonId = generateId()
				const lessonTitle = getLessonNameFromRow(row)
				const lessonPath = `${unitPath}/${lessonSlug}`
				const lessonDescription = `Standard: ${row.Standard}`

				lessonInserts.push({
					id: lessonId,
					unitId,
					slug: lessonSlug,
					title: lessonTitle,
					path: lessonPath,
					description: lessonDescription,
					ordering: i
				})

				// Lookup and link content
				let contentOrdering = 0

				// Handle multiple videos per row
				const videoUrls = extractMultipleVideoUrls(row["Video Link"])
				for (const videoUrl of videoUrls) {
					const videoSlug = extractSlugFromKhanUrl(videoUrl)

					if (videoSlug) {
						// Try khan academy video
						const videoLookupResult = await errors.try(
							tx
								.select({ id: schema.niceVideos.id })
								.from(schema.niceVideos)
								.where(eq(schema.niceVideos.slug, videoSlug))
								.limit(1)
						)
						if (videoLookupResult.error) {
							logger.error("video lookup failed", { videoSlug, error: videoLookupResult.error })
							throw errors.wrap(videoLookupResult.error, "video lookup")
						}
						const video = videoLookupResult.data[0]
						if (video) {
							lessonContentInserts.push({
								lessonId,
								contentId: video.id,
								contentType: "Video",
								ordering: contentOrdering++
							})
						}
					} else {
						// Try custom video by youtube ID
						const youtubeId = extractYoutubeIdFromUrl(videoUrl)
						if (youtubeId) {
							const customVideoId = `x${youtubeId}`
							const customVideoLookupResult = await errors.try(
								tx
									.select({ id: schema.niceVideos.id })
									.from(schema.niceVideos)
									.where(eq(schema.niceVideos.id, customVideoId))
									.limit(1)
							)
							if (customVideoLookupResult.error) {
								logger.error("custom video lookup failed", {
									customVideoId,
									error: customVideoLookupResult.error
								})
								throw errors.wrap(customVideoLookupResult.error, "custom video lookup")
							}
							const customVideo = customVideoLookupResult.data[0]
							if (customVideo) {
								lessonContentInserts.push({
									lessonId,
									contentId: customVideo.id,
									contentType: "Video",
									ordering: contentOrdering++
								})
							}
						}
					}
				}

				// Link exercise last (after all videos)
				if (exerciseSlug) {
					const exerciseLookupResult = await errors.try(
						tx
							.select({ id: schema.niceExercises.id })
							.from(schema.niceExercises)
							.where(eq(schema.niceExercises.slug, exerciseSlug))
							.limit(1)
					)
					if (exerciseLookupResult.error) {
						logger.error("exercise lookup failed", { exerciseSlug, error: exerciseLookupResult.error })
						throw errors.wrap(exerciseLookupResult.error, "exercise lookup")
					}
					const exercise = exerciseLookupResult.data[0]
					if (exercise) {
						lessonContentInserts.push({
							lessonId,
							contentId: exercise.id,
							contentType: "Exercise",
							ordering: contentOrdering++
						})
					}
				}
			}

			// 5. Batch insert lessons
			if (lessonInserts.length > 0) {
				const lessonsInsertResult = await errors.try(tx.insert(schema.niceLessons).values(lessonInserts))
				if (lessonsInsertResult.error) {
					logger.error("lessons batch insert failed", { error: lessonsInsertResult.error })
					throw errors.wrap(lessonsInsertResult.error, "lessons batch insert")
				}
			}

			// 6. Batch insert lesson contents
			if (lessonContentInserts.length > 0) {
				const lessonContentsInsertResult = await errors.try(
					tx.insert(schema.niceLessonContents).values(lessonContentInserts)
				)
				if (lessonContentsInsertResult.error) {
					logger.error("lesson contents batch insert failed", { error: lessonContentsInsertResult.error })
					throw errors.wrap(lessonContentsInsertResult.error, "lesson contents batch insert")
				}
			}
		})
	)

	if (txResult.error) {
		creationSpinner.stop("transaction failed")
		logger.error("transaction failed", { error: txResult.error })
		throw errors.wrap(txResult.error, "database transaction")
	}

	creationSpinner.stop(`created course with ${rows.length} lessons`)

	// Generate oneroster payload
	const shouldGeneratePayload = await clack.confirm({
		message: "generate oneroster payload?"
	})

	if (clack.isCancel(shouldGeneratePayload)) {
		clack.outro("course created successfully")
		process.exit(0)
	}

	if (shouldGeneratePayload) {
		const payloadSpinner = clack.spinner()
		payloadSpinner.start("generating oneroster payload")

		const payloadResult = await errors.try(generateCoursePayload(courseId))
		if (payloadResult.error) {
			payloadSpinner.stop("payload generation failed")
			logger.error("payload generation failed", { error: payloadResult.error })
			throw errors.wrap(payloadResult.error, "payload generation")
		}

		const outputPath = await clack.text({
			message: "output path for payload:",
			placeholder: `data/exports/qti/${courseSlug}-oneroster.json`,
			validate: (value) => {
				if (!value || value === "") {
					return "output path is required"
				}
				return undefined
			}
		})

		if (clack.isCancel(outputPath)) {
			clack.outro("course created successfully (no payload saved)")
			process.exit(0)
		}

		const writeResult = await errors.try(fsp.writeFile(outputPath, JSON.stringify(payloadResult.data, null, 2)))
		if (writeResult.error) {
			payloadSpinner.stop("failed to write payload")
			logger.error("failed to write payload", { error: writeResult.error })
			throw errors.wrap(writeResult.error, "write payload file")
		}

		payloadSpinner.stop(`payload saved to ${outputPath}`)
	}

	clack.outro("frankenstein course created successfully!")
    process.exit(0)
}

const result = await errors.try(main())
if (result.error) {
	clack.log.error("script failed")
	logger.error("script failed", { error: result.error })
	process.exit(1)
}
