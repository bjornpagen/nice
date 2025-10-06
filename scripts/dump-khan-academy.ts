#!/usr/bin/env bun
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import {
	type ArticleInfo,
	type ContentCaches,
	type CourseChallengeInfo,
	type CourseInfo,
	ErrNoCourseData,
	ErrNoListedPathData,
	type ExerciseInfo,
	KhanAcademyClient,
	type LearnableArticle,
	type LearnableVideo,
	type LessonInfo,
	type MasteryChallengeInfo,
	type QuestionInfo,
	type QuizInfo,
	type UnitInfo,
	type UnitTestInfo,
	type VideoInfo
} from "@/lib/khan-academy-api"

logger.setDefaultLogLevel(logger.DEBUG)

// --- CONFIGURATION ---

const MAX_CONCURRENCY = 1 // Reduce concurrency to simplify debugging of POST requests
const TARGET_REGION = "US-TX" // California region for Common Core content

// This cookie is required for authenticated endpoints like creating a practice task.
// It should be kept up-to-date by copying from a logged-in browser session.
const KHAN_ACADEMY_COOKIE =
	'browsing_session_id=_en_bsid_0c453939-0dd6-4101-8de0-aa862fd00001; LIS=www; KAAS=-El10tBzYFUB9rq4r2FtyQ; KAAL=$7NoKZlKB-x01redaJ2agSVPO4HWbAqjAiGJabVZ_Jyo.~t3qbcn$a2FpZF8zMTk2NzA5OTYyNTA3ODk3NDgzMzY2MTQ*; KAAC=$g5QX7qSSabA5zL_OrY6D0f13Gc55ps0Doi_8S9CdPb8.~t3qbcn$a2FpZF8zMTk2NzA5OTYyNTA3ODk3NDgzMzY2MTQ*$a2FpZF8zMTk2NzA5OTYyNTA3ODk3NDgzMzY2MTQ!0!0$~4; browsing_session_expiry="Mon, 06 Oct 2025 21:55:40 UTC"'

// --- HELPER FUNCTIONS ---

async function retryOperation<T>(
	operation: () => Promise<T>,
	context: string,
	maxRetries: number | "infinite" = "infinite"
): Promise<T> {
	let lastError: Error | null = null
	let attempt = 0

	while (true) {
		attempt++
		const result = await errors.try(operation())
		if (!result.error) {
			if (attempt > 1) {
				logger.info("operation succeeded after retries", {
					context,
					attemptsTaken: attempt
				})
			}
			return result.data
		}

		lastError = result.error

		// Check for specific errors that should not be retried
		if (errors.is(lastError, ErrNoListedPathData) || errors.is(lastError, ErrNoCourseData)) {
			logger.warn("encountered non-retryable error", {
				context,
				error: lastError
			})
			throw lastError // Propagate the error without wrapping to preserve error identity
		}

		// Check if we should stop retrying
		if (maxRetries !== "infinite" && attempt >= maxRetries) {
			logger.error("operation failed after all retries", {
				context,
				maxRetries,
				error: lastError
			})
			if (!lastError) {
				logger.error("operation failed without error details", { context })
				throw errors.new(`${context}: operation failed without error details`)
			}
			logger.error("operation failed after retries", { context, maxRetries, error: lastError })
			throw errors.wrap(lastError, `${context}: failed after ${maxRetries} retries`)
		}

		// Calculate backoff with a cap
		const baseBackoffMs = 1000
		const maxBackoffMs = 300000 // 5 minutes max
		const backoffMs = Math.min(baseBackoffMs * 2 ** Math.min(attempt - 1, 10), maxBackoffMs)

		logger.warn("operation failed, will retry indefinitely", {
			context,
			attempt,
			nextRetryInMs: backoffMs,
			error: lastError
		})

		await new Promise((resolve) => setTimeout(resolve, backoffMs))
	}
}

