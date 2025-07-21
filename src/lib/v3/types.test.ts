import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as types from "./types"

describe("function:getTypeFromPathname", () => {
	test("test:valid-pathnames", () => {
		const subject = "economics"
		expect(types.getTypeFromPathname(["", subject].join("/"))).toBe("subject")

		const course = "ap-microeconomics"
		expect(types.getTypeFromPathname(["", subject, course].join("/"))).toBe("course")

		const unit = "unit-1"
		expect(types.getTypeFromPathname(["", subject, course, unit].join("/"))).toBe("unit")

		const lesson = "lesson-1"
		expect(types.getTypeFromPathname(["", subject, course, unit, lesson].join("/"))).toBe("lesson")

		const article = "article-1"
		expect(types.getTypeFromPathname(["", subject, course, unit, lesson, "a", article].join("/"))).toBe("article")

		const exercise = "exercise-1"
		expect(types.getTypeFromPathname(["", subject, course, unit, lesson, "e", exercise].join("/"))).toBe("exercise")

		const video = "video-1"
		expect(types.getTypeFromPathname(["", subject, course, unit, lesson, "v", video].join("/"))).toBe("video")

		const quiz = "quiz-1"
		expect(types.getTypeFromPathname(["", subject, course, unit, "quiz", quiz].join("/"))).toBe("quiz")
		expect(types.getTypeFromPathname(["", subject, course, unit, lesson, "quiz", quiz].join("/"))).toBe("quiz")

		const unitTest = "unit-test-1"
		expect(types.getTypeFromPathname(["", subject, course, unit, "test", unitTest].join("/"))).toBe("unit_test")

		const courseChallenge = "course-challenge-1"
		expect(types.getTypeFromPathname(["", subject, course, "test", courseChallenge].join("/"))).toBe("course_challenge")
	})

	test("test:invalid-pathnames", () => {
		const empty = ""
		expect(types.getTypeFromPathname(empty)).toBeUndefined()

		const root = "/"
		expect(types.getTypeFromPathname(root)).toBeUndefined()
	})
})

describe("function:getPathnameFromType", () => {
	test("test:valid-types", () => {
		const subject = "economics"
		expect(types.getPathnameFromType("subject", subject)).toBe(["", subject].join("/"))

		const course = "ap-microeconomics"
		expect(types.getPathnameFromType("course", subject, course)).toBe(["", subject, course].join("/"))

		const unit = "unit-1"
		expect(types.getPathnameFromType("unit", subject, course, unit)).toBe(["", subject, course, unit].join("/"))

		const lesson = "lesson-1"
		expect(types.getPathnameFromType("lesson", subject, course, unit, lesson)).toBe(
			["", subject, course, unit, lesson].join("/")
		)

		const article = "article-1"
		expect(types.getPathnameFromType("article", subject, course, unit, lesson, article)).toBe(
			["", subject, course, unit, lesson, "a", article].join("/")
		)

		const exercise = "exercise-1"
		expect(types.getPathnameFromType("exercise", subject, course, unit, lesson, exercise)).toBe(
			["", subject, course, unit, lesson, "e", exercise].join("/")
		)

		const video = "video-1"
		expect(types.getPathnameFromType("video", subject, course, unit, lesson, video)).toBe(
			["", subject, course, unit, lesson, "v", video].join("/")
		)

		const quiz = "quiz-1"
		expect(types.getPathnameFromType("quiz", subject, course, unit, quiz)).toBe(
			["", subject, course, unit, "quiz", quiz].join("/")
		)
		expect(types.getPathnameFromType("quiz", subject, course, unit, lesson, quiz)).toBe(
			["", subject, course, unit, lesson, "quiz", quiz].join("/")
		)

		const unitTest = "unit-test-1"
		expect(types.getPathnameFromType("unit_test", subject, course, unit, unitTest)).toBe(
			["", subject, course, unit, "test", unitTest].join("/")
		)

		const courseChallenge = "course-challenge-1"
		expect(types.getPathnameFromType("course_challenge", subject, course, courseChallenge)).toBe(
			["", subject, course, "test", courseChallenge].join("/")
		)
	})

	test("test:invalid-types", () => {
		const subject = "economics"
		expect(() => types.getPathnameFromType("course", subject)).toThrowError()

		const course = "ap-microeconomics"
		expect(() => types.getPathnameFromType("unit", subject, course)).toThrowError()

		const unit = "unit-1"
		expect(() => types.getPathnameFromType("lesson", subject, course, unit)).toThrowError()
	})
})

