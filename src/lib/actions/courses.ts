"use server"

import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { revalidatePath } from "next/cache"
import { oneroster } from "@/lib/clients"
import { getAllCourses, getClassesForSchool, getEnrollmentsForUser } from "@/lib/data/fetchers/oneroster"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import { CourseMetadataSchema } from "@/lib/metadata/oneroster"

export async function saveUserCourses(selectedClassIds: string[]) {
	const user = await currentUser()
	if (!user) {
		throw errors.new("user not authenticated")
	}

	if (!user.publicMetadata) {
		logger.error("CRITICAL: User public metadata missing", { userId: user.id })
		throw errors.new("user public metadata missing")
	}

	const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!metadataValidation.success) {
		logger.error("CRITICAL: Invalid user metadata", {
			userId: user.id,
			error: metadataValidation.error
		})
		throw errors.wrap(metadataValidation.error, "user metadata validation failed")
	}

	const metadata = metadataValidation.data

	// sourceId is required for enrollment operations
	if (!metadata.sourceId) {
		logger.error("CRITICAL: sourceId missing for user", { userId: user.id })
		throw errors.new("sourceId required for enrollment operations")
	}
	const sourceId = metadata.sourceId

	logger.info("syncing user enrollments", { userId: user.id, sourceId, selectedClassIds })

	// Get current enrollments for the user using new fetcher
	const currentEnrollmentsResult = await errors.try(getEnrollmentsForUser(sourceId))
	if (currentEnrollmentsResult.error) {
		logger.error("failed to fetch current enrollments", { sourceId, error: currentEnrollmentsResult.error })
		throw errors.wrap(currentEnrollmentsResult.error, "get current enrollments")
	}
	const currentEnrollments = currentEnrollmentsResult.data

	const currentClassIds = new Set(currentEnrollments.map((e) => e.class.sourcedId))
	const newClassIds = new Set(selectedClassIds)

	const classesToAdd = selectedClassIds.filter((id) => !currentClassIds.has(id))
	const enrollmentsToRemove = currentEnrollments.filter((e) => !newClassIds.has(e.class.sourcedId))

	logger.debug("enrollment diff calculated", {
		toAdd: classesToAdd.length,
		toRemove: enrollmentsToRemove.length
	})

	// Early return if no changes needed (from upstream)
	if (classesToAdd.length === 0 && enrollmentsToRemove.length === 0) {
		logger.info("no enrollment changes needed", { userId: user.id, sourceId })
		return { success: true, changed: false }
	}

	const promises: Promise<unknown>[] = []

	for (const classId of classesToAdd) {
		promises.push(
			oneroster.createEnrollment({
				status: "active",
				role: "student",
				user: { sourcedId: sourceId, type: "user" },
				class: { sourcedId: classId, type: "class" }
			})
		)
	}

	for (const enrollment of enrollmentsToRemove) {
		promises.push(oneroster.deleteEnrollment(enrollment.sourcedId))
	}

	const results = await Promise.allSettled(promises)
	let hasErrors = false
	results.forEach((result, index) => {
		if (result.status === "rejected") {
			hasErrors = true
			const operation =
				index < classesToAdd.length
					? `create enrollment for class ${classesToAdd[index]}`
					: `delete enrollment ${enrollmentsToRemove[index - classesToAdd.length]?.sourcedId}`
			logger.error("failed enrollment operation", { operation, error: result.reason })
		}
	})

	if (hasErrors) {
		throw errors.new("one or more enrollment operations failed during sync")
	}

	revalidatePath("/profile/me/courses")
	logger.info("successfully synced user enrollments", {
		userId: user.id,
		sourceId,
		added: classesToAdd.length,
		removed: enrollmentsToRemove.length
	})
	return { success: true, changed: true }
}

// Type definitions for OneRoster explore dropdown (no DB dependency)
const ONEROSTER_ORG_ID = "nice-academy"

type CourseForExplore = {
	id: string // Using OneRoster sourcedId as the key
	title: string
	path: string
	slug: string
}

type SubjectWithCoursesForExplore = {
	slug: string
	title: string
	courses: CourseForExplore[]
}

export async function getOneRosterCoursesForExplore(): Promise<SubjectWithCoursesForExplore[]> {
	logger.info("fetching explore dropdown data from oneroster api", { orgId: ONEROSTER_ORG_ID })

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

		// Extract subject from course subjects array
		if (!course.subjects || course.subjects.length === 0 || !course.subjects[0]) {
			logger.error("CRITICAL: Course subject missing", {
				courseId: course.sourcedId,
				title: course.title
			})
			throw errors.new("course subject required for path construction")
		}
		const subjectSlug = course.subjects[0].toLowerCase().replace(/ /g, "-")
		const constructedPath = `/${subjectSlug}/${courseMetadata.khanSlug}`

		const courseForExplore: CourseForExplore = {
			id: course.sourcedId, // Using OneRoster sourcedId as the key
			title: course.title,
			path: constructedPath,
			slug: courseMetadata.khanSlug
		}

		for (const subject of course.subjects) {
			if (!coursesBySubject.has(subject)) {
				coursesBySubject.set(subject, [])
			}
			const subjectCourses = coursesBySubject.get(subject)
			if (subjectCourses) {
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
