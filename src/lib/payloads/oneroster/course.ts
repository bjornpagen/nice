import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { env } from "@/env"

// --- ONE ROSTER TYPE DEFINITIONS ---
// These interfaces define the structure of the final JSON payload.

interface OneRosterGUIDRef {
	sourcedId: string
	type: "course" | "academicSession" | "org" | "courseComponent" | "resource" | "term" | "schoolYear"
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

export interface OneRosterPayload {
	course: OneRosterCourse
	// ADDED: class property to the payload
	class: OneRosterClass
	courseComponents: OneRosterCourseComponent[]
	resources: OneRosterResource[]
	componentResources: OneRosterCourseComponentResource[]
}

// --- CONSTANTS ---
const ORG_SOURCED_ID = "nice-academy"
const ACADEMIC_SESSION_SOURCED_ID = "nice-academy-term"

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
			sourcedId: `nice:${course.id}`,
			status: "active",
			title: course.title,
			subjects: [subjectTitle],
			courseCode: course.slug,
			org: { sourcedId: ORG_SOURCED_ID, type: "org" },
			academicSession: { sourcedId: ACADEMIC_SESSION_SOURCED_ID, type: "term" },
			metadata: {
				khanId: course.id,
				khanSlug: course.slug,
				khanTitle: course.title,
				khanDescription: course.description,
				path: course.path
			}
		},
		// ADDED: class object generation
		class: {
			sourcedId: `nice:${course.id}`,
			status: "active",
			title: course.title,
			classType: "scheduled",
			course: { sourcedId: `nice:${course.id}`, type: "course" },
			school: { sourcedId: ORG_SOURCED_ID, type: "org" },
			terms: [{ sourcedId: ACADEMIC_SESSION_SOURCED_ID, type: "term" }]
		},
		courseComponents: [],
		resources: [],
		componentResources: []
	}

	const resourceSet = new Set<string>()

	for (const unit of units.sort((a, b) => a.ordering - b.ordering)) {
		onerosterPayload.courseComponents.push({
			sourcedId: `nice:${unit.id}`,
			status: "active",
			title: unit.title,
			course: { sourcedId: `nice:${course.id}`, type: "course" },
			sortOrder: unit.ordering,
			metadata: {
				khanId: unit.id,
				khanSlug: unit.slug,
				khanTitle: unit.title,
				khanDescription: unit.description,
				path: unit.path
			}
		})

		const unitLessons = lessons.filter((l) => l.unitId === unit.id).sort((a, b) => a.ordering - b.ordering)
		for (const lesson of unitLessons) {
			onerosterPayload.courseComponents.push({
				sourcedId: `nice:${lesson.id}`,
				status: "active",
				title: lesson.title,
				course: { sourcedId: `nice:${course.id}`, type: "course" },
				parent: { sourcedId: `nice:${unit.id}`, type: "courseComponent" },
				sortOrder: lesson.ordering,
				metadata: {
					khanId: lesson.id,
					khanSlug: lesson.slug,
					khanTitle: lesson.title,
					khanDescription: lesson.description,
					path: lesson.path
				}
			})

			const lessonContentLinks = lessonContents
				.filter((lc) => lc.lessonId === lesson.id)
				.sort((a, b) => a.ordering - b.ordering)
			for (const lc of lessonContentLinks) {
				const content = contentMap.get(lc.contentId)
				if (content) {
					const contentSourcedId = `nice:${content.id}`
					if (!resourceSet.has(contentSourcedId)) {
						// Construct metadata based on content type
						let metadata: Record<string, unknown> = {
							khanId: content.id,
							khanSlug: content.slug,
							khanTitle: content.title,
							khanDescription: content.description,
							path: content.path
						}

						if (lc.contentType === "Article") {
							// Articles should be QTI Stimulus
							metadata = {
								...metadata,
								type: "qti",
								subType: "qti-stimulus",
								version: "3.0",
								language: "en-US",
								url: `${env.TIMEBACK_QTI_SERVER_URL}/stimuli/nice:${content.id}`
							}
						} else if (lc.contentType === "Video") {
							// Videos need proper URL
							const videoData = videos.find((v) => v.id === content.id)
							metadata = {
								...metadata,
								type: "video",
								format: "youtube",
								url: `https://www.youtube.com/watch?v=${videoData?.youtubeId}`
							}
						} else if (lc.contentType === "Exercise") {
							// Exercises might need QTI test URLs
							metadata = {
								...metadata,
								type: "qti",
								subType: "qti-test",
								version: "3.0",
								questionType: "custom",
								language: "en-US",
								url: `${env.TIMEBACK_QTI_SERVER_URL}/assessment-tests/nice:${content.id}`
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
					}

					onerosterPayload.componentResources.push({
						sourcedId: `nice:${lesson.id}:${content.id}`,
						status: "active",
						title: content.title,
						courseComponent: { sourcedId: `nice:${lesson.id}`, type: "courseComponent" },
						resource: { sourcedId: contentSourcedId, type: "resource" },
						sortOrder: lc.ordering
					})
				}
			}
		}

		const unitAssessments = assessments.filter((a) => a.parentId === unit.id).sort((a, b) => a.ordering - b.ordering)
		for (const assessment of unitAssessments) {
			const assessmentSourcedId = `nice:${assessment.id}`
			if (!resourceSet.has(assessmentSourcedId)) {
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
						type: "qti",
						subType: "qti-test",
						version: "3.0",
						questionType: "custom",
						language: "en-US",
						url: `${env.TIMEBACK_QTI_SERVER_URL}/assessment-tests/nice:${assessment.id}`,
						// Khan-specific data
						khanId: assessment.id,
						khanSlug: assessment.slug,
						khanTitle: assessment.title,
						khanDescription: assessment.description,
						path: assessment.path,
						khanLessonType: assessment.type.toLowerCase()
					}
				})
				resourceSet.add(assessmentSourcedId)
			}

			onerosterPayload.componentResources.push({
				sourcedId: `nice:${unit.id}:${assessment.id}`,
				status: "active",
				title: assessment.title,
				courseComponent: { sourcedId: `nice:${unit.id}`, type: "courseComponent" },
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
			sourcedId: `nice:${course.id}`,
			status: "active",
			title: DUMMY_COMPONENT_TITLE,
			course: { sourcedId: `nice:${course.id}`, type: "course" },
			sortOrder: maxUnitOrder + 1, // Place it after all units
			metadata: {
				khanId: `${course.id}-challenges`,
				khanSlug: "course-challenge",
				khanTitle: DUMMY_COMPONENT_TITLE,
				khanDescription: "A collection of course-level challenges.",
				path: `${course.path}/challenge` // A conceptual path
			}
		})

		// Now, create resources and link them to this dummy component
		for (const assessment of courseAssessments.sort((a, b) => a.ordering - b.ordering)) {
			const assessmentSourcedId = `nice:${assessment.id}`
			if (!resourceSet.has(assessmentSourcedId)) {
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
						type: "qti",
						subType: "qti-test",
						version: "3.0",
						questionType: "custom",
						language: "en-US",
						url: `${env.TIMEBACK_QTI_SERVER_URL}/assessment-tests/nice:${assessment.id}`,
						// Khan-specific data
						khanId: assessment.id,
						khanSlug: assessment.slug,
						khanTitle: assessment.title,
						khanDescription: assessment.description,
						path: assessment.path,
						khanLessonType: assessment.type.toLowerCase()
					}
				})
				resourceSet.add(assessmentSourcedId)
			}

			onerosterPayload.componentResources.push({
				sourcedId: `nice:${course.id}:${assessment.id}`,
				status: "active",
				title: assessment.title,
				courseComponent: { sourcedId: `nice:${course.id}`, type: "courseComponent" },
				resource: { sourcedId: assessmentSourcedId, type: "resource" },
				sortOrder: assessment.ordering
			})
		}
	}

	logger.info("oneroster payload generation complete", { courseId })
	return onerosterPayload
}
