import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { env } from "@/env"
import { getAssessmentTest } from "@/lib/data/fetchers/qti"
import { resolveAllQuestionsForTestFromXml } from "@/lib/qti-resolution"
import { applyQtiSelectionAndOrdering } from "@/lib/qti-selection"

// Normalize slugs that may include an ID prefix like "x123:real-slug" to just "real-slug"
function normalizeKhanSlug(slug: string): string {
	const colonIndex = slug.indexOf(":")
	if (colonIndex >= 0) {
		return slug.slice(colonIndex + 1)
	}
	return slug
}

// --- ONE ROSTER TYPE DEFINITIONS ---
// These interfaces define the structure of the final JSON payload.

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

	// 2.5. Compute question counts for exercises and quizzes to derive XP
	logger.info("computing qti question counts for xp", { courseId })

	// Helper to deterministically compute the final selected question count for a test
	async function computeSelectedQuestionCountForTest(testSourcedId: string): Promise<number> {
		const testResult = await errors.try(getAssessmentTest(testSourcedId))
		if (testResult.error) {
			logger.error("qti xp: failed to fetch assessment test", { testSourcedId, error: testResult.error })
			throw errors.wrap(testResult.error, "qti assessment test")
		}

		const resolvedResult = await errors.try(resolveAllQuestionsForTestFromXml(testResult.data))
		if (resolvedResult.error) {
			logger.error("qti xp: failed to resolve questions from qti xml", {
				testSourcedId,
				error: resolvedResult.error
			})
			throw errors.wrap(resolvedResult.error, "qti resolve questions")
		}

		// Apply selection and ordering. Count is deterministic w.r.t selection limits.
		const selected = applyQtiSelectionAndOrdering(testResult.data, resolvedResult.data)
		return selected.length
	}

	// Build maps: exerciseId -> count, assessmentId (Quiz) -> count
	const exerciseCountsResult = await errors.try(
		Promise.all(
			exercises.map(async (e) => {
				const testSourcedId = `nice_${e.id}`
				const count = await computeSelectedQuestionCountForTest(testSourcedId)
				return { id: e.id, count }
			})
		)
	)
	if (exerciseCountsResult.error) {
		logger.error("qti xp: failed computing exercise question counts", { error: exerciseCountsResult.error })
		throw exerciseCountsResult.error
	}
	const exerciseQuestionCountMap = new Map<string, number>(exerciseCountsResult.data.map((r) => [r.id, r.count]))

	const allQuizAssessments = [
		...assessments.filter((a) => a.type === "Quiz"),
		...courseAssessments.filter((a) => a.type === "Quiz")
	]
	const quizCountsResult = await errors.try(
		Promise.all(
			allQuizAssessments.map(async (a) => {
				const testSourcedId = `nice_${a.id}`
				const count = await computeSelectedQuestionCountForTest(testSourcedId)
				return { id: a.id, count }
			})
		)
	)
	if (quizCountsResult.error) {
		logger.error("qti xp: failed computing quiz question counts", { error: quizCountsResult.error })
		throw quizCountsResult.error
	}
	const quizQuestionCountMap = new Map<string, number>(quizCountsResult.data.map((r) => [r.id, r.count]))

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

	const onerosterPayload: OneRosterPayload = {
		course: {
			sourcedId: `nice_${course.id}`,
			status: "active",
			title: addNiceAcademyPrefix(course.title),
			subjects: mapToOneRosterSubjects(subjectTitle),
			courseCode: course.slug,
			org: { sourcedId: ORG_SOURCED_ID, type: "district" },
			academicSession: { sourcedId: ACADEMIC_SESSION_SOURCED_ID, type: "term" },
			metadata: {
				khanId: course.id,
				khanSlug: course.slug,
				khanSubjectSlug: subjectSlug,
				khanTitle: course.title,
				khanDescription: course.description
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

	// SHOUTY CONSTANTS per XP spec: expected XP reflects minutes of focused work.
	// For unit tests and course challenges, assume 2 questions per minute.
	const QUESTIONS_PER_MINUTE = 2
	const UNIT_TEST_EXPECTED_QUESTIONS = 12
	const COURSE_CHALLENGE_EXPECTED_QUESTIONS = 30

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
					sourcedId: `nice_${unit.id}_${unitTest.id}`
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
					sourcedId: `nice_${unit.id}_${quiz.id}`
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
							metadata = {
								...metadata,
								type: "interactive",
								toolProvider: "Nice Academy",
								activityType: "Article",
								launchUrl: `${appDomain}${metadata.path}/a/${content.slug}`,
								url: `${appDomain}${metadata.path}/a/${content.slug}`,
								xp: 2
							}
						} else if (lc.contentType === "Video") {
							// CHANGE: Convert Videos to interactive type
							const videoData = videos.find((v) => v.id === content.id)
							if (!videoData?.youtubeId) {
								logger.error("CRITICAL: Missing youtubeId for video", { contentId: content.id, slug: content.slug })
								throw errors.new("video metadata: youtubeId is required for interactive video resource")
							}
							metadata = {
								...metadata,
								type: "interactive",
								toolProvider: "Nice Academy",
								activityType: "Video",
								launchUrl: `${appDomain}${metadata.path}/v/${content.slug}`,
								url: `${appDomain}${metadata.path}/v/${content.slug}`,
								khanYoutubeId: videoData.youtubeId,
								xp: videoData?.duration ? Math.ceil(videoData.duration / 60) : 0
							}
						} else if (lc.contentType === "Exercise") {
							// CHANGE: Convert Exercises to interactive type
							const exerciseQuestionCount = exerciseQuestionCountMap.get(content.id)
							if (exerciseQuestionCount === undefined) {
								logger.error("qti xp: missing question count for exercise", { exerciseId: content.id })
								throw errors.new("qti xp: exercise question count missing")
							}
							metadata = {
								...metadata,
								type: "interactive",
								toolProvider: "Nice Academy",
								activityType: "Exercise",
								launchUrl: `${appDomain}${metadata.path}/e/${content.slug}`,
								url: `${appDomain}${metadata.path}/e/${content.slug}`,
								xp: Math.ceil(exerciseQuestionCount * 0.5)
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
					}

					onerosterPayload.componentResources.push({
						sourcedId: `nice_${lesson.id}_${content.id}`,
						status: "active",
						title: content.title,
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
				const exerciseCount = exercisesByAssessmentId.get(assessment.id)?.length || 0
				let assessmentXp = exerciseCount * 1
				if (assessment.type === "UnitTest") {
					assessmentXp = Math.round(UNIT_TEST_EXPECTED_QUESTIONS / QUESTIONS_PER_MINUTE)
				} else if (assessment.type === "Quiz") {
					const quizCount = quizQuestionCountMap.get(assessment.id)
					if (quizCount === undefined) {
						logger.error("qti xp: missing question count for quiz", { assessmentId: assessment.id })
						throw errors.new("qti xp: quiz question count missing")
					}
					assessmentXp = Math.ceil(quizCount * 0.5)
				}

				// CHANGE: Convert Assessments to interactive type
				const pathSegment = assessment.type === "UnitTest" || assessment.type === "CourseChallenge" ? "test" : "quiz"
				const lastLessonInUnit = unitLessons[unitLessons.length - 1]
				if (!lastLessonInUnit) {
					logger.error("CRITICAL: No lessons found in unit for assessment launchUrl", {
						unitId: unit.id,
						assessmentId: assessment.id,
						assessmentType: assessment.type
					})
					throw errors.new("assessment launchUrl: unit has no lessons to anchor path")
				}
				const launchUrl = `${appDomain}/${subjectSlug}/${course.slug}/${unit.slug}/${lastLessonInUnit.slug}/${pathSegment}/${assessment.slug}`

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
						activityType: assessment.type,
						launchUrl: launchUrl,
						url: launchUrl,
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
				sourcedId: `nice_${unit.id}_${assessment.id}`,
				status: "active",
				title: assessment.title,
				courseComponent: { sourcedId: `nice_${unit.id}`, type: "courseComponent" },
				resource: { sourcedId: assessmentSourcedId, type: "resource" },
				sortOrder: assessment.ordering
			})
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
				const exerciseCount = exercisesByAssessmentId.get(assessment.id)?.length || 0
				let assessmentXp = exerciseCount * 1
				if (assessment.type === "CourseChallenge") {
					assessmentXp = Math.round(COURSE_CHALLENGE_EXPECTED_QUESTIONS / QUESTIONS_PER_MINUTE)
				} else if (assessment.type === "Quiz") {
					const quizCount = quizQuestionCountMap.get(assessment.id)
					if (quizCount === undefined) {
						logger.error("qti xp: missing question count for quiz", { assessmentId: assessment.id })
						throw errors.new("qti xp: quiz question count missing")
					}
					assessmentXp = Math.ceil(quizCount * 0.5)
				}

				// CHANGE: Convert Course Assessments to interactive type
				const pathSegment = assessment.type === "UnitTest" || assessment.type === "CourseChallenge" ? "test" : "quiz"
				const launchUrl = `${appDomain}/${subjectSlug}/${course.slug}/${pathSegment}/${assessment.slug}`

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
						activityType: assessment.type,
						launchUrl: launchUrl,
						url: launchUrl,
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

	logger.info("oneroster payload generation complete", { courseId })
	return onerosterPayload
}
