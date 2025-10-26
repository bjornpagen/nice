import * as React from "react"
import "server-only"
import * as logger from "@superbuilders/slog"
import {
	getCourseResourceBundle,
	getCourseResourceBundleLookups,
	type CourseResourceBundle
} from "@/lib/oneroster/redis/api"

export const getCachedCourseResourceBundle = React.cache(async (courseSourcedId: string): Promise<CourseResourceBundle> => {
	logger.debug("bundle cache requested", { courseId: courseSourcedId })
	return getCourseResourceBundle(courseSourcedId)
})

export async function getCachedCourseResourceBundleWithLookups(courseSourcedId: string) {
	const bundle = await getCachedCourseResourceBundle(courseSourcedId)
	logger.debug("bundle lookups resolved", {
		courseId: courseSourcedId,
		componentCount: bundle.componentCount,
		resourceCount: bundle.resourceCount
	})
	return {
		bundle,
		lookups: getCourseResourceBundleLookups(bundle)
	}
}