async function fetchQuestionsForExercise(
	apiClient: KhanAcademyClient,
	exerciseId: string,
	ancestorIds: string[]
): Promise<QuestionInfo[]> {
	logger.info("fetching questions for exercise", { exerciseId })

	// Step 1: Create a practice task to get all item IDs.
	logger.info("creating practice task", { exerciseId })
	const taskResult = await errors.try(apiClient.getOrCreatePracticeTask(exerciseId, ancestorIds))
	if (taskResult.error) {
		logger.error("failed to create practice task", { exerciseId, error: taskResult.error })
		throw errors.wrap(taskResult.error, "practice task creation failed")
	}

	const userTask = taskResult.data.data.getOrCreatePracticeTask.result.userTask
	if (!userTask) {
		logger.warn("practice task response contained no userTask, likely an empty exercise", { exerciseId })
		return []
	}

	const userExercises = userTask.userExercises
	if (userExercises.length === 0) {
		logger.error("parser invariant violation: practice task has no userExercises array", { exerciseId })
		throw errors.new("practice task response contained no userExercises array")
	}

	const problemTypes = userExercises[0]?.exerciseModel?.problemTypes

	if (!problemTypes || problemTypes.length === 0) {
		logger.warn("exercise contains no problem types", { exerciseId })
		return [] // This is also a valid state.
	}

	// Collect items from ALL problem types, not just the first one
	const allItems: Array<{ id: string; sha: string }> = []
	for (let i = 0; i < problemTypes.length; i++) {
		const problemType = problemTypes[i]
		const items = problemType?.items || []

		logger.debug("processing problem type in dump script", {
			exerciseId,
			problemTypeIndex: i,
			itemCount: items.length
		})

		for (const item of items) {
			allItems.push(item)
		}
	}

	if (allItems.length === 0) {
		logger.warn("exercise contains no items across all problem types", { exerciseId })
		return [] // This is also a valid state.
	}

	logger.info("retrieved all item IDs for exercise", {
		exerciseId,
		count: allItems.length,
		problemTypesFound: problemTypes.length
	})
	const allQuestions: QuestionInfo[] = []
	let itemsProcessed = 0

	// Step 2: Fetch all assessment items (questions) concurrently.
	for (let i = 0; i < allItems.length; i += MAX_CONCURRENCY) {
		const chunk = allItems.slice(i, i + MAX_CONCURRENCY)
		logger.info("fetching chunk of assessment items", {
			exerciseId,
			chunk: i / MAX_CONCURRENCY + 1,
			totalChunks: Math.ceil(allItems.length / MAX_CONCURRENCY),
			chunkSize: chunk.length
		})

		const promises = chunk.map((item) =>
			apiClient.getAssessmentItem({ exerciseId, itemId: item.id }).then((res) => {
				const assessmentItem = res.data.assessmentItem

				// When fetching by itemId, we should always get an item, not an error
				if (!assessmentItem.item) {
					logger.error("unexpected null item from assessment item", { exerciseId, itemId: item.id })
					throw errors.new(`unexpected null item for exerciseId ${exerciseId}, itemId ${item.id}`)
				}

				const { itemData, ...itemRest } = assessmentItem.item

				// Use a simple, safe JSON.parse. The 'parsedData' field in QuestionInfo is already 'unknown'.
				const parsedData = JSON.parse(itemData)
				return { ...itemRest, parsedData }
			})
		)

		const chunkResult = await errors.try(Promise.all(promises))
		if (chunkResult.error) {
			logger.error("failed to fetch a chunk of assessment items", { exerciseId, error: chunkResult.error })
			throw errors.wrap(chunkResult.error, "assessment item chunk fetch failed")
		}

		allQuestions.push(...chunkResult.data)
		itemsProcessed += chunk.length
		logger.info("finished chunk", { exerciseId, progress: `${itemsProcessed}/${allItems.length}` })
	}

	logger.info("completed fetching all questions for exercise", {
		exerciseId,
		totalQuestions: allQuestions.length
	})
	// Step 3: Return the fetched questions
	return allQuestions
}

