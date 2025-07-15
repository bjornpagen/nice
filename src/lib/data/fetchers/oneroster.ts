import { unstable_cacheLife as cacheLife } from "next/cache"
import { oneroster } from "@/lib/clients"

// --- Single Entity Fetchers ---

export async function getCourse(sourcedId: string) {
	"use cache"
	cacheLife("curriculum")
	return oneroster.getCourse(sourcedId)
}

export async function getResource(sourcedId: string) {
	"use cache"
	cacheLife("curriculum")
	return oneroster.getResource(sourcedId)
}

export async function getClass(classId: string) {
	"use cache"
	cacheLife("minutes")
	return oneroster.getClass(classId)
}

// --- Collection Fetchers (Encapsulating Filters) ---

export async function getAllCourses() {
	"use cache"
	cacheLife("curriculum")
	return oneroster.getAllCourses({})
}

export async function getAllCoursesBySlug(slug: string) {
	"use cache"
	cacheLife("curriculum")
	return oneroster.getAllCourses({ filter: `metadata.khanSlug='${slug}'` })
}

export async function getCourseComponentsByCourseId(courseId: string) {
	"use cache"
	cacheLife("curriculum")
	return oneroster.getCourseComponents({ filter: `course.sourcedId='${courseId}'` })
}

export async function getCourseComponentsByParentId(parentId: string) {
	"use cache"
	cacheLife("curriculum")
	return oneroster.getCourseComponents({ filter: `parent.sourcedId='${parentId}'` })
}

export async function getCourseComponentBySlug(slug: string) {
	"use cache"
	cacheLife("curriculum")
	return oneroster.getCourseComponents({ filter: `metadata.khanSlug='${slug}'` })
}

export async function getCourseComponentByCourseAndSlug(courseId: string, slug: string) {
	"use cache"
	cacheLife("curriculum")
	return oneroster.getCourseComponents({ filter: `course.sourcedId='${courseId}' AND metadata.khanSlug='${slug}'` })
}

export async function getCourseComponentByParentAndSlug(parentId: string, slug: string) {
	"use cache"
	cacheLife("curriculum")
	return oneroster.getCourseComponents({ filter: `parent.sourcedId='${parentId}' AND metadata.khanSlug='${slug}'` })
}

export async function getUnitsForCourses(courseIds: string[]) {
	"use cache"
	cacheLife("curriculum")
	if (courseIds.length === 0) return []
	// Encapsulates the `@` filter logic for OneRoster IN operator
	const filter = `course.sourcedId@'${courseIds.join(",")}'`
	return oneroster.getCourseComponents({ filter })
}

export async function getAllResources() {
	"use cache"
	cacheLife("curriculum")
	return oneroster.getAllResources()
}

export async function getResourcesBySlugAndType(slug: string, type: "qti" | "video", lessonType?: "quiz" | "unittest") {
	"use cache"
	cacheLife("curriculum")
	const filter = `metadata.khanSlug='${slug}' AND metadata.type='${type}'`
	const resources = await oneroster.getAllResources({ filter })

	// Filter by lessonType in-memory since OneRoster only supports one AND
	if (lessonType) {
		return resources.filter((r) => r.metadata?.khanLessonType === lessonType)
	}

	return resources
}

export async function getResourceByCourseAndSlug(courseId: string, slug: string, type: "qti") {
	"use cache"
	cacheLife("curriculum")
	const filter = `metadata.khanSlug='${slug}' AND metadata.type='${type}'`
	const resources = await oneroster.getAllResources({ filter })

	// Filter by courseId in-memory since OneRoster only supports one AND
	// Resources are linked to courses via metadata.courseSourcedId in our implementation
	return resources.filter((r) => r.metadata?.courseSourcedId === courseId)
}

export async function getAllComponentResources() {
	"use cache"
	cacheLife("curriculum")
	return oneroster.getAllComponentResources({})
}

export async function getClassesForSchool(schoolSourcedId: string) {
	"use cache"
	cacheLife("curriculum")
	return oneroster.getClassesForSchool(schoolSourcedId)
}

export async function getEnrollmentsForUser(userSourcedId: string) {
	"use cache"
	cacheLife("minutes")
	return oneroster.getEnrollmentsForUser(userSourcedId)
}

export async function getActiveEnrollmentsForUser(userSourcedId: string) {
	"use cache"
	// User data is more volatile, so we'll use a shorter default profile.
	cacheLife("minutes")
	return oneroster.getAllEnrollments({ filter: `user.sourcedId='${userSourcedId}' AND status='active'` })
}