describe("function:getSlugsFromPathname", () => {
	test("test:without-type", () => {
		const subject = "economics"
		expect(types.getSlugsFromPathname(["", subject].join("/"))).toEqual([subject])

		const course = "ap-microeconomics"
		expect(types.getSlugsFromPathname(["", subject, course].join("/"))).toEqual([subject, course])

		const unit = "unit-1"
		expect(types.getSlugsFromPathname(["", subject, course, unit].join("/"))).toEqual([subject, course, unit])

		const lesson = "lesson-1"
		expect(types.getSlugsFromPathname(["", subject, course, unit, lesson].join("/"))).toEqual([
			subject,
			course,
			unit,
			lesson
		])

		const article = "article-1"
		expect(types.getSlugsFromPathname(["", subject, course, unit, lesson, "a", article].join("/"))).toEqual([
			subject,
			course,
			unit,
			lesson,
			article
		])

		const exercise = "exercise-1"
		expect(types.getSlugsFromPathname(["", subject, course, unit, lesson, "e", exercise].join("/"))).toEqual([
			subject,
			course,
			unit,
			lesson,
			exercise
		])

		const video = "video-1"
		expect(types.getSlugsFromPathname(["", subject, course, unit, lesson, "v", video].join("/"))).toEqual([
			subject,
			course,
			unit,
			lesson,
			video
		])

		const quiz = "quiz-1"
		expect(types.getSlugsFromPathname(["", subject, course, unit, "quiz", quiz].join("/"))).toEqual([
			subject,
			course,
			unit,
			quiz
		])
		expect(types.getSlugsFromPathname(["", subject, course, unit, lesson, "quiz", quiz].join("/"))).toEqual([
			subject,
			course,
			unit,
			lesson,
			quiz
		])

		const unitTest = "unit-test-1"
		expect(types.getSlugsFromPathname(["", subject, course, unit, "test", unitTest].join("/"))).toEqual([
			subject,
			course,
			unit,
			unitTest
		])

		const courseChallenge = "course-challenge-1"
		expect(types.getSlugsFromPathname(["", subject, course, "test", courseChallenge].join("/"))).toEqual([
			subject,
			course,
			courseChallenge
		])
	})

	test("test:with-type", () => {
		const subject = "economics"
		expect(types.getSlugsFromPathname(["", subject].join("/"), "subject")).toEqual([subject])

		const course = "ap-microeconomics"
		expect(types.getSlugsFromPathname(["", subject, course].join("/"), "course")).toEqual([subject, course])

		const unit = "unit-1"
		expect(types.getSlugsFromPathname(["", subject, course, unit].join("/"), "unit")).toEqual([subject, course, unit])

		const lesson = "lesson-1"
		expect(types.getSlugsFromPathname(["", subject, course, unit, lesson].join("/"), "lesson")).toEqual([
			subject,
			course,
			unit,
			lesson
		])

		const article = "article-1"
		expect(types.getSlugsFromPathname(["", subject, course, unit, lesson, "a", article].join("/"), "article")).toEqual([
			subject,
			course,
			unit,
			lesson,
			article
		])

		const exercise = "exercise-1"
		expect(
			types.getSlugsFromPathname(["", subject, course, unit, lesson, "e", exercise].join("/"), "exercise")
		).toEqual([subject, course, unit, lesson, exercise])

		const video = "video-1"
		expect(types.getSlugsFromPathname(["", subject, course, unit, lesson, "v", video].join("/"), "video")).toEqual([
			subject,
			course,
			unit,
			lesson,
			video
		])

		const quiz = "quiz-1"
		expect(types.getSlugsFromPathname(["", subject, course, unit, "quiz", quiz].join("/"), "quiz")).toEqual([
			subject,
			course,
			unit,
			quiz
		])
		expect(types.getSlugsFromPathname(["", subject, course, unit, lesson, "quiz", quiz].join("/"), "quiz")).toEqual([
			subject,
			course,
			unit,
			lesson,
			quiz
		])

		const unitTest = "unit-test-1"
		expect(types.getSlugsFromPathname(["", subject, course, unit, "test", unitTest].join("/"), "unit_test")).toEqual([
			subject,
			course,
			unit,
			unitTest
		])

		const courseChallenge = "course-challenge-1"
		expect(
			types.getSlugsFromPathname(["", subject, course, "test", courseChallenge].join("/"), "course_challenge")
		).toEqual([subject, course, courseChallenge])
	})
})

