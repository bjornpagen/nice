/**
 * Type-safe mapping of all hardcoded course IDs to empty string arrays.
 * This file consolidates all course IDs found across math, science, and history
 * ingest functions throughout the codebase.
 */

export const HARDCODED_COURSE_MAPPING = {
	// Math Courses
	x0267d782: ["6"], // 6th grade math (Common Core)
	x6b17ba59: ["7"], // 7th grade math (Common Core)
	x7c7044d7: ["8"], // 8th grade math (Common Core)

	// Science Courses
	x0c5bb03129646fd6: ["8"], // ms-biology
	x1baed5db7c1bb50b: ["6", "7", "8"], // ms-physics
	x87d03b443efbea0a: ["7"], // middle-school-earth-and-space-science
	x230b3ff252126bb6: ["9"], // hs-bio
	xc370bc422b7f75fc: ["6"], // ms-chemistry

	// History Courses
	x71a94f19: ["11"], // us-history
	xb87a304a: ["11"], // ap-us-history
	x66f79d8a: ["10"], // world-history
	xb41992e0ff5e0f09: ["10"], // ap-world-history
	x231f0f4241b58f49: ["12"], // us-government-and-civics
	x3e2fc37246974751: ["12"] // ap-college-us-government-and-politics
} as const

export type CourseId = keyof typeof HARDCODED_COURSE_MAPPING

/**
 * Array of all hardcoded course IDs for convenience
 */
export const ALL_HARDCODED_COURSE_IDS: CourseId[] = [
	"x0267d782", // 6th grade math (Common Core)
	"x6b17ba59", // 7th grade math (Common Core)
	"x7c7044d7", // 8th grade math (Common Core)
	"x0c5bb03129646fd6", // ms-biology
	"x1baed5db7c1bb50b", // ms-physics
	"x87d03b443efbea0a", // middle-school-earth-and-space-science
	"x230b3ff252126bb6", // hs-bio
	"xc370bc422b7f75fc", // ms-chemistry
	"x71a94f19", // us-history
	"xb87a304a", // ap-us-history
	"x66f79d8a", // world-history
	"xb41992e0ff5e0f09", // ap-world-history
	"x231f0f4241b58f49", // us-government-and-civics
	"x3e2fc37246974751" // ap-college-us-government-and-politics
]

/**
 * Type-safe helper to get the mapping for a specific course
 */
export function getCourseMapping(courseId: CourseId): readonly string[] {
	return HARDCODED_COURSE_MAPPING[courseId]
}

/**
 * Type-safe helper to check if a course ID is in our hardcoded list
 */
export function isHardcodedCourse(courseId: string): courseId is CourseId {
	return courseId in HARDCODED_COURSE_MAPPING
}

export const HARDCODED_MATH_COURSE_IDS = [
	"x0267d782", // 6th grade math (Common Core)
	"x6b17ba59", // 7th grade math (Common Core)
	"x7c7044d7" // 8th grade math (Common Core)
] as const

export const HARDCODED_SCIENCE_COURSE_IDS = [
	"x0c5bb03129646fd6", // ms-biology
	"x1baed5db7c1bb50b", // ms-physics
	"x87d03b443efbea0a", // middle-school-earth-and-space-science
	"x230b3ff252126bb6", // hs-bio
	"xc370bc422b7f75fc" // ms-chemistry
] as const

export const HARDCODED_HISTORY_COURSE_IDS = [
	"x71a94f19", // us-history
	"xb87a304a", // ap-us-history
	"x66f79d8a", // world-history
	"xb41992e0ff5e0f09", // ap-world-history
	"x231f0f4241b58f49", // us-government-and-civics
	"x3e2fc37246974751" // ap-college-us-government-and-politics
] as const