// REMOVED: The entire fetchQuestionsForAssessment function is deleted. It is incorrect.

async function fetchVideoDetails(apiClient: KhanAcademyClient, video: VideoInfo): Promise<LearnableVideo> {
	logger.info("fetching details for video", {
		videoId: video.id,
		videoSlug: video.slug,
		videoTitle: video.title
	})

	const detailsResult = await errors.try(apiClient.getContentForLearnableContent(video.id, "Video"))
	if (detailsResult.error) {
		logger.error("failed to fetch video details", { videoId: video.id, error: detailsResult.error })
		throw errors.wrap(detailsResult.error, "video details fetch failed")
	}

	logger.info("completed fetching details for video", {
		videoId: video.id,
		title: detailsResult.data.data.learnableContent.translatedTitle
	})

	// MODIFIED: Return the full learnableContent object directly.
	return detailsResult.data.data.learnableContent
}

// MODIFIED: Return type is now a flat data object.
type FetchedArticleResult = { type: "Article"; data: LearnableArticle } | { type: "Video"; data: LearnableVideo }

async function fetchArticleOrVideoDetails(
	apiClient: KhanAcademyClient,
	article: ArticleInfo
): Promise<FetchedArticleResult> {
	logger.info("fetching details for article", {
		articleId: article.id,
		articleSlug: article.slug,
		path: article.path
	})

	const detailsResult = await errors.try(apiClient.getContentForPath(article.path))
	if (detailsResult.error) {
		logger.error("failed to fetch article details", { articleId: article.id, error: detailsResult.error })
		throw errors.wrap(detailsResult.error, "article details fetch failed")
	}

	const content = detailsResult.data.data.contentRoute.listedPathData?.content

	if (content?.__typename === "Article") {
		logger.info("completed fetching details for article", {
			articleId: article.id,
			title: content.translatedTitle
		})
		return { type: "Article", data: content }
	}

	if (content?.__typename === "Video") {
		logger.warn("re-classifying content: article path returned a video", {
			articleId: article.id,
			path: article.path,
			videoId: content.id
		})
		return { type: "Video", data: content }
	}

	// Fail loudly on any unexpected content type or missing content
	logger.error("article fetch failed: unexpected content type or missing content", {
		articleId: article.id,
		path: article.path,
		contentType: content?.__typename,
		hasContent: !!content
	})
	throw errors.new(
		`article fetch failed for ${article.id}: expected article content but found ${content?.__typename || "null"}`
	)
}

// --- MAIN SCRIPT LOGIC ---