describe("function:parseOneRosterResource", () => {
	test("test:valid-resource", () => {
		const resource = {
			sourcedId: "nice:x75fea13d9da53d2a",
			status: "active" as const,
			title: "Scarcity",
			vendorResourceId: "nice-academy-x75fea13d9da53d2a",
			vendorId: "superbuilders",
			applicationId: "nice",
			importance: "primary" as const,
			metadata: {
				khanId: "x75fea13d9da53d2a",
				khanSlug: "scarcity-article",
				khanTitle: "Scarcity",
				path: "/economics-finance-domain/ap-microeconomics/basic-economic-concepts/ap-economics-introduction/a/scarcity-article",
				type: "qti",
				subType: "qti-stimulus",
				version: "3.0",
				language: "en-US",
				url: "https://qti-staging.alpha-1edtech.com/api/stimuli/nice:x75fea13d9da53d2a"
			}
		}

		const result = errors.trySync(() => types.parseOneRosterResource(resource))
		expect(result.error).toBeUndefined()
		expect(result.data).not.toBeUndefined()
		expect(result.data).toMatchObject({
			sourcedId: "nice:x75fea13d9da53d2a",
			type: "article",
			meta: {
				url: "https://qti-staging.alpha-1edtech.com/api/stimuli/nice:x75fea13d9da53d2a"
			},
			slug: "scarcity-article",
			title: "Scarcity",
			order: 0,
			description: ""
		})
	})
})

describe("function:parseOneRosterCourseComponent", () => {
	test("test:valid-course-component", () => {
		const component = {
			sourcedId: "nice:x9ce7fd28aff7b767",
			status: "active" as const,
			title: "Scarcity",
			course: {
				sourcedId: "nice:x2832fbb7463fe65a",
				type: "course" as const
			},
			parent: {
				sourcedId: "nice:xa204bd566d459933",
				type: "courseComponent" as const
			},
			sortOrder: 0,
			metadata: {
				khanId: "x9ce7fd28aff7b767",
				khanSlug: "ap-economics-introduction",
				khanTitle: "Scarcity",
				khanDescription: "",
				path: "/economics-finance-domain/ap-microeconomics/basic-economic-concepts/ap-economics-introduction"
			}
		}

		const result = errors.trySync(() => types.parseOneRosterCourseComponent(component))
		expect(result.error).toBeUndefined()
		expect(result.data).not.toBeUndefined()
		expect(result.data).toMatchObject({
			sourcedId: "nice:x9ce7fd28aff7b767",
			type: "lesson",
			slug: "ap-economics-introduction",
			title: "Scarcity",
			order: 0,
			description: "",
			resources: {}
		})
	})
})

describe("function:parseOneRosterCourse", () => {
	test("test:valid-course", () => {
		const course = {
			sourcedId: "nice:x2832fbb7463fe65a",
			status: "active" as const,
			title: "AP®︎/College Microeconomics",
			subjects: ["Economics"],
			courseCode: "ap-microeconomics",
			org: {
				sourcedId: "nice-academy",
				type: "org"
			},
			academicSession: {
				sourcedId: "nice-academy-term",
				type: "term"
			},
			metadata: {
				khanId: "x2832fbb7463fe65a",
				khanSlug: "ap-microeconomics",
				khanTitle: "AP®︎/College Microeconomics",
				khanDescription:
					"Microeconomics is all about how individual actors make decisions. Learn how supply and demand determine prices, how companies think about competition, and more! We hit the traditional topics from a college-level microeconomics course.",
				path: "/economics-finance-domain/ap-microeconomics"
			}
		}

		const result = errors.trySync(() => types.parseOneRosterCourse(course))
		expect(result.error).toBeUndefined()
		expect(result.data).not.toBeUndefined()
		expect(result.data).toMatchObject({
			sourcedId: "nice:x2832fbb7463fe65a",
			type: "course",
			meta: {},
			slug: "ap-microeconomics",
			title: "AP®︎/College Microeconomics",
			order: 0,
			description:
				"Microeconomics is all about how individual actors make decisions. Learn how supply and demand determine prices, how companies think about competition, and more! We hit the traditional topics from a college-level microeconomics course.",
			resources: {}
		})
	})
})
