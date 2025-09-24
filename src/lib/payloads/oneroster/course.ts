import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray, sql } from "drizzle-orm"
import he from "he"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { env } from "@/env"
import { qti } from "@/lib/clients"
import { getAverageReadingWpmForCourse, getCourseMapping, isHardcodedCourse } from "@/lib/constants/course-mapping"
import { formatResourceTitleForDisplay } from "@/lib/utils/format-resource-title"
import { extractQtiStimulusBodyContent } from "@/lib/xml-utils"

function normalizeKhanSlug(slug: string): string {
	const colonIndex = slug.indexOf(":")
	if (colonIndex >= 0) {
		return slug.slice(colonIndex + 1)
	}
	return slug
}

// --- ONE ROSTER TYPE DEFINITIONS ---
// These interfaces define the structure of the final JSON payload.

// Valid grade levels are integers in the range 0..12
type GradeLevelNumber = number

function isValidGradeLevelNumber(value: number): boolean {
	return Number.isInteger(value) && value >= 0 && value <= 12
}

// Helper to parse and validate grade levels from strings to integers
function parseGradeLevelNumber(grade: string): GradeLevelNumber {
	const parsed = Number(grade)
	if (isValidGradeLevelNumber(parsed)) {
		return parsed
	}
	logger.error("invalid grade level provided", { grade })
	throw errors.new(`invalid grade level: ${grade}`)
}

// Helper function to add "Nice Academy - " prefix to course titles for OneRoster
function addNiceAcademyPrefix(title: string): string {
	const prefix = "Nice Academy - "
	if (!title.startsWith(prefix)) {
		return `${prefix}${title}`
	}
	return title
}

// Helper function to map our internal subject titles to OneRoster-compatible values
function mapToOneRosterSubjects(internalSubjectTitle: string): string[] {
	const subjectMapping: Record<string, string[]> = {
		"English Language Arts": ["Reading", "Vocabulary"],
		Math: ["Math"],
		Science: ["Science"],
		"Arts and Humanities": ["Social Studies"],
		Economics: ["Social Studies"],
		Computing: ["Science"], // Computing could map to Science as closest match
		"Test Prep": ["Reading", "Math"], // Test prep often covers both
		"College, Careers, and More": ["Social Studies"]
	}

	const mapped = subjectMapping[internalSubjectTitle]
	if (!mapped) {
		logger.warn("unmapped subject title, defaulting to Reading", {
			internalSubjectTitle,
			availableMappings: Object.keys(subjectMapping)
		})
		return ["Reading"] // Safe fallback
	}

	return mapped
}

interface OneRosterGUIDRef {
	sourcedId: string
	type: "course" | "academicSession" | "org" | "courseComponent" | "resource" | "term" | "district"
}

interface OneRosterCourse {
	sourcedId: string
	status: "active"
	title: string
	subjects: string[]
	grades: GradeLevelNumber[]
	courseCode?: string
	org: OneRosterGUIDRef
	academicSession: OneRosterGUIDRef
	metadata?: Record<string, unknown>
}

interface OneRosterCourseComponent {
	sourcedId: string
	status: "active"
	title: string
	course: OneRosterGUIDRef
	parent?: OneRosterGUIDRef
	sortOrder: number
	metadata?: Record<string, unknown>
}

interface OneRosterResource {
	sourcedId: string
	status: "active"
	title: string
	vendorResourceId: string
	vendorId: string
	applicationId: string
	roles: string[]
	importance: "primary" | "secondary"
	metadata: Record<string, unknown>
}

interface OneRosterCourseComponentResource {
	sourcedId: string
	status: "active"
	title: string
	courseComponent: OneRosterGUIDRef
	resource: OneRosterGUIDRef
	sortOrder: number
}

interface OneRosterClass {
	sourcedId: string
	status: "active"
	title: string
	classType: "scheduled"
	course: OneRosterGUIDRef
	school: OneRosterGUIDRef
	terms: OneRosterGUIDRef[]
}

// ADDED: Interface for AssessmentLineItem
interface OneRosterAssessmentLineItem {
	sourcedId: string
	status: "active"
	title: string
	componentResource?: {
		sourcedId: string
	}
	course: {
		sourcedId: string
	}
	metadata?: Record<string, unknown>
}

export interface OneRosterPayload {
	course: OneRosterCourse
	// ADDED: class property to the payload
	class: OneRosterClass
	courseComponents: OneRosterCourseComponent[]
	resources: OneRosterResource[]
	componentResources: OneRosterCourseComponentResource[]
	// ADDED: A new property to hold all generated line items
	assessmentLineItems: OneRosterAssessmentLineItem[]
}

// --- CONSTANTS ---
const ORG_SOURCED_ID = "f251f08b-61de-4ffa-8ff3-3e56e1d75a60"
const ACADEMIC_SESSION_SOURCED_ID = "Academic_Year_2025-2026"

