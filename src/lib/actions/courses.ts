"use server"

import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"

export async function saveUserCourses(selectedClassIds: string[]) {
	const user = await currentUser()
	if (!user) {
		throw errors.new("user not authenticated")
	}

	const sourceId = typeof user.publicMetadata.sourceId === "string" ? user.publicMetadata.sourceId : undefined
	if (!sourceId) {
		throw errors.new("user does not have a sourceId in clerk metadata")
	}

	logger.info("syncing user enrollments", { userId: user.id, sourceId, selectedClassIds })

	// Get current enrollments for the user
	const currentEnrollmentsResult = await errors.try(oneroster.getEnrollmentsForUser(sourceId))
	if (currentEnrollmentsResult.error) {
		logger.error("failed to fetch current enrollments", { sourceId, error: currentEnrollmentsResult.error })
		throw errors.wrap(currentEnrollmentsResult.error, "get current enrollments")
	}
	const currentEnrollments = currentEnrollmentsResult.data

	const currentClassIds = new Set(currentEnrollments.map((e) => e.class.sourcedId))
	const newClassIds = new Set(selectedClassIds)

	// Determine what to add and what to remove
	const classesToAdd = selectedClassIds.filter((id) => !currentClassIds.has(id))
	const enrollmentsToRemove = currentEnrollments.filter((e) => !newClassIds.has(e.class.sourcedId))

	logger.debug("enrollment diff calculated", {
		toAdd: classesToAdd.length,
		toRemove: enrollmentsToRemove.length
	})

	const promises: Promise<unknown>[] = []

	// Create new enrollments
	for (const classId of classesToAdd) {
		promises.push(
			oneroster.createEnrollment({
				role: "student",
				user: { sourcedId: sourceId, type: "user" },
				class: { sourcedId: classId, type: "class" }
			})
		)
	}

	// Delete old enrollments
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

	logger.info("successfully synced user enrollments", {
		userId: user.id,
		sourceId,
		added: classesToAdd.length,
		removed: enrollmentsToRemove.length
	})
	return { success: true }
}

// Type definitions for OneRoster explore dropdown (no DB dependency)
const ONEROSTER_ORG_ID = "nice-academy"

type CourseForExplore = {
	id: string // Using OneRoster sourcedId as the key
	title: string
	path: string
}

type SubjectWithCoursesForExplore = {
	slug: string
	title: string
	courses: CourseForExplore[]
}

export async function getOneRosterCoursesForExplore(): Promise<SubjectWithCoursesForExplore[]> {
	logger.info("fetching explore dropdown data from oneroster api", { orgId: ONEROSTER_ORG_ID })

	const [classesResult, coursesResult] = await Promise.all([
		errors.try(oneroster.getClassesForSchool(ONEROSTER_ORG_ID)),
		errors.try(oneroster.getAllCourses("sourcedId~'nice:'"))
	])

	if (classesResult.error) {
		logger.error("failed to fetch classes from oneroster", { error: classesResult.error })
		throw errors.wrap(classesResult.error, "oneroster class fetch")
	}
	if (coursesResult.error) {
		logger.error("failed to fetch courses from oneroster", { error: coursesResult.error })
		throw errors.wrap(coursesResult.error, "oneroster course fetch")
	}

	const allClasses = classesResult.data
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

		// Get path from OneRoster metadata
		const pathFromMetadata =
			course.metadata && typeof course.metadata === "object" && "path" in course.metadata
				? String(course.metadata.path)
				: undefined

		if (!pathFromMetadata) {
			logger.debug("course missing metadata path", { sourcedId: course.sourcedId })
			continue
		}

		const courseForExplore: CourseForExplore = {
			id: course.sourcedId, // Using OneRoster sourcedId as the key
			title: course.title,
			path: pathFromMetadata
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