async function main() {
	const args = process.argv.slice(2)
	const isDryRun = args.includes("--dry-run")
	const noVideosOrArticles = args.includes("--no-videos-or-articles")
	const pathFilters = args.filter((arg) => arg !== "--dry-run" && arg !== "--no-videos-or-articles")

	logger.info("starting khan academy content data dumper script", {
		dryRun: isDryRun,
		noVideosOrArticles,
		filters: pathFilters.length > 0 ? pathFilters : "none"
	})

	// SAFETY GATE: Exercise-only mode can corrupt ordering if seed upserts ordering.
	// We DO NOT allow --no-videos-or-articles unless the operator explicitly confirms
	// they have asked Bjorn and understand the policy:
	//   "NEVER upsert the 'ordering' field on conflicts."
	if (noVideosOrArticles) {
		logger.warn("--no-videos-or-articles selected", {
			message:
				"This mode can corrupt lesson ordering if the seeding process updates 'ordering' on conflict.",
			policy:
				"NEVER upsert the 'ordering' field on conflicts (units, lessons, assessments, lesson_contents).",
			instruction:
				"Use this flag ONLY after confirming with Bjorn and only after a full upload without this flag."
		})
		const rl = readline.createInterface({ input, output })
		const answer = await rl.question(
			"Type EXACTLY 'I_HAVE_ASKED_BJORN' to continue with --no-videos-or-articles: "
		)
		rl.close()
		if (answer.trim() !== "I_HAVE_ASKED_BJORN") {
			logger.error("confirmation missing for --no-videos-or-articles; aborting", {
				provided: answer.trim() || "<empty>"
			})
			process.exit(1)
		}
	}

	// Step 1: Define output paths. The exercise output directory is no longer needed.
	const dataDir = path.join(process.cwd(), "data")

	// Step 2: Ensure data directory exists.
	const mkdirResult = await errors.try(fs.mkdir(dataDir, { recursive: true }))
	if (mkdirResult.error) {
		logger.error("failed to create data directory", { error: mkdirResult.error })
		throw errors.wrap(mkdirResult.error, "create data directory")
	}

	// Check existing files for resumability
	const existingFiles = await errors.try(fs.readdir(dataDir))
	const existingCourses = new Set<string>()
	if (!existingFiles.error) {
		for (const file of existingFiles.data) {
			if (file.endsWith(".json")) {
				existingCourses.add(file)
			}
		}
		logger.info("found existing course files", { count: existingCourses.size })
	}

	// Helper function to check if course already exists
	function courseAlreadyExists(coursePath: string): boolean {
		const slug = coursePath.replace(/^\/|\/$/g, "").replace(/\//g, "-")
		const fileName = `${slug}.json`
		return existingCourses.has(fileName)
	}

	// Helper function to check if course should be skipped
	function shouldSkipCourse(coursePath: string): boolean {
		// Skip humanities/climate-project courses as they contain inaccessible draft content
		if (coursePath.includes("/humanities/climate-project")) {
			logger.info("skipping humanities/climate-project course", { path: coursePath })
			return true
		}
		// Skip getty-museum courses as they contain inaccessible content
		if (coursePath.includes("/getty-museum")) {
			logger.info("skipping getty-museum course", { path: coursePath })
			return true
		}
		return false
	}

	// Step 3: Discover all content paths.
	const apiClient = new KhanAcademyClient(KHAN_ACADEMY_COOKIE)
	const topicsResult = await errors.try(apiClient.getLearnMenuTopics(TARGET_REGION))
	if (topicsResult.error) {
		logger.error("failed to fetch learn menu topics", { error: topicsResult.error })
		throw topicsResult.error
	}
	const allPaths = topicsResult.data.data.learnMenuTopics.flatMap((category) =>
		category.children.map((link) => link.href)
	)

	// Step 4: Handle dry-run.
	if (isDryRun) {
		logger.info("dry-run enabled, dumping discovered paths to stdout")
		// biome-ignore lint/suspicious/noConsole: The purpose of dry-run is to pipe output.
		console.log(JSON.stringify(allPaths, null, 2))
		return
	}

	// Type for all possible content items
	type ContentItem =
		| CourseInfo
		| UnitInfo
		| LessonInfo
		| ExerciseInfo
		| VideoInfo
		| ArticleInfo
		| QuizInfo
		| UnitTestInfo
		| CourseChallengeInfo
		| MasteryChallengeInfo

	// EXTRACTED: Shared hydration scheduling function
	function createScheduleHydration(
		fetchPromises: Promise<void>[],
		scheduledQuestionFetches: Set<string>,
		noVideosOrArticlesFlag: boolean,
		isKnownExerciseId: (exerciseId: string) => boolean
	) {
		return function scheduleHydration(item: ContentItem, ancestors: string[], course: CourseInfo) {
			const newAncestors = [item.id, ...ancestors]
			const scheduleQuestionFetch = (exerciseId: string) => {
				if (!scheduledQuestionFetches.has(exerciseId)) {
					scheduledQuestionFetches.add(exerciseId)
					fetchPromises.push(
						retryOperation(
							() => fetchQuestionsForExercise(apiClient, exerciseId, newAncestors),
							`fetchQuestions:${exerciseId}`
						).then((questions) => {
							course.questions[exerciseId] = questions
						})
					)
				}
			}
			if (item.type === "Exercise") {
				scheduleQuestionFetch(item.id)
			} else if (item.type === "Quiz" || item.type === "UnitTest") {
				const assessmentPromise = retryOperation(
					() => apiClient.getContentForPath(item.path),
					`fetchAssessment:${item.id}`
				)
					.then(async (res) => {
						const assessmentContent = res.data.contentRoute.listedPathData?.content
						if (
							!assessmentContent ||
							!("coveredTutorials" in assessmentContent) ||
							!assessmentContent.coveredTutorials
						) {
							item.exerciseIds = []
							return
						}
						const exerciseIds = assessmentContent.coveredTutorials
							.flatMap((tut) => tut.allLearnableContent)
							.filter((content) => content.__typename === "Exercise")
							.map((ex) => ex.id)
						item.exerciseIds = exerciseIds
						for (const exId of exerciseIds) {
							if (isKnownExerciseId(exId)) {
								scheduleQuestionFetch(exId)
							} else {
								logger.warn("skipping question fetch for unknown exercise id from assessment", {
									exerciseId: exId,
									itemId: item.id,
									itemType: item.type
								})
							}
						}
					})
					.catch((error) => {
						// Log the error but don't silently fail - set to empty array with warning
						logger.error("failed to fetch assessment exercises after retries", {
							itemId: item.id,
							itemType: item.type,
							path: item.path,
							error
						})
						item.exerciseIds = []
					})
				fetchPromises.push(assessmentPromise)
			} else if (item.type === "CourseChallenge" || item.type === "MasteryChallenge") {
				for (const exId of course.masterableExerciseIds) {
					if (isKnownExerciseId(exId)) {
						scheduleQuestionFetch(exId)
					} else {
						logger.warn("skipping question fetch for unknown masterable exercise id", {
							exerciseId: exId,
							courseId: course.id
						})
					}
				}
			} else if (item.type === "Video") {
				if (noVideosOrArticlesFlag) {
					logger.info("skipping video hydration", { videoId: item.id, videoSlug: item.slug })
				} else {
					fetchPromises.push(
						retryOperation(() => fetchVideoDetails(apiClient, item), `fetchVideo:${item.id}`).then((details) => {
							Object.assign(item, details)
						})
					)
				}
			} else if (item.type === "Article") {
				if (noVideosOrArticlesFlag) {
					logger.info("skipping article hydration", { articleId: item.id, articleSlug: item.slug })
				} else {
					fetchPromises.push(
						retryOperation(() => fetchArticleOrVideoDetails(apiClient, item), `fetchArticle:${item.id}`).then(
							(result) => {
								if (result.type === "Article") Object.assign(item, result.data)
								if (result.type === "Video") Object.assign(item, result.data, { type: "Video" })
							}
						)
					)
				}
			}
			if ("children" in item && item.children && Array.isArray(item.children)) {
				for (const child of item.children) {
					scheduleHydration(child, newAncestors, course)
				}
			}
		}
	}

	// Helper: prune videos and invalid articles so seed.ts can ingest cleanly
	function pruneNonExerciseContent(course: CourseInfo): {
		removedVideos: number
		removedArticles: number
	} {
		let removedVideos = 0
		let removedArticles = 0

		for (const unit of course.children) {
			if (unit.type !== "Unit") continue
			for (const lesson of unit.children) {
				if (lesson.type !== "Lesson") continue
				const before = lesson.children.length
				lesson.children = lesson.children.filter((child) => {
					if (child.type === "Video") {
						removedVideos++
						return false
					}
					if (child.type === "Article") {
						removedArticles++
						return false
					}
					return true
				})
				const after = lesson.children.length
				if (before !== after) {
					logger.debug("pruned lesson children", {
						lessonId: lesson.id,
						removed: before - after,
						remaining: after
					})
				}
			}
		}

		return { removedVideos, removedArticles }
	}

	// MODIFIED: Logic is now split based on whether arguments are provided.
	if (pathFilters.length === 0) {
		// --- NEW SEQUENTIAL LOGIC (NO ARGUMENTS) ---
		// This block processes each course one by one to avoid massive concurrent load.
		// Hydration *within* each course remains concurrent.
		const pathsToProcess = allPaths
		logger.info("no arguments provided, processing all courses sequentially", {
			courseCount: pathsToProcess.length
		})

		let processedCount = 0
		let skippedCount = 0

		// Process each discovered course path one at a time.
		for (const [index, topicPath] of pathsToProcess.entries()) {
			// Check if course should be skipped due to known issues
			if (shouldSkipCourse(topicPath)) {
				skippedCount++
				continue
			}

			// Check if course already exists
			if (courseAlreadyExists(topicPath)) {
				skippedCount++
				logger.info("skipping already downloaded course", {
					progress: `${index + 1}/${pathsToProcess.length}`,
					path: topicPath,
					skipped: skippedCount,
					processed: processedCount
				})
				continue
			}

			logger.info("sequentially processing course", {
				progress: `${index + 1}/${pathsToProcess.length}`,
				path: topicPath,
				skipped: skippedCount,
				processed: processedCount
			})

			// Caches are re-initialized for each course to ensure complete isolation,
			// mimicking separate script runs.
			const contentCaches: ContentCaches = {
				allDiscoveredExercises: new Map<string, ExerciseInfo>(),
				allDiscoveredVideos: new Map<string, VideoInfo>(),
				allDiscoveredArticles: new Map<string, ArticleInfo>()
			}
			const scheduledQuestionFetches = new Set<string>()

			// 1. DISCOVER content map for this single course with retry.
			const courseResult = await errors.try(
				retryOperation(() => apiClient.getFullContentMap(topicPath, contentCaches), `getContentMap:${topicPath}`)
			)
			if (courseResult.error) {
				// Check if this is the specific no listedPathData error
				if (errors.is(courseResult.error, ErrNoListedPathData)) {
					logger.warn("skipping path with no listedPathData (likely not a course)", {
						path: topicPath,
						error: courseResult.error
					})
					continue // Skip to the next course
				}
				// Check if this is the specific no course data error
				if (errors.is(courseResult.error, ErrNoCourseData)) {
					logger.warn("skipping path with no course data (likely a subject page)", {
						path: topicPath,
						error: courseResult.error
					})
					continue // Skip to the next course
				}
				// Re-throw any other errors
				logger.error("course fetching failed", { error: courseResult.error })
				throw courseResult.error
			}
			const courseInfo = courseResult.data

			// 2. HYDRATE this specific course's content concurrently.
			logger.info("hydrating content for course", { courseId: courseInfo.id, courseTitle: courseInfo.title })
			const fetchPromises: Promise<void>[] = []
			const scheduleHydration = createScheduleHydration(
				fetchPromises,
				scheduledQuestionFetches,
				noVideosOrArticles,
				(exerciseId) => contentCaches.allDiscoveredExercises.has(exerciseId)
			)

			scheduleHydration(courseInfo, [], courseInfo)
			const allPromisesResult = await errors.try(Promise.all(fetchPromises))
			if (allPromisesResult.error) {
				logger.error("failed to hydrate course content, skipping course", {
					courseId: courseInfo.id,
					error: allPromisesResult.error
				})
				continue // Move to the next course.
			}
			logger.info("finished hydrating course", { courseId: courseInfo.id })

			if (noVideosOrArticles) {
				const pruneStats = pruneNonExerciseContent(courseInfo)
				logger.info("pruned content for seed compatibility due to --no-videos-or-articles", {
					removedVideos: pruneStats.removedVideos,
					removedArticles: pruneStats.removedArticles
				})
			}

			// 3. SAVE this specific course's data to a file with retry.
			const slug = courseInfo.path.replace(/^\/|\/$/g, "").replace(/\//g, "-")
			const fileName = `${slug}.json`
			const outputPath = path.join(dataDir, fileName)

			logger.info("writing course data to file", { title: courseInfo.title, path: outputPath })
			const courseJsonDump = JSON.stringify(courseInfo, null, "\t")

			await retryOperation(
				() => fs.writeFile(outputPath, courseJsonDump),
				`writeFile:${fileName}`,
				10 // File operations get finite retries
			)

			processedCount++
			logger.info("successfully saved course", {
				title: courseInfo.title,
				totalProcessed: processedCount,
				totalSkipped: skippedCount
			})
		}

		logger.info("sequential processing complete", {
			totalProcessed: processedCount,
			totalSkipped: skippedCount,
			total: pathsToProcess.length
		})

		// Save progress summary
		const summaryPath = path.join(dataDir, ".download-summary.json")
		const summary = {
			timestamp: new Date().toISOString(),
			mode: "sequential",
			totalCourses: pathsToProcess.length,
			processedThisRun: processedCount,
			skippedExisting: skippedCount,
			existingFiles: existingCourses.size
		}
		const writeSummaryResult = await errors.try(fs.writeFile(summaryPath, JSON.stringify(summary, null, 2)))
		if (writeSummaryResult.error) {
			logger.error("failed to write summary file", { error: writeSummaryResult.error })
			throw errors.wrap(writeSummaryResult.error, "write summary file")
		}
		logger.info("saved download summary", { path: summaryPath })
	} else {
		// --- ORIGINAL CONCURRENT LOGIC (WITH ARGUMENTS) ---
		// This block is for when specific course paths are passed as arguments.
		// It preserves the original behavior of full concurrency.
		const pathsToProcess = pathFilters
		logger.info("building initial content map from paths", { pathCount: pathsToProcess.length })

		const contentCaches: ContentCaches = {
			allDiscoveredExercises: new Map<string, ExerciseInfo>(),
			allDiscoveredVideos: new Map<string, VideoInfo>(),
			allDiscoveredArticles: new Map<string, ArticleInfo>()
		}

		const coursesMap = new Map<string, CourseInfo>()
		let skippedCount = 0

		for (const [index, topicPath] of pathsToProcess.entries()) {
			// Check if course should be skipped due to known issues
			if (shouldSkipCourse(topicPath)) {
				skippedCount++
				continue
			}

			// Check if course already exists
			if (courseAlreadyExists(topicPath)) {
				skippedCount++
				logger.info("skipping already downloaded course", {
					progress: `${index + 1}/${pathsToProcess.length}`,
					path: topicPath
				})
				continue
			}

			logger.info("processing path", { progress: `${index + 1}/${pathsToProcess.length}`, path: topicPath })
			const courseResult = await errors.try(
				retryOperation(() => apiClient.getFullContentMap(topicPath, contentCaches), `getContentMap:${topicPath}`)
			)
			if (courseResult.error) {
				// Check if this is the specific no listedPathData error
				if (errors.is(courseResult.error, ErrNoListedPathData)) {
					logger.warn("skipping path with no listedPathData (likely not a course)", {
						path: topicPath,
						error: courseResult.error
					})
					continue // Skip to the next path
				}
				// Check if this is the specific no course data error
				if (errors.is(courseResult.error, ErrNoCourseData)) {
					logger.warn("skipping path with no course data (likely a subject page)", {
						path: topicPath,
						error: courseResult.error
					})
					continue // Skip to the next path
				}
				// Re-throw any other errors
				logger.error("course fetching failed", { error: courseResult.error })
				throw courseResult.error
			}
			const courseInfo = courseResult.data

			if (!coursesMap.has(courseInfo.id)) {
				coursesMap.set(courseInfo.id, courseInfo)
			} else {
				const existingCourse = coursesMap.get(courseInfo.id)
				if (existingCourse) {
					const existingUnitIds = new Set(existingCourse.children.filter((c) => c.type === "Unit").map((u) => u.id))
					for (const newChild of courseInfo.children) {
						if (newChild.type === "Unit" && !existingUnitIds.has(newChild.id)) {
							existingCourse.children.push(newChild)
						}
					}
				}
			}
		}
		const fullContentMap = [...coursesMap.values()]
		logger.info("finished building initial content map", {
			courseCount: fullContentMap.length,
			skippedCount: skippedCount
		})

		if (fullContentMap.length === 0) {
			logger.info("all requested courses already downloaded, nothing to do")
			return
		}

		logger.info("starting to fetch and embed all content details concurrently")
		const fetchPromises: Promise<void>[] = []
		const scheduledQuestionFetches = new Set<string>()
		const scheduleHydration = createScheduleHydration(
			fetchPromises,
			scheduledQuestionFetches,
			noVideosOrArticles,
			(exerciseId) => contentCaches.allDiscoveredExercises.has(exerciseId)
		)

		for (const course of fullContentMap) {
			scheduleHydration(course, [], course)
		}

		const allPromisesResult = await errors.try(Promise.all(fetchPromises))
		if (allPromisesResult.error) {
			logger.error("an error occurred during concurrent content fetching", {
				error: allPromisesResult.error
			})
			throw errors.wrap(allPromisesResult.error, "concurrent fetch failed")
		}

		logger.info("completed fetching and embedding all content")

		if (noVideosOrArticles) {
			for (const course of fullContentMap) {
				const pruneStats = pruneNonExerciseContent(course)
				logger.info("pruned content for seed compatibility due to --no-videos-or-articles", {
					courseId: course.id,
					removedVideos: pruneStats.removedVideos,
					removedArticles: pruneStats.removedArticles
				})
			}
		}

		logger.info("writing each course to a separate JSON file", { courseCount: fullContentMap.length })
		let savedCount = 0
		for (const course of fullContentMap) {
			const slug = course.path.replace(/^\/|\/$/g, "").replace(/\//g, "-")
			const fileName = `${slug}.json`
			const outputPath = path.join(dataDir, fileName)

			// Double-check the file doesn't exist (in case of race conditions)
			if (existingCourses.has(fileName)) {
				logger.info("skipping course that was created during execution", {
					title: course.title,
					fileName: fileName
				})
				continue
			}

			logger.info("writing course data to file", { title: course.title, path: outputPath })
			const courseJsonDump = JSON.stringify(course, null, "\t")

			await retryOperation(
				() => fs.writeFile(outputPath, courseJsonDump),
				`writeFile:${fileName}`,
				10 // File operations get finite retries
			)

			savedCount++
		}

		logger.info("concurrent processing complete", {
			totalSaved: savedCount,
			totalSkipped: skippedCount
		})

		// Save progress summary
		const summaryPath = path.join(dataDir, ".download-summary.json")
		const summary = {
			timestamp: new Date().toISOString(),
			mode: "concurrent",
			requestedPaths: pathFilters,
			coursesFound: fullContentMap.length,
			savedThisRun: savedCount,
			skippedExisting: skippedCount,
			existingFiles: existingCourses.size
		}
		const writeSummaryResult2 = await errors.try(fs.writeFile(summaryPath, JSON.stringify(summary, null, 2)))
		if (writeSummaryResult2.error) {
			logger.error("failed to write summary file", { error: writeSummaryResult2.error })
			throw errors.wrap(writeSummaryResult2.error, "write summary file")
		}
		logger.info("saved download summary", { path: summaryPath })
	}

	logger.info("completed script successfully")
}

// --- SCRIPT EXECUTION ---

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

process.exit(0)
