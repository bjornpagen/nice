import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { ProfileCoursesPageData } from "@/lib/types/page"
import type { ProfileCourse } from "@/lib/types/profile"
import type { Unit } from "@/lib/types/structure"
import { oneroster } from "../clients"
import type { ClassReadSchemaType, CourseReadSchemaType } from "../oneroster"
import { getMetadataValue } from "./utils"

export async function fetchUserEnrolledCourses(userId: string): Promise<ProfileCourse[]> {
	// Get enrollments for the user
	const filter = `user.sourcedId='${userId}' AND status='active'`
	const enrollmentsResult = await errors.try(oneroster.getAllEnrollments({ filter }))
	if (enrollmentsResult.error) {
		logger.error("failed to fetch user enrollments", { error: enrollmentsResult.error, userId })
		throw errors.wrap(enrollmentsResult.error, "fetch user enrollments")
	}

	if (enrollmentsResult.data.length === 0) {
		return []
	}

	const classIds = [...new Set(enrollmentsResult.data.map((enrollment) => enrollment.class.sourcedId))]

	const classPromises = classIds.map(async (classId) => {
		const classResult = await errors.try(oneroster.getClass(classId))
		if (classResult.error) {
			logger.error("failed to fetch class details", { error: classResult.error, classId })
			return null
		}
		return classResult.data
	})

	const classes = (await Promise.all(classPromises)).filter((c): c is ClassReadSchemaType => c !== null)

	const courseIds = [...new Set(classes.map((c) => c.course.sourcedId))]
	const unitsByCourseId = new Map<string, Unit[]>()

	if (courseIds.length > 0) {
		// Fetch units for each course individually since OneRoster doesn't support IN clause
		const unitPromises = courseIds.map(async (courseId) => {
			const result = await errors.try(oneroster.getCourseComponentsForCourse(courseId))
			if (result.error) {
				logger.error("failed to fetch units for course", { courseId, error: result.error })
				return []
			}
			return result.data || []
		})

		const unitArrays = await Promise.all(unitPromises)
		const allUnitsData = unitArrays.flat()

		if (allUnitsData.length > 0) {
			for (const unit of allUnitsData) {
				const courseId = unit.course.sourcedId
				if (!unitsByCourseId.has(courseId)) {
					unitsByCourseId.set(courseId, [])
				}

				const path = getMetadataValue(unit.metadata || {}, "path")
				if (!path) {
					continue
				}

				const slug = getMetadataValue(unit.metadata || {}, "khanSlug")
				if (!slug) {
					continue
				}

				unitsByCourseId.get(courseId)?.push({
					id: unit.sourcedId,
					title: unit.title,
					path: path,
					ordering: unit.sortOrder,
					description: getMetadataValue(unit.metadata || {}, "description") || "",
					slug,
					children: []
				})
			}
		}
	}

	const coursePromises = classes.map(async (cls) => {
		const courseResult = await errors.try(oneroster.getCourse(cls.course.sourcedId))
		if (courseResult.error) return null
		return courseResult.data
	})

	const coursesData = (await Promise.all(coursePromises)).filter((c): c is CourseReadSchemaType => c !== null)
	const coursesMap = new Map(coursesData.map((c) => [c.sourcedId, c]))

	const courses: ProfileCourse[] = []
	for (const cls of classes) {
		const course = coursesMap.get(cls.course.sourcedId)
		if (!course) continue

		const courseUnits = unitsByCourseId.get(cls.course.sourcedId) || []

		courses.push({
			id: course.sourcedId,
			title: course.title,
			description: getMetadataValue(course.metadata || {}, "khanDescription") || "",
			path: getMetadataValue(course.metadata || {}, "path") || "",
			units: courseUnits.sort((a, b) => a.ordering - b.ordering)
		})
	}

	return courses
}

export async function fetchProfileCoursesData(): Promise<ProfileCoursesPageData> {
	const user = await currentUser()
	if (!user) {
		throw errors.new("user not authenticated")
	}

	const sourceId = typeof user.publicMetadata.sourceId === "string" ? user.publicMetadata.sourceId : user.id

	// Import from actions since that's where the function is defined
	const { getOneRosterCoursesForExplore } = await import("@/lib/actions/courses")

	const subjectsPromise = getOneRosterCoursesForExplore()
	const userCoursesPromise = fetchUserEnrolledCourses(sourceId)

	const [subjects, userCourses] = await Promise.all([subjectsPromise, userCoursesPromise])

	return { subjects, userCourses }
}
