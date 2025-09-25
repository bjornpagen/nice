"use server"

import { auth, currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { revalidatePath } from "next/cache"
import { createCacheKey, invalidateCache } from "@/lib/cache"
import { oneroster } from "@/lib/clients"
import {
	getActiveEnrollmentsForUser,
	getAllCourses,
	getClass,
	getClassesForSchool
} from "@/lib/data/fetchers/oneroster"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import { CourseMetadataSchema } from "@/lib/metadata/oneroster"

// Move org id constant up so helpers below can use it safely
const ONEROSTER_ORG_ID = "f251f08b-61de-4ffa-8ff3-3e56e1d75a60"


type UpdateEnrollmentsResult = { success: true; changed: boolean; message?: string }

async function getUserAndSourceId(): Promise<{ userId: string; sourceId: string | null }> {
	const user = await currentUser()
	if (!user) {
		logger.error("user not authenticated")
		throw errors.new("user not authenticated")
	}
	if (!user.publicMetadata) {
		logger.error("CRITICAL: User public metadata missing", { userId: user.id })
		throw errors.new("user public metadata missing")
	}
	const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!metadataValidation.success) {
		logger.error("CRITICAL: Invalid user metadata", { userId: user.id, error: metadataValidation.error })
		throw errors.wrap(metadataValidation.error, "user metadata validation failed")
	}
	const metadata = metadataValidation.data
	if (!metadata.sourceId) {
		logger.info("user has no sourceId yet, cannot modify enrollments", { userId: user.id })
		// No change; caller UI can prompt to sync account first
		return { userId: user.id, sourceId: null }
	}
	return { userId: user.id, sourceId: metadata.sourceId }
}

// Build a mapping of courseId -> canonical classId for our org (active classes only)
async function buildCanonicalClassMap(): Promise<Map<string, string>> {
	const classesResult = await errors.try(getClassesForSchool(ONEROSTER_ORG_ID))
	if (classesResult.error) {
		logger.error("failed to fetch classes for canonical mapping", { error: classesResult.error })
		throw errors.wrap(classesResult.error, "canonical class mapping")
	}
	const classes = classesResult.data
	const byCourse = new Map<string, string>()
	// Choose deterministically: sort candidates by classCode, then title, then sourcedId
	const grouped = new Map<string, typeof classes>()
	for (const cls of classes) {
		const courseId = cls.course.sourcedId
		const arr = grouped.get(courseId)
		if (arr) arr.push(cls)
		else grouped.set(courseId, [cls])
	}
	for (const [courseId, group] of grouped.entries()) {
		const sorted = [...group].sort((a, b) => {
			const aCode = typeof a.classCode === "string" ? a.classCode : ""
			const bCode = typeof b.classCode === "string" ? b.classCode : ""
			const ac = aCode.localeCompare(bCode)
			if (ac !== 0) return ac
			const at = a.title.localeCompare(b.title)
			if (at !== 0) return at
			return a.sourcedId.localeCompare(b.sourcedId)
		})
		const canonical = sorted[0]
		if (!canonical) continue
		byCourse.set(courseId, canonical.sourcedId)
	}
	return byCourse
}