// --- DATABASE QUERIES (PREPARED STATEMENTS) ---
const getCourseByIdQuery = db
	.select({
		id: schema.niceCourses.id,
		slug: schema.niceCourses.slug,
		title: schema.niceCourses.title,
		path: schema.niceCourses.path,
		description: schema.niceCourses.description
	})
	.from(schema.niceCourses)
	.where(eq(schema.niceCourses.id, sql.placeholder("courseId")))
	.limit(1)
	.prepare("src_lib_payloads_oneroster_course_get_course_by_id")

const getAllSubjectsQuery = db
	.select({
		slug: schema.niceSubjects.slug,
		title: schema.niceSubjects.title
	})
	.from(schema.niceSubjects)
	.prepare("src_lib_payloads_oneroster_course_get_all_subjects")

/**
 * Generates a complete OneRoster JSON payload for a single course.
 *
 * @param courseId The unique ID of the course from the 'courses' table.
 * @returns A promise that resolves to the fully structured OneRosterPayload.
 * @throws An error if the course is not found or if a database query fails.
 */
export async function generateCoursePayload(courseId: string): Promise<OneRosterPayload> {
	logger.info("starting oneroster payload generation", { courseId })

	// Guard: Ensure base domain for launchUrl is configured
	if (!env.NEXT_PUBLIC_APP_DOMAIN || typeof env.NEXT_PUBLIC_APP_DOMAIN !== "string") {
		logger.error("CRITICAL: NEXT_PUBLIC_APP_DOMAIN is not configured or invalid", {
			NEXT_PUBLIC_APP_DOMAIN: env.NEXT_PUBLIC_APP_DOMAIN
		})
		throw errors.new("configuration: NEXT_PUBLIC_APP_DOMAIN is required for interactive launchUrl")
	}
	// Normalize domain (remove trailing slash) to avoid double slashes
	const appDomain = env.NEXT_PUBLIC_APP_DOMAIN.replace(/\/$/, "")

	// 1. Fetch the root course and all subjects in parallel.
	const [courseResult, subjectsResult] = await Promise.all([
		errors.try(getCourseByIdQuery.execute({ courseId })),
		errors.try(getAllSubjectsQuery.execute())
	])

	if (courseResult.error) {
		logger.error("failed to fetch course", { courseId, error: courseResult.error })
		throw errors.wrap(courseResult.error, "database query for course")
	}
	const course = courseResult.data[0]
	if (!course) {
		logger.error("course not found", { courseId })
		throw errors.new(`course not found for id: ${courseId}`)
	}

	if (subjectsResult.error) {
		logger.error("failed to fetch subjects", { error: subjectsResult.error })
		throw errors.wrap(subjectsResult.error, "database query for subjects")
	}
	const subjectsMap = new Map(subjectsResult.data.map((s) => [s.slug, s.title]))

	// 2. Fetch all descendant data for the course.
	const units = await db.query.niceUnits.findMany({ where: eq(schema.niceUnits.courseId, course.id) })
	const unitIds = units.map((u) => u.id)

	const lessons = unitIds.length
		? await db.query.niceLessons.findMany({ where: inArray(schema.niceLessons.unitId, unitIds) })
		: []
	const lessonIds = lessons.map((l) => l.id)

	const assessments = unitIds.length
		? await db.query.niceAssessments.findMany({
				where: and(inArray(schema.niceAssessments.parentId, unitIds), eq(schema.niceAssessments.parentType, "Unit"))
			})
		: []

	// ADDED: Fetch course-level assessments (Course Challenges)
	const courseAssessments = await db
		.select({
			id: schema.niceAssessments.id,
			title: schema.niceAssessments.title,
			slug: schema.niceAssessments.slug,
			path: schema.niceAssessments.path,
			ordering: schema.niceAssessments.ordering,
			description: schema.niceAssessments.description,
			type: schema.niceAssessments.type
		})
		.from(schema.niceAssessments)
		.where(and(eq(schema.niceAssessments.parentId, course.id), eq(schema.niceAssessments.parentType, "Course")))

	// --- ADDED: Fetch assessment_exercises to build hierarchy ---
	const allAssessmentIds = [...assessments.map((a) => a.id), ...courseAssessments.map((ca) => ca.id)]
	const assessmentExercises = allAssessmentIds.length
		? await db.query.niceAssessmentExercises.findMany({
				where: inArray(schema.niceAssessmentExercises.assessmentId, allAssessmentIds)
			})
		: []
	const exercisesByAssessmentId = new Map<string, string[]>()
	for (const ae of assessmentExercises) {
		if (!exercisesByAssessmentId.has(ae.assessmentId)) {
			exercisesByAssessmentId.set(ae.assessmentId, [])
		}
		exercisesByAssessmentId.get(ae.assessmentId)?.push(ae.exerciseId)
	}

	const lessonContents = lessonIds.length
		? await db.query.niceLessonContents.findMany({ where: inArray(schema.niceLessonContents.lessonId, lessonIds) })
		: []

	const contentIds = {
		Video: lessonContents.filter((lc) => lc.contentType === "Video").map((lc) => lc.contentId),
		Article: lessonContents.filter((lc) => lc.contentType === "Article").map((lc) => lc.contentId),
		Exercise: lessonContents.filter((lc) => lc.contentType === "Exercise").map((lc) => lc.contentId)
	}

	// --- NEW: Fetch CASE learning objective IDs from Common Core via join table ---
	// Build a map keyed by `${contentType}:${contentId}` -> string[] of CASE IDs
	const learningObjectivesByContentTypeId = new Map<string, string[]>()
	function addLearningObjective(
		contentType: "Video" | "Article" | "Exercise",
		contentId: string,
		caseId: string
	): void {
		if (caseId === "") {
			return
		}
		const key = `${contentType}:${contentId}`
		const existing = learningObjectivesByContentTypeId.get(key)
		if (existing) {
			if (!existing.includes(caseId)) {
				existing.push(caseId)
			}
			return
		}
		learningObjectivesByContentTypeId.set(key, [caseId])
	}

	// Helper to process a single content type array
	async function fetchCaseIdsForContentType(
		contentType: "Video" | "Article" | "Exercise",
		ids: string[]
	): Promise<void> {
		if (ids.length === 0) {
			return
		}
		const result = await errors.try(
			db
				.select({
					contentId: schema.niceLessonContentsCommonCoreStandards.contentId,
					caseId: schema.niceCommonCoreStandards.caseId
				})
				.from(schema.niceLessonContentsCommonCoreStandards)
				.innerJoin(
					schema.niceCommonCoreStandards,
					eq(schema.niceLessonContentsCommonCoreStandards.commonCoreStandardId, schema.niceCommonCoreStandards.id)
				)
				.where(
					and(
						inArray(schema.niceLessonContentsCommonCoreStandards.contentId, ids),
						eq(schema.niceLessonContentsCommonCoreStandards.contentType, contentType)
					)
				)
		)
		if (result.error) {
			logger.error("failed to fetch case ids for content", { contentType, count: ids.length, error: result.error })
			throw errors.wrap(result.error, "database query for case ids")
		}
		for (const row of result.data) {
			addLearningObjective(contentType, row.contentId, row.caseId)
		}
	}

	// Fetch for each type sequentially (data dependent on type); each call handles empty lists
	await fetchCaseIdsForContentType("Video", contentIds.Video)
	await fetchCaseIdsForContentType("Article", contentIds.Article)
	await fetchCaseIdsForContentType("Exercise", contentIds.Exercise)

	const [videos, articles, exercises] = await Promise.all([
		contentIds.Video.length
			? db.query.niceVideos.findMany({ where: inArray(schema.niceVideos.id, contentIds.Video) })
			: Promise.resolve([]),
		contentIds.Article.length
			? db.query.niceArticles.findMany({ where: inArray(schema.niceArticles.id, contentIds.Article) })
			: Promise.resolve([]),
		contentIds.Exercise.length
			? db.query.niceExercises.findMany({ where: inArray(schema.niceExercises.id, contentIds.Exercise) })
			: Promise.resolve([])
	])

	const contentMap = new Map<
		string,
		{ id: string; path: string; title: string; slug: string; type: string; description?: string }
	>([
		...videos.map((v) => [v.id, { ...v, type: "Video" }] as const),
		...articles.map((a) => [a.id, { ...a, type: "Article" }] as const),
		...exercises.map((e) => [e.id, { ...e, type: "Exercise" }] as const)
	])

	// Create a mapping from exercise ID to lesson ID
	const exerciseToLessonMap = new Map<string, string>()
	for (const lc of lessonContents) {
		if (lc.contentType === "Exercise") {
			exerciseToLessonMap.set(lc.contentId, lc.lessonId)
		}
	}

	// Build helper sets to ensure every exercise gets an ALI exactly once
	const allQuizAssessments = [
		...assessments.filter((a) => a.type === "Quiz"),
		...courseAssessments.filter((a) => a.type === "Quiz")
	]
	const quizAssessmentIds = new Set(allQuizAssessments.map((a) => a.id))
	const exerciseIdsAttachedToQuizzes = new Set<string>()
	for (const [assessmentId, exerciseIds] of exercisesByAssessmentId.entries()) {
		if (quizAssessmentIds.has(assessmentId)) {
			for (const exerciseId of exerciseIds) {
				exerciseIdsAttachedToQuizzes.add(exerciseId)
			}
		}
	}

	// 3. Transform the data into the OneRoster structure.
	logger.debug("transforming database entities to oneroster objects", { courseId })

	const pathParts = course.path.split("/")
	if (pathParts.length < 2 || !pathParts[1]) {
		logger.error("CRITICAL: Invalid course path structure", {
			courseId,
			path: course.path,
			pathParts
		})
		throw errors.new("course path: invalid structure - missing subject slug")
	}
	const subjectSlug = pathParts[1]

	const subjectTitle = subjectsMap.get(subjectSlug)
	if (!subjectTitle) {
		logger.error("CRITICAL: Subject not found for slug", {
			courseId,
			subjectSlug,
			availableSubjects: Array.from(subjectsMap.keys())
		})
		throw errors.new("subject mapping: subject title not found for slug")
	}

	// Determine grades for this course
	const courseGrades: GradeLevelNumber[] = isHardcodedCourse(course.id)
		? getCourseMapping(course.id).map(parseGradeLevelNumber)
		: []

	const onerosterPayload: OneRosterPayload = {
		course: {
			sourcedId: `nice_${course.id}`,
			status: "active",
			title: addNiceAcademyPrefix(course.title),
			subjects: mapToOneRosterSubjects(subjectTitle),
			grades: courseGrades,
			courseCode: course.slug,
			org: { sourcedId: ORG_SOURCED_ID, type: "district" },
			academicSession: { sourcedId: ACADEMIC_SESSION_SOURCED_ID, type: "term" },
			metadata: {
				timebackVisible: "true",
				primaryApp: "nice_academy",
				khanId: course.id,
				khanSlug: course.slug,
				khanSubjectSlug: subjectSlug,
				khanTitle: course.title,
				khanDescription: course.description,
				AlphaLearn: {
					publishStatus: "active"
				}
			}
		},
		// ADDED: class object generation
		class: {
			sourcedId: `nice_${course.id}`,
			status: "active",
			title: addNiceAcademyPrefix(course.title),
			classType: "scheduled",
			course: { sourcedId: `nice_${course.id}`, type: "course" },
			school: { sourcedId: ORG_SOURCED_ID, type: "org" },
			terms: [{ sourcedId: ACADEMIC_SESSION_SOURCED_ID, type: "term" }]
		},
		courseComponents: [],
		resources: [],
		componentResources: [],
		assessmentLineItems: []
	}

	const resourceSet = new Set<string>()

	// HARDCODED XP VALUES
	const EXERCISE_XP = 2
	const QUIZ_XP = 4
	const UNIT_TEST_XP = 6
	const COURSE_CHALLENGE_XP = 15

	// Reading speed assumption for articles:
	// If course is hardcoded with known grades, use average WPM from grade mapping; else fallback to 200
	const computedCourseWpm = isHardcodedCourse(course.id) ? getAverageReadingWpmForCourse(course.id) : null
	const READING_WORDS_PER_MINUTE = computedCourseWpm ?? 200

	function extractReadableTextFromStimulusBody(stimulusBodyHtml: string): string {
		let cleaned = stimulusBodyHtml.replace(/<figure[\s\S]*?<\/figure>/gi, " ")
		cleaned = cleaned.replace(/<figcaption[\s\S]*?<\/figcaption>/gi, " ")
		cleaned = cleaned.replace(/<details[\s\S]*?<\/details>/gi, (match) => {
			const summaryMatch = match.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)
			const summaryText = summaryMatch ? (summaryMatch[1] ?? "") : ""
			const summaryLower = summaryText.toLowerCase()
			const isAttributionLike =
				summaryLower.includes("attribution") ||
				summaryLower.includes("references") ||
				summaryLower.includes("works cited") ||
				summaryLower.includes("credit") ||
				summaryLower.includes("credits")
			return isAttributionLike ? " " : match
		})
		cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, " ")
		cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, " ")
		cleaned = cleaned.replace(/<math[\s\S]*?<\/math>/gi, " ")
		cleaned = cleaned.replace(/<[^>]+>/g, " ")
		const decoded = he.decode(cleaned)
		return decoded.replace(/\s+/g, " ").trim()
	}

	async function computeArticleXpFromStimulus(articleId: string): Promise<number> {
		const identifier = `nice_${articleId}`
		const stimulusResult = await errors.try(qti.getStimulus(identifier))
		if (stimulusResult.error) {
			logger.error("qti stimulus fetch failed", { articleId, identifier, error: stimulusResult.error })
			throw errors.wrap(stimulusResult.error, "qti stimulus fetch")
		}
		const rawXml = stimulusResult.data.rawXml
		if (!rawXml || rawXml === "") {
			logger.error("qti stimulus xml empty", { articleId, identifier })
			throw errors.new("qti stimulus: empty xml")
		}
		const body = extractQtiStimulusBodyContent(rawXml)
		if (!body || body === "") {
			logger.error("qti stimulus body missing", { articleId, identifier })
			throw errors.new("qti stimulus body: missing")
		}
		const readable = extractReadableTextFromStimulusBody(body)
		if (readable === "") {
			logger.error("qti stimulus body contains no readable text", { articleId, identifier })
			throw errors.new("qti stimulus body: no readable text")
		}
		const wordCount = readable.split(/\s+/).filter(Boolean).length
		if (!Number.isFinite(wordCount) || wordCount <= 0) {
			logger.error("qti stimulus word count invalid", { articleId, identifier, wordCount })
			throw errors.new("qti stimulus: invalid word count")
		}
		const minutes = Math.ceil(wordCount / READING_WORDS_PER_MINUTE)
		return Math.max(1, minutes)
	}

	// --- NEW: Hierarchical Line Item Generation ---

	// Find the top-level course challenge
	const courseChallenge = courseAssessments.find((ca) => ca.type === "CourseChallenge")

	if (courseChallenge) {
		onerosterPayload.assessmentLineItems.push({
			sourcedId: `nice_${courseChallenge.id}_ali`,
			status: "active",
			title: courseChallenge.title,
			componentResource: {
				sourcedId: `nice_${course.id}_${courseChallenge.id}`
			},
			course: {
				sourcedId: `nice_${course.id}`
			},
			metadata: {
				lessonType: "coursechallenge",
				courseSourcedId: `nice_${course.id}`
			}
		})
	}

	for (const unit of units.sort((a, b) => a.ordering - b.ordering)) {
		onerosterPayload.courseComponents.push({
			sourcedId: `nice_${unit.id}`,
			status: "active",
			title: unit.title,
			course: { sourcedId: `nice_${course.id}`, type: "course" },
			sortOrder: unit.ordering,
			metadata: {
				khanId: unit.id,
				khanSlug: unit.slug,
				khanTitle: unit.title,
				khanDescription: unit.description
			}
		})

		const unitTest = assessments.find((a) => a.parentId === unit.id && a.type === "UnitTest")

		if (unitTest) {
			onerosterPayload.assessmentLineItems.push({
				sourcedId: `nice_${unitTest.id}_ali`,
				status: "active",
				title: unitTest.title,
				componentResource: {
					sourcedId: `nice_${unitTest.id}_${unitTest.id}`
				},
				course: {
					sourcedId: `nice_${course.id}`
				},
				metadata: {
					lessonType: "unittest",
					courseSourcedId: `nice_${course.id}`
				}
			})
		}

		const unitQuizzes = assessments.filter((a) => a.parentId === unit.id && a.type === "Quiz")
		for (const quiz of unitQuizzes.sort((a, b) => a.ordering - b.ordering)) {
			onerosterPayload.assessmentLineItems.push({
				sourcedId: `nice_${quiz.id}_ali`,
				status: "active",
				title: quiz.title,
				componentResource: {
					sourcedId: `nice_${quiz.id}_${quiz.id}`
				},
				course: {
					sourcedId: `nice_${course.id}`
				},
				metadata: {
					lessonType: "quiz",
					courseSourcedId: `nice_${course.id}`
				}
			})

			// Find exercises for this quiz and create their line items
			const quizExerciseIds = exercisesByAssessmentId.get(quiz.id) || []
			for (const exerciseId of quizExerciseIds) {
				const exercise = exercises.find((e) => e.id === exerciseId)
				const lessonId = exerciseToLessonMap.get(exerciseId)
				if (exercise && lessonId) {
					onerosterPayload.assessmentLineItems.push({
						sourcedId: `nice_${exercise.id}_ali`,
						status: "active",
						title: exercise.title,
						componentResource: {
							sourcedId: `nice_${lessonId}_${exercise.id}`
						},
						course: {
							sourcedId: `nice_${course.id}`
						},
						metadata: {
							lessonType: "exercise",
							courseSourcedId: `nice_${course.id}`
						}
					})
				}
			}
		}

		const unitLessons = lessons.filter((l) => l.unitId === unit.id).sort((a, b) => a.ordering - b.ordering)
		for (const lesson of unitLessons) {
			onerosterPayload.courseComponents.push({
				sourcedId: `nice_${lesson.id}`,
				status: "active",
				title: lesson.title,
				course: { sourcedId: `nice_${course.id}`, type: "course" },
				parent: { sourcedId: `nice_${unit.id}`, type: "courseComponent" },
				sortOrder: lesson.ordering,
				metadata: {
					khanId: lesson.id,
					khanSlug: lesson.slug,
					khanTitle: lesson.title,
					khanDescription: lesson.description
				}
			})

			const lessonContentLinks = lessonContents
				.filter((lc) => lc.lessonId === lesson.id)
				.sort((a, b) => a.ordering - b.ordering)
			for (const lc of lessonContentLinks) {
				const content = contentMap.get(lc.contentId)
				if (content) {
					const contentSourcedId = `nice_${content.id}`
					if (!resourceSet.has(contentSourcedId)) {
						// No suffixing on Resource titles; suffixing is applied to ComponentResource titles below

						// Construct metadata based on content type
						let metadata: Record<string, unknown> = {
							khanId: content.id,
							khanSlug: content.slug,
							khanTitle: content.title,
							khanDescription: content.description,
							// Construct the base path for the launchUrl
							path: `/${subjectSlug}/${course.slug}/${unit.slug}/${lesson.slug}`
						}

						if (lc.contentType === "Article") {
							// CHANGE: Convert Articles to interactive type
							let articleXp: number | undefined
							const articleXpResult = await errors.try(computeArticleXpFromStimulus(content.id))
							if (articleXpResult.error) {
								logger.error("qti xp: failed computing article xp from stimulus", {
									articleId: content.id,
									slug: content.slug,
									error: articleXpResult.error
								})
								throw articleXpResult.error
							}
							articleXp = articleXpResult.data
							metadata = {
								...metadata,
								type: "interactive",
								toolProvider: "Nice Academy",
								khanActivityType: "Article",
								launchUrl: `${appDomain}${metadata.path}/a/${content.slug}`,
								url: `${appDomain}${metadata.path}/a/${content.slug}`,
								xp: articleXp
							}
						} else if (lc.contentType === "Video") {
							// CHANGE: Convert Videos to interactive type
							const videoData = videos.find((v) => v.id === content.id)
							if (!videoData?.youtubeId) {
								logger.error("CRITICAL: Missing youtubeId for video", { contentId: content.id, slug: content.slug })
								throw errors.new("video metadata: youtubeId is required for interactive video resource")
							}
							// XP calculation: round to nearest minute (>= 7:30 => 8xp), no fallbacks
							if (typeof videoData.duration !== "number") {
								logger.error("CRITICAL: Missing duration for video", { contentId: content.id, slug: content.slug })
								throw errors.new("video metadata: duration is required for interactive video resource")
							}
							const computedVideoXp = Math.max(1, Math.ceil(videoData.duration / 60))
							metadata = {
								...metadata,
								type: "interactive",
								toolProvider: "Nice Academy",
								khanActivityType: "Video",
								launchUrl: `${appDomain}${metadata.path}/v/${content.slug}`,
								url: `${appDomain}${metadata.path}/v/${content.slug}`,
								khanYoutubeId: videoData.youtubeId,
								xp: computedVideoXp
							}
						} else if (lc.contentType === "Exercise") {
							metadata = {
								...metadata,
								type: "interactive",
								toolProvider: "Nice Academy",
								khanActivityType: "Exercise",
								launchUrl: `${appDomain}${metadata.path}/e/${content.slug}`,
								url: `${appDomain}${metadata.path}/e/${content.slug}`,
								xp: EXERCISE_XP
							}
						}

						// Attach CASE learning objectives to metadata when present
						{
							const caseIds = learningObjectivesByContentTypeId.get(`${lc.contentType}:${content.id}`)
							if (caseIds && caseIds.length > 0) {
								metadata = {
									...metadata,
									learningObjectiveSet: [
										{
											source: "CASE",
											learningObjectiveIds: caseIds
										}
									]
								}
							}
						}

						onerosterPayload.resources.push({
							sourcedId: contentSourcedId,
							status: "active",
							title: content.title,
							vendorResourceId: `nice-academy-${content.id}`,
							vendorId: "superbuilders",
							applicationId: "nice",
							roles: ["primary"],
							importance: "primary",
							metadata
						})
						resourceSet.add(contentSourcedId)

						// --- NEW: Add flat line items for videos and articles here ---
						if (content.type === "Video" || content.type === "Article") {
							onerosterPayload.assessmentLineItems.push({
								sourcedId: `${contentSourcedId}_ali`, // The ID is resource ID + _ali
								status: "active",
								title: `Progress for: ${content.title}`,
								componentResource: {
									sourcedId: `nice_${lesson.id}_${content.id}`
								},
								course: {
									sourcedId: `nice_${course.id}`
								},
								metadata: {
									lessonType: content.type.toLowerCase(),
									courseSourcedId: `nice_${course.id}`
								}
							})
						}

						// --- NEW: Ensure exercises always have an ALI, even when not attached to a quiz ---
						if (content.type === "Exercise" && !exerciseIdsAttachedToQuizzes.has(content.id)) {
							onerosterPayload.assessmentLineItems.push({
								sourcedId: `${contentSourcedId}_ali`,
								status: "active",
								title: content.title,
								componentResource: {
									sourcedId: `nice_${lesson.id}_${content.id}`
								},
								course: {
									sourcedId: `nice_${course.id}`
								},
								metadata: {
									lessonType: "exercise",
									courseSourcedId: `nice_${course.id}`
								}
							})
						}
					}

					// Apply bracketed suffix to ComponentResource titles for Video/Article/Exercise only
					let componentTitle = content.title
					if (lc.contentType === "Video") {
						componentTitle = formatResourceTitleForDisplay(content.title, "Video")
					} else if (lc.contentType === "Article") {
						componentTitle = formatResourceTitleForDisplay(content.title, "Article")
					} else if (lc.contentType === "Exercise") {
						componentTitle = formatResourceTitleForDisplay(content.title, "Exercise")
					}

					onerosterPayload.componentResources.push({
						sourcedId: `nice_${lesson.id}_${content.id}`,
						status: "active",
						title: componentTitle,
						courseComponent: { sourcedId: `nice_${lesson.id}`, type: "courseComponent" },
						resource: { sourcedId: contentSourcedId, type: "resource" },
						sortOrder: lc.ordering
					})
				}
			}
		}

		const unitAssessments = assessments.filter((a) => a.parentId === unit.id).sort((a, b) => a.ordering - b.ordering)
		for (const assessment of unitAssessments) {
			const assessmentSourcedId = `nice_${assessment.id}`
			if (!resourceSet.has(assessmentSourcedId)) {
				let assessmentXp: number
				if (assessment.type === "UnitTest") {
					assessmentXp = UNIT_TEST_XP
				} else if (assessment.type === "Quiz") {
					assessmentXp = QUIZ_XP
				} else {
					// Fallback for other assessment types
					assessmentXp = 1
				}

				// Determine lesson type for metadata tagging
				let khanLessonType: "quiz" | "unittest" | "coursechallenge" | undefined
				if (assessment.type === "Quiz") {
					khanLessonType = "quiz"
				} else if (assessment.type === "UnitTest") {
					khanLessonType = "unittest"
				} else if (assessment.type === "CourseChallenge") {
					khanLessonType = "coursechallenge"
				} else {
					khanLessonType = undefined
				}

				// Compute canonical practice path including last lesson slug for this unit
				const lastLessonInUnit = unitLessons[unitLessons.length - 1]
				if (!lastLessonInUnit) {
					logger.error("assessment launch url: no lessons in unit", { unitId: unit.id, unitSlug: unit.slug })
					throw errors.new("assessment launch url: no lessons in unit")
				}
				const lastLessonSlug = lastLessonInUnit.slug
				const assessmentPathSegment = assessment.type === "Quiz" ? "quiz" : "test"
				const canonicalAssessmentPath = `${appDomain}/${subjectSlug}/${course.slug}/${unit.slug}/${lastLessonSlug}/${assessmentPathSegment}/${normalizeKhanSlug(assessment.slug)}`

				onerosterPayload.resources.push({
					sourcedId: assessmentSourcedId,
					status: "active",
					title: assessment.title,
					vendorResourceId: `nice-academy-${assessment.id}`,
					vendorId: "superbuilders",
					applicationId: "nice",
					roles: ["primary"],
					importance: "primary",
					metadata: {
						type: "interactive",
						toolProvider: "Nice Academy",
						// Launch URL points directly to canonical path including last lesson slug
						launchUrl: canonicalAssessmentPath,
						url: canonicalAssessmentPath,
						// Keep Nice-controlled hints for our app (optional)
						khanActivityType: assessment.type,
						khanLessonType,
						// Khan-specific data
						khanId: assessment.id,
						khanSlug: normalizeKhanSlug(assessment.slug),
						khanTitle: assessment.title,
						khanDescription: assessment.description,
						xp: assessmentXp
					}
				})
				resourceSet.add(assessmentSourcedId)
			}

			// Create an intermediate course component for the quiz/unit test
			onerosterPayload.courseComponents.push({
				sourcedId: `nice_${assessment.id}`,
				status: "active",
				title: assessment.title,
				course: { sourcedId: `nice_${course.id}`, type: "course" },
				parent: { sourcedId: `nice_${unit.id}`, type: "courseComponent" },
				sortOrder: assessment.ordering,
				metadata: {
					khanId: assessment.id,
					khanSlug: assessment.slug,
					khanTitle: assessment.title,
					khanDescription: assessment.description
				}
			})

			// Now link the resource to the new course component instead of directly to the unit
			onerosterPayload.componentResources.push({
				sourcedId: `nice_${assessment.id}_${assessment.id}`,
				status: "active",
				title: assessment.title,
				courseComponent: { sourcedId: `nice_${assessment.id}`, type: "courseComponent" },
				resource: { sourcedId: assessmentSourcedId, type: "resource" },
				sortOrder: 0
			})

			// Note: Unit-level assessments are Quiz or UnitTest; exercises are represented as lesson content.
		}
	}

	// ADDED: Logic to handle course-level assessments (Course Challenges)
	if (courseAssessments.length > 0) {
		const DUMMY_COMPONENT_TITLE = "Course Challenge"

		// Find the highest unit ordering to place this component last.
		const maxUnitOrder = units.reduce((max, u) => Math.max(max, u.ordering), -1)

		onerosterPayload.courseComponents.push({
			sourcedId: `nice_${course.id}`,
			status: "active",
			title: DUMMY_COMPONENT_TITLE,
			course: { sourcedId: `nice_${course.id}`, type: "course" },
			sortOrder: maxUnitOrder + 1, // Place it after all units
			metadata: {
				khanId: `${course.id}-challenges`,
				khanSlug: "course-challenge",
				khanTitle: DUMMY_COMPONENT_TITLE,
				khanDescription: "A collection of course-level challenges."
			}
		})

		// Now, create resources and link them to this dummy component
		for (const assessment of courseAssessments.sort((a, b) => a.ordering - b.ordering)) {
			const assessmentSourcedId = `nice_${assessment.id}`
			if (!resourceSet.has(assessmentSourcedId)) {
				let assessmentXp: number
				if (assessment.type === "CourseChallenge") {
					assessmentXp = COURSE_CHALLENGE_XP
				} else if (assessment.type === "Quiz") {
					assessmentXp = QUIZ_XP
				} else {
					// Fallback for other assessment types
					assessmentXp = 1
				}

				let khanLessonType: "quiz" | "unittest" | "coursechallenge" | undefined
				if (assessment.type === "Quiz") {
					khanLessonType = "quiz"
				} else if (assessment.type === "UnitTest") {
					khanLessonType = "unittest"
				} else if (assessment.type === "CourseChallenge") {
					khanLessonType = "coursechallenge"
				} else {
					khanLessonType = undefined
				}

				onerosterPayload.resources.push({
					sourcedId: assessmentSourcedId,
					status: "active",
					title: assessment.title,
					vendorResourceId: `nice-academy-${assessment.id}`,
					vendorId: "superbuilders",
					applicationId: "nice",
					roles: ["primary"],
					importance: "primary",
					metadata: {
						type: "interactive",
						toolProvider: "Nice Academy",
						launchUrl: `${appDomain}/${subjectSlug}/${course.slug}/test/${normalizeKhanSlug(assessment.slug)}`,
						url: `${appDomain}/${subjectSlug}/${course.slug}/test/${normalizeKhanSlug(assessment.slug)}`,
						// Keep Nice-controlled hints for our app (optional)
						khanActivityType: assessment.type,
						khanLessonType,
						// Khan-specific data
						khanId: assessment.id,
						khanSlug: normalizeKhanSlug(assessment.slug),
						khanTitle: assessment.title,
						khanDescription: assessment.description,
						xp: assessmentXp
					}
				})
				resourceSet.add(assessmentSourcedId)
			}

			onerosterPayload.componentResources.push({
				sourcedId: `nice_${course.id}_${assessment.id}`,
				status: "active",
				title: assessment.title,
				courseComponent: { sourcedId: `nice_${course.id}`, type: "courseComponent" },
				resource: { sourcedId: assessmentSourcedId, type: "resource" },
				sortOrder: assessment.ordering
			})
		}
	}

	// 4. Compute course metrics
	logger.info("computing course metrics", { courseId })

	function getNumber(obj: Record<string, unknown>, key: string): number | undefined {
		const value = obj[key]
		return typeof value === "number" ? value : undefined
	}

	function getString(obj: Record<string, unknown>, key: string): string | undefined {
		const value = obj[key]
		return typeof value === "string" ? value : undefined
	}

	// Match UI semantics: sum XP per component-resource placement
	let totalXp = 0
	const resourceById = new Map(onerosterPayload.resources.map((r) => [r.sourcedId, r]))
	for (const cr of onerosterPayload.componentResources) {
		const resource = resourceById.get(cr.resource.sourcedId)
		if (!resource) {
			logger.error("metrics: component resource references missing resource", {
				componentResourceId: cr.sourcedId,
				resourceId: cr.resource.sourcedId
			})
			throw errors.new("metrics: missing referenced resource")
		}
		const md = resource.metadata
		const activity = getString(md, "khanActivityType")
		const isRelevant =
			activity === "Article" ||
			activity === "Video" ||
			activity === "Exercise" ||
			activity === "Quiz" ||
			activity === "UnitTest" ||
			activity === "CourseChallenge"
		if (!isRelevant) {
			continue
		}
		const xp = getNumber(md, "xp")
		if (xp === undefined) {
			logger.error("metrics: missing xp for resource", {
				resourceId: resource.sourcedId,
				activity,
				title: resource.title
			})
			throw errors.new("metrics: xp missing on resource")
		}
		totalXp += xp
	}

	const unitTestCount = assessments.filter((a) => a.type === "UnitTest").length
	const courseChallengeCount = courseAssessments.filter((a) => a.type === "CourseChallenge").length
	const totalLessons = contentIds.Exercise.length + allQuizAssessments.length + unitTestCount + courseChallengeCount

	const courseMetadata: Record<string, unknown> = onerosterPayload.course.metadata ?? {}
	courseMetadata.metrics = { totalXp, totalLessons }
	onerosterPayload.course.metadata = courseMetadata

	logger.info("oneroster payload generation complete", { courseId })
	return onerosterPayload
}
