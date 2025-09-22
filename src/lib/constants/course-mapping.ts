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
	xf557a762645cccc5: ["11", "12"], // AP College Physics 1
	x0e2f5a2c: ["11", "12"], // AP College Physics 2
	x2613d8165d88df5e: ["10"], // High School Chemistry
	x2eef969c74e0d802: ["11", "12"], // AP College Chemistry
	x6679aa2c65c01e53: ["11"], // High School Physics
	x16acb03e699817e9: ["11", "12"], // AP College Bio

	// History Courses
	x71a94f19: ["11"], // us-history
	xb87a304a: ["11"], // ap-us-history
	x66f79d8a: ["10"], // world-history
	xb41992e0ff5e0f09: ["10"], // ap-world-history
	x231f0f4241b58f49: ["12"], // us-government-and-civics
	x3e2fc37246974751: ["12"], // ap-college-us-government-and-politics
	x2832fbb7463fe65a: ["12"], // AP®︎/College Microeconomics
	x4b5148b6d48d333a: ["12"], // AP®︎/College Macroeconomics
	xaacaf77b: ["12"], // Microeconomics
	xba99f16dd99e6fe4: ["12"], // Macroeconomics

	// Computer Science Courses
	x2d2f703b37b450a3: ["10"], //AP®︎/College Computer Science Principles

	// Reading and Vocabulary Courses
	x435b1de09a877dd7: ["8"], // 8th grade reading and vocab
	x7538838f96af3430: ["7"], //7th grade reading and vocab
	x8ddea1200317e822: ["6"], //6th grade reading and vocab
	xaf0c1b5d7010608e: ["3"], //3rd grade reading and vocab
	xb350e60168d6e96f: ["5"], //5th grade reading and vocab
	xd45453bfd2ae8614: ["9"], //9th grade reading and vocab
	xd89aabc5d5847a2b: ["10"], //10th grade reading and vocab
	xe0e52cf20ce2546d: ["4"], //4th grade reading and vocab
	xfb4fc0bf01437792: ["2"] //2nd grade reading and vocab
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
	"xf557a762645cccc5", // AP College Physics 1
	"x0e2f5a2c", // AP College Physics 2
	"x2613d8165d88df5e", // High School Chemistry
	"x2eef969c74e0d802", // AP College Chemistry
	"x6679aa2c65c01e53", // High School Physics
	"x16acb03e699817e9", // AP College Bio
	"x71a94f19", // us-history
	"xb87a304a", // ap-us-history
	"x66f79d8a", // world-history
	"xb41992e0ff5e0f09", // ap-world-history
	"x231f0f4241b58f49", // us-government-and-civics
	"x3e2fc37246974751", // ap-college-us-government-and-politics
	"x2d2f703b37b450a3", // AP®︎/College Computer Science Principles
	"x435b1de09a877dd7", // 8th grade reading and vocab
	"x7538838f96af3430", //7th grade reading and vocab
	"x8ddea1200317e822", //6th grade reading and vocab
	"xaf0c1b5d7010608e", //3rd grade reading and vocab
	"xb350e60168d6e96f", //5th grade reading and vocab
	"xd45453bfd2ae8614", //9th grade reading and vocab
	"xd89aabc5d5847a2b", //10th grade reading and vocab
	"xe0e52cf20ce2546d", //4th grade reading and vocab
	"xfb4fc0bf01437792" //2nd grade reading and vocab
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
	"xc370bc422b7f75fc", // ms-chemistry
	"xf557a762645cccc5", // AP College Physics 1
	"x0e2f5a2c", // AP College Physics 2
	"x2613d8165d88df5e", // High School Chemistry
	"x2eef969c74e0d802", // AP College Chemistry
	"x6679aa2c65c01e53", // High School Physics
	"x16acb03e699817e9" // AP College Bio
] as const

export const HARDCODED_HISTORY_COURSE_IDS = [
	// "x71a94f19", // us-history
	// "xb87a304a", // ap-us-history
	// "x66f79d8a", // world-history
	// "xb41992e0ff5e0f09", // ap-world-history
	// "x231f0f4241b58f49", // us-government-and-civics
	// "x3e2fc37246974751", // ap-college-us-government-and-politics
	// "x7a03a96a83aa80ff" // Constitution 101
	// "x2d2f703b37b450a3", //AP®︎/College Computer Science Principles

	"x435b1de09a877dd7", // 8th grade reading and vocab
	"x7538838f96af3430", //7th grade reading and vocab
	"x8ddea1200317e822", //6th grade reading and vocab
	"xaf0c1b5d7010608e", //3rd grade reading and vocab
	"xb350e60168d6e96f", //5th grade reading and vocab
	"xd45453bfd2ae8614", //9th grade reading and vocab
	"xd89aabc5d5847a2b", //10th grade reading and vocab
	"xe0e52cf20ce2546d", //4th grade reading and vocab
	"xfb4fc0bf01437792" //2nd grade reading and vocab
] as const

/**
 * Reading speed mapping (words per minute) by grade level.
 * Grades 6-12 are defined, following a pattern of +25 WPM per grade.
 */
export const GRADE_TO_WPM: Readonly<Record<string, number>> = {
	"6": 150,
	"7": 175,
	"8": 200,
	"9": 225,
	"10": 250,
	"11": 250,
	"12": 250
}

/**
 * Computes the average reading WPM for a hardcoded course based on its grade list.
 * Returns null if none of the course's grades are in GRADE_TO_WPM.
 */
export function getAverageReadingWpmForCourse(courseId: CourseId): number | null {
	const grades = HARDCODED_COURSE_MAPPING[courseId]
	const wpms = grades.map((g) => GRADE_TO_WPM[g]).filter((v): v is number => typeof v === "number")
	if (wpms.length === 0) return null
	const sum = wpms.reduce((acc, n) => acc + n, 0)
	return Math.round(sum / wpms.length)
}