// Append-only: enroll user into the given courses (by courseId) without deleting anything
export async function enrollUserInCoursesByCourseId(courseIds: string[]): Promise<UpdateEnrollmentsResult> {
	const { userId, sourceId } = await getUserAndSourceId()
	if (!sourceId) {
		return { success: true, changed: false, message: "OneRoster account required to save courses" }
	}

	logger.info("append enrollments by course id", { userId, sourceId, count: courseIds.length })

	const currentEnrollmentsResult = await errors.try(getActiveEnrollmentsForUser(sourceId))
	if (currentEnrollmentsResult.error) {
		logger.error("failed to fetch current enrollments", { sourceId, error: currentEnrollmentsResult.error })
		throw errors.wrap(currentEnrollmentsResult.error, "get current enrollments")
	}
	const currentEnrollments = currentEnrollmentsResult.data

	// Map to Nice Academy courseIds via class->course (already active student Nice enrollments upstream)
	const uniqueClassIds = [...new Set(currentEnrollments.map((e) => e.class.sourcedId))]

	const currentCourseIds = new Set<string>()
	const classPromises = uniqueClassIds.map(async (classId) => {
		const clsResult = await errors.try(getClass(classId))
		if (clsResult.error) {
			logger.error("failed to fetch class details for course mapping", { classId, error: clsResult.error })
			throw errors.wrap(clsResult.error, "class fetch")
		}
		const cls = clsResult.data
		if (cls && typeof cls.course?.sourcedId === "string" && cls.course.sourcedId.startsWith("nice_")) {
			currentCourseIds.add(cls.course.sourcedId)
		}
	})
	await Promise.all(classPromises)

	const toAddCourseIds = courseIds.filter((cid) => !currentCourseIds.has(cid))
	if (toAddCourseIds.length === 0) {
		logger.info("no new enrollments to append", { userId, sourceId })
		return { success: true, changed: false }
	}

	// Resolve canonical class ids for new course ids
	const courseToClassMap = await buildCanonicalClassMap()
	const addOps: Promise<unknown>[] = []
	for (const courseId of toAddCourseIds) {
		const classId = courseToClassMap.get(courseId)
		if (!classId) {
			logger.error("canonical class not found for course", { courseId })
			throw errors.new("canonical class not found")
		}
		addOps.push(
			oneroster.createEnrollment({
				status: "active",
				role: "student",
				user: { sourcedId: sourceId, type: "user" },
				class: { sourcedId: classId, type: "class" }
			})
		)
	}

	const addResults = await Promise.allSettled(addOps)
	const addErrors = addResults.filter((r): r is PromiseRejectedResult => r.status === "rejected")
	if (addErrors.length > 0) {
		for (const err of addErrors) {
			logger.error("failed to append enrollment", { error: err.reason })
		}
		logger.error("append enrollments failed", { errorCount: addErrors.length })
		throw errors.new("append enrollments failed")
	}

	// Invalidate caches
	logger.info("invalidating enrollment caches after append", { sourceId })
	const cacheKeysToInvalidate = [
		createCacheKey(["oneroster-getEnrollmentsForUser", sourceId]),
		createCacheKey(["oneroster-getActiveEnrollmentsForUser", sourceId])
	]
	await invalidateCache(cacheKeysToInvalidate)
	revalidatePath("/profile/me/courses")
	return { success: true, changed: true }
}

