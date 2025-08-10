#!/usr/bin/env bun
import * as fs from "node:fs/promises"
import * as path from "node:path"
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

logger.setDefaultLogLevel(logger.INFO)

// --- CONFIGURATION ---

const MAX_CONCURRENCY = 10 // Increased back for faster processing within courses
const TARGET_REGION = "US-CA" // California region for Common Core content

// This cookie is required for authenticated endpoints like creating a practice task.
// It should be kept up-to-date by copying from a logged-in browser session.
const KHAN_ACADEMY_COOKIE =
	'browsing_session_id=_en_bsid_32eabce3-6cd7-4c17-82bb-d5b3c6980001; LIS=www; KAAS=jrq9yFJ1WyFbUimeVG_mMw; KAAL=$FaCVSQbgqpg-ReuvYooEpkHDXw8RifEzxCPKpJakiz4.~syu253$a2FpZF8xMTg2NTk5ODQyNDYwNjE0MDE2MTAzMjc*; KAAC=$FzYq2uBMA-XdkCV0lp9UFP9BRQOyQDlsxLSATzx3w38.~syu253$a2FpZF8xMTg2NTk5ODQyNDYwNjE0MDE2MTAzMjc*$a2FpZF8xMTg2NTk5ODQyNDYwNjE0MDE2MTAzMjc\u00210\u00210$~4; browsing_session_expiry="Thu, 03 Jul 2025 17:35:27 UTC"'

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
				throw errors.new(`${context}: operation failed without error details`)
			}
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
	const pathFilters = args.filter((arg) => arg !== "--dry-run")

	logger.info("starting khan academy content data dumper script", {
		dryRun: isDryRun,
		filters: pathFilters.length > 0 ? pathFilters : "none"
	})

	// Step 1: Define output paths. The exercise output directory is no longer needed.
	const dataDir = path.join(process.cwd(), "data")

	// Step 2: Ensure data directory exists.
	await errors.try(fs.mkdir(dataDir, { recursive: true }))

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
	function createScheduleHydration(fetchPromises: Promise<void>[], scheduledQuestionFetches: Set<string>) {
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
							scheduleQuestionFetch(exId)
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
					scheduleQuestionFetch(exId)
				}
			} else if (item.type === "Video") {
				fetchPromises.push(
					retryOperation(() => fetchVideoDetails(apiClient, item), `fetchVideo:${item.id}`).then((details) => {
						Object.assign(item, details)
					})
				)
			} else if (item.type === "Article") {
				fetchPromises.push(
					retryOperation(() => fetchArticleOrVideoDetails(apiClient, item), `fetchArticle:${item.id}`).then(
						(result) => {
							if (result.type === "Article") Object.assign(item, result.data)
							if (result.type === "Video") Object.assign(item, result.data, { type: "Video" })
						}
					)
				)
			}
			if ("children" in item && item.children && Array.isArray(item.children)) {
				for (const child of item.children) {
					scheduleHydration(child, newAncestors, course)
				}
			}
		}
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
				throw courseResult.error
			}
			const courseInfo = courseResult.data

			// 2. HYDRATE this specific course's content concurrently.
			logger.info("hydrating content for course", { courseId: courseInfo.id, courseTitle: courseInfo.title })
			const fetchPromises: Promise<void>[] = []
			const scheduleHydration = createScheduleHydration(fetchPromises, scheduledQuestionFetches)

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
		await errors.try(fs.writeFile(summaryPath, JSON.stringify(summary, null, 2)))
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
		const scheduleHydration = createScheduleHydration(fetchPromises, scheduledQuestionFetches)

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
		await errors.try(fs.writeFile(summaryPath, JSON.stringify(summary, null, 2)))
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
