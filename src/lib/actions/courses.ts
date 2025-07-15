"use server"

import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { revalidatePath } from "next/cache"
import { oneroster } from "@/lib/clients"
import { getMetadataValue } from "../data/utils"
import type { CourseReadSchemaType } from "../oneroster"
import type { ProfileSubject } from "../types/profile"

export async function saveUserCourses(selectedClassIds: string[]) {
	const user = await currentUser()
	if (!user) {
		throw errors.new("user not authenticated")
	}

	const sourceId = typeof user.publicMetadata.sourceId === "string" ? user.publicMetadata.sourceId : user.id

	logger.info("syncing user enrollments", { userId: user.id, sourceId, selectedClassIds })

	const currentEnrollmentsResult = await errors.try(oneroster.getEnrollmentsForUser(sourceId))
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

	// Early return if no changes needed
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

export async function getOneRosterCoursesForExplore(): Promise<ProfileSubject[]> {
	const classesResult = await errors.try(oneroster.getClassesForSchool("nice-academy", { filter: "status='active'" }))
	if (classesResult.error) {
		logger.error("failed to fetch classes from oneroster", { error: classesResult.error })
		throw errors.wrap(classesResult.error, "oneroster class fetch")
	}

	const allClasses = classesResult.data

	const courseIds = [...new Set(allClasses.map((c) => c.course.sourcedId))]
	if (courseIds.length === 0) return []

	// Fetch each course individually since OneRoster doesn't support IN clause
	const coursePromises = courseIds.map(async (courseId) => {
		const result = await errors.try(oneroster.getCourse(courseId))
		if (result.error) {
			logger.error("failed to fetch course", { courseId, error: result.error })
			return null
		}
		return result.data
	})

	const courseResults = await Promise.all(coursePromises)
	const allCourses = courseResults.filter((c): c is CourseReadSchemaType => c !== null && c !== undefined)
	const coursesBySubject = new Map<string, { id: string; title: string; path: string; slug: string }[]>()
	const processedCourseIds = new Set<string>()

	for (const oneRosterClass of allClasses) {
		const course = allCourses.find((c) => c.sourcedId === oneRosterClass.course.sourcedId)
		if (!course || !course.subjects || course.subjects.length === 0) continue

		if (processedCourseIds.has(course.sourcedId)) continue
		processedCourseIds.add(course.sourcedId)

		const pathFromMetadata = getMetadataValue(course.metadata || {}, "path")
		if (!pathFromMetadata) continue

		const slugFromMetadata = getMetadataValue(course.metadata || {}, "khanSlug")
		if (!slugFromMetadata) continue

		const courseForExplore = {
			id: oneRosterClass.sourcedId, // Use the class ID for selection
			title: course.title,
			path: pathFromMetadata,
			slug: slugFromMetadata
		}

		for (const subject of course.subjects) {
			if (!coursesBySubject.has(subject)) {
				coursesBySubject.set(subject, [])
			}
			coursesBySubject.get(subject)?.push(courseForExplore)
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