// Replace-only: set user enrollments by the given courseIds, but only for Nice Academy classes
export async function setUserEnrollmentsByCourseId(selectedCourseIds: string[]): Promise<UpdateEnrollmentsResult> {
	const { userId, sourceId } = await getUserAndSourceId()
	if (!sourceId) {
		return { success: true, changed: false, message: "OneRoster account required to save courses" }
	}

	logger.info("replace enrollments by course id", { userId, sourceId, count: selectedCourseIds.length })

	// Fetch current active student enrollments (Nice-only handled through mapping)
	const currentEnrollmentsResult = await errors.try(getActiveEnrollmentsForUser(sourceId))
	if (currentEnrollmentsResult.error) {
		logger.error("failed to fetch current enrollments", { sourceId, error: currentEnrollmentsResult.error })
		throw errors.wrap(currentEnrollmentsResult.error, "get current enrollments")
	}
	const currentEnrollments = currentEnrollmentsResult.data

	// Determine Nice Academy membership via class->course mapping (already active student enrollments)
	const uniqueClassIds = [...new Set(currentEnrollments.map((e) => e.class.sourcedId))]

	// Map current nice class enrollments -> courseIds
	const enrollmentToCourseId = new Map<string, string>() // enrollmentId -> courseId
	const currentCourseIdsSet = new Set<string>()
	const mapPromises = uniqueClassIds.map(async (classId) => {
		const clsResult = await errors.try(getClass(classId))
		if (clsResult.error) {
			logger.error("failed to fetch class details for mapping", { classId, error: clsResult.error })
			throw errors.wrap(clsResult.error, "class fetch")
		}
		const cls = clsResult.data
		if (cls && typeof cls.course?.sourcedId === "string" && cls.course.sourcedId.startsWith("nice_")) {
			currentCourseIdsSet.add(cls.course.sourcedId)
			const enrollment = currentEnrollments.find((e) => e.class.sourcedId === classId)
			if (enrollment) enrollmentToCourseId.set(enrollment.sourcedId, cls.course.sourcedId)
		}
	})
	await Promise.all(mapPromises)

	const selectedSet = new Set(selectedCourseIds)

	// Determine adds and removals in terms of courseIds
	const coursesToAdd = selectedCourseIds.filter((cid) => !currentCourseIdsSet.has(cid))
	const enrollmentsToRemove = currentEnrollments.filter((e) => {
		const courseId = enrollmentToCourseId.get(e.sourcedId)
		return !!courseId && !selectedSet.has(courseId)
	})

	logger.debug("enrollment diff by course id", {
		toAdd: coursesToAdd.length,
		toRemove: enrollmentsToRemove.length
	})

	if (coursesToAdd.length === 0 && enrollmentsToRemove.length === 0) {
		logger.info("no enrollment changes needed", { userId, sourceId })
		return { success: true, changed: false }
	}

	// Resolve canonical class ids once
	const courseToClassMap = await buildCanonicalClassMap()

	// First perform all additions; if any fail, do not delete anything
	const addOps: Promise<unknown>[] = []
	for (const courseId of coursesToAdd) {
		const classId = courseToClassMap.get(courseId)
		if (!classId) {
			logger.error("canonical class not found for course", { courseId })
			throw errors.new("canonical class not found")
		}
		addOps.push(
			oneroster.createEnrollment({
				status: "active",
				role: "student",
				user: { sourcedId: sourceId, type: "user" },
				class: { sourcedId: classId, type: "class" }
			})
		)
	}
	const addResults = await Promise.allSettled(addOps)
	const addErrors = addResults.filter((r): r is PromiseRejectedResult => r.status === "rejected")
	if (addErrors.length > 0) {
		for (const err of addErrors) {
			logger.error("failed to add enrollment during replace", { error: err.reason })
		}
		logger.error("one or more enrollment additions failed", { errorCount: addErrors.length })
		throw errors.new("one or more enrollment additions failed")
	}

	// Now perform deletions
	const delOps: Promise<unknown>[] = []
	for (const enrollment of enrollmentsToRemove) {
		delOps.push(oneroster.deleteEnrollment(enrollment.sourcedId))
	}
	const delResults = await Promise.allSettled(delOps)
	const delErrors = delResults.filter((r): r is PromiseRejectedResult => r.status === "rejected")
	if (delErrors.length > 0) {
		for (const err of delErrors) {
			logger.error("failed to delete enrollment during replace", { error: err.reason })
		}
		logger.error("one or more enrollment deletions failed", { errorCount: delErrors.length })
		throw errors.new("one or more enrollment deletions failed")
	}

	// Invalidate caches
	logger.info("invalidating enrollment caches after replace", { sourceId })
	const cacheKeysToInvalidate = [
		createCacheKey(["oneroster-getEnrollmentsForUser", sourceId]),
		createCacheKey(["oneroster-getActiveEnrollmentsForUser", sourceId])
	]
	await invalidateCache(cacheKeysToInvalidate)
	revalidatePath("/profile/me/courses")

	logger.info("successfully replaced user enrollments by course id", {
		userId,
		sourceId,
		added: coursesToAdd.length,
		removed: enrollmentsToRemove.length
	})
	return { success: true, changed: true }
}

// Type definitions for OneRoster explore dropdown (no DB dependency)

export type CourseForExplore = {
	id: string // Using OneRoster sourcedId as the key
	title: string
	path: string
	slug: string
	isEnrolled: boolean // Indicates if the authenticated user is enrolled in this course
}

export type SubjectWithCoursesForExplore = {
	slug: string
	title: string
	courses: CourseForExplore[]
}

// Helper function to remove "Nice Academy -" prefix from course titles
function removeNiceAcademyPrefix(title: string): string {
	const prefix = "Nice Academy -"
	if (title.startsWith(prefix)) {
		return title.substring(prefix.length).trim()
	}
	return title
}

// Helper function to map OneRoster subjects back to UI-friendly subjects
function mapFromOneRosterSubjects(onerosterSubjects: string[]): string {
	// If we see Reading or Vocabulary, group them under "Reading & Language Arts"
	if (onerosterSubjects.includes("Reading") || onerosterSubjects.includes("Vocabulary")) {
		return "Reading & Language Arts"
	}

	// For other subjects, just use the first one
	return onerosterSubjects[0] || "Other"
}

