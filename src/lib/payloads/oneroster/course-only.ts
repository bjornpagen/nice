import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { eq, sql } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { getCourseMapping, isHardcodedCourse } from "@/lib/constants/course-mapping"

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
	.prepare("src_lib_payloads_oneroster_course_only_get_course_by_id")

const getAllSubjectsQuery = db
	.select({
		slug: schema.niceSubjects.slug,
		title: schema.niceSubjects.title
	})
	.from(schema.niceSubjects)
	.prepare("src_lib_payloads_oneroster_course_only_get_all_subjects")

/**
 * Generates a OneRoster course object for a single course.
 *
 * @param courseId The unique ID of the course from the 'courses' table.
 * @returns A promise that resolves to the OneRoster course object.
 * @throws An error if the course is not found or if a database query fails.
 */
export async function generateCourseObject(courseId: string): Promise<OneRosterCourse> {
	logger.info("starting oneroster course object generation", { courseId })

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

	// 2. Extract subject information from course path
	logger.debug("extracting subject from course path", { courseId, path: course.path })

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

	// 3. Determine grades for this course
	const courseGrades: GradeLevelNumber[] = isHardcodedCourse(course.id)
		? getCourseMapping(course.id).map(parseGradeLevelNumber)
		: []

	// 4. Build the OneRoster course object
	const onerosterCourse: OneRosterCourse = {
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
	}

	logger.info("oneroster course object generation complete", {
		courseId,
		sourcedId: onerosterCourse.sourcedId,
		subjects: onerosterCourse.subjects,
		grades: onerosterCourse.grades
	})

	return onerosterCourse
}
