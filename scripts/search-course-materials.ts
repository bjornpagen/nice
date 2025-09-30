#!/usr/bin/env bun
import * as p from "@clack/prompts"
import { ilike, or, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas/nice"
import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import { ALL_HARDCODED_COURSE_IDS, type CourseId } from "@/lib/constants/course-mapping"

type MaterialType = "Unit" | "Lesson" | "Video" | "Article" | "Exercise" | "Assessment"

interface Material {
	id: string
	title: string
	type: MaterialType
	courseId: string
	courseTitle: string
	path: string
}

async function getCoursesByPattern(titlePattern: string): Promise<Array<{ id: string; title: string }>> {
	const pattern = `%${titlePattern}%`
	
	const courses = await db
		.select({
			id: schema.niceCourses.id,
			title: schema.niceCourses.title
		})
		.from(schema.niceCourses)
		.where(ilike(schema.niceCourses.title, pattern))
	
	return courses.filter((c) => ALL_HARDCODED_COURSE_IDS.includes(c.id as CourseId))
}

async function getCourseById(courseId: string): Promise<{ id: string; title: string } | null> {
	if (!ALL_HARDCODED_COURSE_IDS.includes(courseId as CourseId)) {
		return null
	}

	const courses = await db
		.select({
			id: schema.niceCourses.id,
			title: schema.niceCourses.title
		})
		.from(schema.niceCourses)
		.where(eq(schema.niceCourses.id, courseId))
		.limit(1)

	return courses[0] || null
}

async function searchMaterials(
	titlePattern: string,
	courseIds: string[]
): Promise<Material[]> {
	const pattern = `%${titlePattern}%`
	const results: Material[] = []

	const coursesMap = new Map<string, string>()
	const coursesData = await db
		.select({
			id: schema.niceCourses.id,
			title: schema.niceCourses.title
		})
		.from(schema.niceCourses)
		.where(inArray(schema.niceCourses.id, courseIds))

	for (const course of coursesData) {
		coursesMap.set(course.id, course.title)
	}

	const units = await db
		.select({
			id: schema.niceUnits.id,
			title: schema.niceUnits.title,
			courseId: schema.niceUnits.courseId,
			path: schema.niceUnits.path
		})
		.from(schema.niceUnits)
		.where(
			or(
				inArray(schema.niceUnits.courseId, courseIds),
				ilike(schema.niceUnits.title, pattern)
			)
		)

	for (const unit of units) {
		if (unit.title.toLowerCase().includes(titlePattern.toLowerCase())) {
			results.push({
				id: unit.id,
				title: unit.title,
				type: "Unit",
				courseId: unit.courseId,
				courseTitle: coursesMap.get(unit.courseId) || "Unknown",
				path: unit.path
			})
		}
	}

	const lessons = await db
		.select({
			id: schema.niceLessons.id,
			title: schema.niceLessons.title,
			unitId: schema.niceLessons.unitId,
			path: schema.niceLessons.path
		})
		.from(schema.niceLessons)
		.innerJoin(schema.niceUnits, eq(schema.niceLessons.unitId, schema.niceUnits.id))
		.where(
			or(
				inArray(schema.niceUnits.courseId, courseIds),
				ilike(schema.niceLessons.title, pattern)
			)
		)

	for (const lesson of lessons) {
		if (lesson.title.toLowerCase().includes(titlePattern.toLowerCase())) {
			const unitData = await db
				.select({ courseId: schema.niceUnits.courseId })
				.from(schema.niceUnits)
				.where(eq(schema.niceUnits.id, lesson.unitId))
				.limit(1)

			const courseId = unitData[0]?.courseId || ""
			results.push({
				id: lesson.id,
				title: lesson.title,
				type: "Lesson",
				courseId: courseId,
				courseTitle: coursesMap.get(courseId) || "Unknown",
				path: lesson.path
			})
		}
	}

	const videos = await db
		.select({
			id: schema.niceVideos.id,
			title: schema.niceVideos.title,
			path: schema.niceVideos.path
		})
		.from(schema.niceVideos)
		.where(ilike(schema.niceVideos.title, pattern))

	for (const video of videos) {
		const lessonContents = await db
			.select({
				lessonId: schema.niceLessonContents.lessonId
			})
			.from(schema.niceLessonContents)
			.where(eq(schema.niceLessonContents.contentId, video.id))
			.limit(1)

		if (lessonContents.length > 0) {
			const lessonId = lessonContents[0]!.lessonId
			const lessonData = await db
				.select({
					unitId: schema.niceLessons.unitId
				})
				.from(schema.niceLessons)
				.where(eq(schema.niceLessons.id, lessonId))
				.limit(1)

			if (lessonData.length > 0) {
				const unitData = await db
					.select({ courseId: schema.niceUnits.courseId })
					.from(schema.niceUnits)
					.where(eq(schema.niceUnits.id, lessonData[0]!.unitId))
					.limit(1)

				const courseId = unitData[0]?.courseId || ""
				if (courseIds.includes(courseId)) {
					results.push({
						id: video.id,
						title: video.title,
						type: "Video",
						courseId: courseId,
						courseTitle: coursesMap.get(courseId) || "Unknown",
						path: video.path
					})
				}
			}
		}
	}

	const articles = await db
		.select({
			id: schema.niceArticles.id,
			title: schema.niceArticles.title,
			path: schema.niceArticles.path
		})
		.from(schema.niceArticles)
		.where(ilike(schema.niceArticles.title, pattern))

	for (const article of articles) {
		const lessonContents = await db
			.select({
				lessonId: schema.niceLessonContents.lessonId
			})
			.from(schema.niceLessonContents)
			.where(eq(schema.niceLessonContents.contentId, article.id))
			.limit(1)

		if (lessonContents.length > 0) {
			const lessonId = lessonContents[0]!.lessonId
			const lessonData = await db
				.select({
					unitId: schema.niceLessons.unitId
				})
				.from(schema.niceLessons)
				.where(eq(schema.niceLessons.id, lessonId))
				.limit(1)

			if (lessonData.length > 0) {
				const unitData = await db
					.select({ courseId: schema.niceUnits.courseId })
					.from(schema.niceUnits)
					.where(eq(schema.niceUnits.id, lessonData[0]!.unitId))
					.limit(1)

				const courseId = unitData[0]?.courseId || ""
				if (courseIds.includes(courseId)) {
					results.push({
						id: article.id,
						title: article.title,
						type: "Article",
						courseId: courseId,
						courseTitle: coursesMap.get(courseId) || "Unknown",
						path: article.path
					})
				}
			}
		}
	}

	const exercises = await db
		.select({
			id: schema.niceExercises.id,
			title: schema.niceExercises.title,
			path: schema.niceExercises.path
		})
		.from(schema.niceExercises)
		.where(ilike(schema.niceExercises.title, pattern))

	for (const exercise of exercises) {
		const lessonContents = await db
			.select({
				lessonId: schema.niceLessonContents.lessonId
			})
			.from(schema.niceLessonContents)
			.where(eq(schema.niceLessonContents.contentId, exercise.id))
			.limit(1)

		if (lessonContents.length > 0) {
			const lessonId = lessonContents[0]!.lessonId
			const lessonData = await db
				.select({
					unitId: schema.niceLessons.unitId
				})
				.from(schema.niceLessons)
				.where(eq(schema.niceLessons.id, lessonId))
				.limit(1)

			if (lessonData.length > 0) {
				const unitData = await db
					.select({ courseId: schema.niceUnits.courseId })
					.from(schema.niceUnits)
					.where(eq(schema.niceUnits.id, lessonData[0]!.unitId))
					.limit(1)

				const courseId = unitData[0]?.courseId || ""
				if (courseIds.includes(courseId)) {
					results.push({
						id: exercise.id,
						title: exercise.title,
						type: "Exercise",
						courseId: courseId,
						courseTitle: coursesMap.get(courseId) || "Unknown",
						path: exercise.path
					})
				}
			}
		}
	}

	const assessments = await db
		.select({
			id: schema.niceAssessments.id,
			title: schema.niceAssessments.title,
			type: schema.niceAssessments.type,
			parentId: schema.niceAssessments.parentId,
			parentType: schema.niceAssessments.parentType,
			path: schema.niceAssessments.path
		})
		.from(schema.niceAssessments)
		.where(ilike(schema.niceAssessments.title, pattern))

	for (const assessment of assessments) {
		let courseId = ""

		if (assessment.parentType === "Unit") {
			const unitData = await db
				.select({ courseId: schema.niceUnits.courseId })
				.from(schema.niceUnits)
				.where(eq(schema.niceUnits.id, assessment.parentId))
				.limit(1)

			courseId = unitData[0]?.courseId || ""
		} else if (assessment.parentType === "Course") {
			courseId = assessment.parentId
		}

		if (courseIds.includes(courseId)) {
			results.push({
				id: assessment.id,
				title: assessment.title,
				type: "Assessment",
				courseId: courseId,
				courseTitle: coursesMap.get(courseId) || "Unknown",
				path: assessment.path
			})
		}
	}

	return results
}

async function main() {
	p.intro("🔍 Course Material Search")

	const searchScope = await p.select({
		message: "how do you want to scope your search?",
		options: [
			{ value: "title" as const, label: "Search by course title" },
			{ value: "id" as const, label: "Search by course ID" },
			{ value: "all" as const, label: "Search all courses" }
		]
	}) as unknown as "title" | "id" | "all"

	if (p.isCancel(searchScope)) {
		p.cancel("operation cancelled")
		process.exit(0)
	}

	let courseIds: string[] = []

	if (searchScope === "title") {
		const courseTitle = await p.text({
			message: "enter course title to search:",
			placeholder: "e.g., biology",
			validate: (value) => {
				if (!value) {
					return "course title is required"
				}
			}
		})

		if (p.isCancel(courseTitle)) {
			p.cancel("operation cancelled")
			process.exit(0)
		}

		const courseLookupSpinner = p.spinner()
		courseLookupSpinner.start("searching for courses...")

		const coursesResult = await errors.try(getCoursesByPattern(courseTitle))
		if (coursesResult.error) {
			courseLookupSpinner.stop("course search failed")
			logger.error("course search failed", { error: coursesResult.error })
			throw errors.wrap(coursesResult.error, "course search")
		}

		const matchingCourses = coursesResult.data
		courseLookupSpinner.stop(`found ${matchingCourses.length} course(s)`)

		if (matchingCourses.length === 0) {
			p.note("no courses found matching your query in the hardcoded course list", "no results")
			process.exit(0)
		}

		const selectedCourse = await p.select({
			message: "select a course:",
			options: matchingCourses.map((c) => ({
				value: c.id,
				label: `${c.title} [${c.id}]`
			}))
		}) as unknown as string

		if (p.isCancel(selectedCourse)) {
			p.cancel("operation cancelled")
			process.exit(0)
		}

		courseIds = [selectedCourse]
	} else if (searchScope === "id") {
		const courseId = await p.text({
			message: "enter course ID:",
			placeholder: "e.g., x0c5bb03129646fd6",
			validate: (value) => {
				if (!value) {
					return "course ID is required"
				}
			}
		})

		if (p.isCancel(courseId)) {
			p.cancel("operation cancelled")
			process.exit(0)
		}

		const courseLookupSpinner = p.spinner()
		courseLookupSpinner.start("validating course ID...")

		const courseResult = await errors.try(getCourseById(courseId))
		if (courseResult.error) {
			courseLookupSpinner.stop("course lookup failed")
			logger.error("course lookup failed", { error: courseResult.error })
			throw errors.wrap(courseResult.error, "course lookup")
		}

		const course = courseResult.data
		if (!course) {
			courseLookupSpinner.stop("course not found")
			p.note(`course ID '${courseId}' not found in hardcoded course list`, "not found")
			process.exit(0)
		}

		courseLookupSpinner.stop(`found: ${course.title}`)
		courseIds = [courseId]
	} else {
		courseIds = [...ALL_HARDCODED_COURSE_IDS]
		p.note(`searching across ${courseIds.length} courses`, "scope")
	}

	const titleQuery = await p.text({
		message: "enter title to search (case-insensitive partial match):",
		placeholder: "e.g., introduction",
		validate: (value) => {
			if (!value) {
				return "search query is required"
			}
		}
	})

	if (p.isCancel(titleQuery)) {
		p.cancel("operation cancelled")
		process.exit(0)
	}

	const searchSpinner = p.spinner()
	searchSpinner.start("searching materials...")

	const searchResult = await errors.try(searchMaterials(titleQuery, courseIds))
	if (searchResult.error) {
		searchSpinner.stop("search failed")
		logger.error("material search failed", { error: searchResult.error })
		throw errors.wrap(searchResult.error, "material search")
	}

	const materials = searchResult.data
	searchSpinner.stop(`found ${materials.length} material(s)`)

	if (materials.length === 0) {
		p.note("no materials found matching your query", "no results")
		process.exit(0)
	}

	const grouped = materials.reduce((acc, material) => {
		const key = `${material.courseTitle} (${material.courseId})`
		if (!acc[key]) {
			acc[key] = []
		}
		acc[key]!.push(material)
		return acc
	}, {} as Record<string, Material[]>)

	let output = ""
	for (const [courseKey, items] of Object.entries(grouped)) {
		output += `\n📚 ${courseKey}\n`
		output += `${"=".repeat(60)}\n`
		
		for (const item of items) {
			const icon = 
				item.type === "Unit" ? "📦" :
				item.type === "Lesson" ? "📝" :
				item.type === "Video" ? "🎥" :
				item.type === "Article" ? "📄" :
				item.type === "Exercise" ? "✏️" :
				"📊"
			
			output += `${icon} [${item.type}] ${item.title}\n`
			output += `   ID: ${item.id}\n`
			output += `   Path: ${item.path}\n\n`
		}
	}

	p.note(output.trim(), "search results")

	const typeCounts = materials.reduce((acc, m) => {
		acc[m.type] = (acc[m.type] || 0) + 1
		return acc
	}, {} as Record<MaterialType, number>)

	let summary = "Summary:\n"
	for (const [type, count] of Object.entries(typeCounts)) {
		summary += `  ${type}: ${count}\n`
	}
	summary += `  Total: ${materials.length}`

	p.note(summary, "counts")

	p.outro("✅ search complete")
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}