export async function getOneRosterCoursesForExplore(): Promise<SubjectWithCoursesForExplore[]> {
	const { userId } = await auth()
	if (!userId) {
		logger.error("getOneRosterCoursesForExplore failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	logger.info("fetching explore dropdown data from oneroster api", { orgId: ONEROSTER_ORG_ID })

	// Get user metadata to check for enrolled courses
	const user = await currentUser()
	let userSourceId: string | undefined
	if (user?.publicMetadata?.sourceId && typeof user.publicMetadata.sourceId === "string") {
		userSourceId = user.publicMetadata.sourceId
	}
	const enrolledCourseIds = new Set<string>()

	// No longer needed: we map enrollments directly to course ids via class->course

	// Fetch active student enrollments for Nice courses if user has a sourceId
	if (userSourceId) {
		const enrollmentsResult = await errors.try(getActiveEnrollmentsForUser(userSourceId))
		if (enrollmentsResult.error) {
			logger.error("failed to fetch user enrollments", { userSourceId, error: enrollmentsResult.error })
			throw errors.wrap(enrollmentsResult.error, "user enrollments")
		}
		const uniqueClassIds = [...new Set(enrollmentsResult.data.map((e) => e.class.sourcedId))]
		const classResults = await Promise.all(
			uniqueClassIds.map(async (classId) => {
				const clsResult = await errors.try(getClass(classId))
				if (clsResult.error) {
					logger.error("failed to fetch class details for enrolled mapping", { classId, error: clsResult.error })
					throw errors.wrap(clsResult.error, "class fetch")
				}
				return clsResult.data
			})
		)
		for (const cls of classResults) {
			if (cls && typeof cls.course?.sourcedId === "string" && cls.course.sourcedId.startsWith("nice_")) {
				enrolledCourseIds.add(cls.course.sourcedId)
			}
		}

		logger.debug("mapped enrollments to course ids", {
			userSourceId,
			enrolledCourseCount: enrolledCourseIds.size
		})
	}

	const [classesResult, coursesResult] = await Promise.all([
		errors.try(getClassesForSchool(ONEROSTER_ORG_ID)),
		errors.try(getAllCourses())
	])

	if (classesResult.error) {
		logger.error("failed to fetch classes from oneroster", { error: classesResult.error })
		throw errors.wrap(classesResult.error, "oneroster class fetch")
	}
	if (coursesResult.error) {
		logger.error("failed to fetch courses from oneroster", { error: coursesResult.error })
		throw errors.wrap(coursesResult.error, "oneroster course fetch")
	}

	const allClasses = classesResult.data.filter((c) => c.status === "active")
	const allCourses = coursesResult.data
	const coursesMap = new Map(allCourses.map((c) => [c.sourcedId, c]))
	const coursesBySubject = new Map<string, CourseForExplore[]>()
	const processedCourseIds = new Set<string>()

	// Note: enrolledCourseIds is already computed via class->course mapping above

	for (const oneRosterClass of allClasses) {
		const course = coursesMap.get(oneRosterClass.course.sourcedId)
		if (!course || !course.subjects || course.subjects.length === 0) continue

		// Skip if we've already processed this course (multiple classes can reference same course)
		if (processedCourseIds.has(course.sourcedId)) continue
		processedCourseIds.add(course.sourcedId)

		// Validate course metadata with Zod
		const courseMetadataResult = CourseMetadataSchema.safeParse(course.metadata)
		if (!courseMetadataResult.success) {
			logger.debug("invalid course metadata", {
				sourcedId: course.sourcedId,
				error: courseMetadataResult.error
			})
			continue
		}
		const courseMetadata = courseMetadataResult.data

		const constructedPath = `/${courseMetadata.khanSubjectSlug}/${courseMetadata.khanSlug}`

		const courseForExplore: CourseForExplore = {
			id: course.sourcedId, // Using OneRoster sourcedId as the key
			title: removeNiceAcademyPrefix(course.title),
			path: constructedPath,
			slug: courseMetadata.khanSlug,
			isEnrolled: enrolledCourseIds.has(course.sourcedId)
		}

		// Map OneRoster subjects back to UI-friendly subjects
		// Special case: Override for computing courses since OneRoster doesn't support "Computing" as a subject
		const uiSubject =
			courseMetadata.khanSubjectSlug === "computing" ? "Computing" : mapFromOneRosterSubjects(course.subjects)

		if (!coursesBySubject.has(uiSubject)) {
			coursesBySubject.set(uiSubject, [])
		}
		const subjectCourses = coursesBySubject.get(uiSubject)
		if (subjectCourses) {
			// Check if course is already in this subject (to avoid duplicates)
			const existingCourse = subjectCourses.find((c) => c.id === courseForExplore.id)
			if (!existingCourse) {
				subjectCourses.push(courseForExplore)
			}
		}
	}

	return Array.from(coursesBySubject.entries())
		.map(([subjectTitle, courses]) => ({
			slug: subjectTitle.toLowerCase().replace(/\s+/g, "-"),
			title: subjectTitle,
			courses: courses.sort((a, b) => a.title.localeCompare(b.title))
		}))
		.sort((a, b) => a.title.localeCompare(b.title))
}
