import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { getOneRosterCoursesForExplore } from "@/lib/actions/courses"
import { fetchCoursePageData } from "@/lib/data/course"
import type { Unit } from "@/lib/types/domain"
import { assertNoEncodedColons } from "@/lib/utils"

export type SubjectWithCourseUnitsHeader = { slug: string; title: string }

export type SubjectWithCourseUnits = {
	slug: string
	title: string
	courses: Array<{
		id: string
		slug: string
		title: string
		path: string
		units: Array<Pick<Unit, "id" | "title" | "path">>
	}>
}

export async function fetchSubjectPageData(params: {
	subject: string
}): Promise<SubjectWithCourseUnitsHeader | undefined> {
	assertNoEncodedColons(params.subject, "fetchSubjectPageData subject parameter")

	logger.info("fetching subject page data from oneroster", { subjectSlug: params.subject })

	const allSubjectsResult = await errors.try(getOneRosterCoursesForExplore())
	if (allSubjectsResult.error) {
		logger.error("failed to fetch all subjects for explore", { error: allSubjectsResult.error })
		throw errors.wrap(allSubjectsResult.error, "oneroster subjects fetch")
	}

	const targetSubject = allSubjectsResult.data.find((s) => s.slug === params.subject)
	if (!targetSubject) {
		logger.warn("subject not found in oneroster data", { subjectSlug: params.subject })
		return undefined
	}

	logger.info("successfully fetched subject data", {
		subjectSlug: params.subject,
		courseCount: targetSubject.courses.length
	})

	return { slug: targetSubject.slug, title: targetSubject.title }
}

export async function fetchSubjectCoursesWithUnits(params: {
	subject: string
}): Promise<SubjectWithCourseUnits | undefined> {
	assertNoEncodedColons(params.subject, "fetchSubjectCoursesWithUnits subject parameter")

	logger.info("fetching subject courses with units", { subjectSlug: params.subject })

	const allSubjectsResult = await errors.try(getOneRosterCoursesForExplore())
	if (allSubjectsResult.error) {
		logger.error("failed to fetch all subjects for course units", { error: allSubjectsResult.error })
		throw errors.wrap(allSubjectsResult.error, "oneroster subjects fetch")
	}

	const subject = allSubjectsResult.data.find((s) => s.slug === params.subject)
	if (!subject) {
		logger.warn("subject not found when loading course units", { subjectSlug: params.subject })
		return undefined
	}

	// Fetch units for each course in parallel (skip heavy question fetching)
	const courseDataResults = await Promise.all(
		subject.courses.map(async (course) => {
			const data = await fetchCoursePageData(
				{ subject: params.subject, course: course.slug },
				{ skipQuestions: true }
			)
			return {
				id: data.course.id,
				slug: course.slug,
				title: data.course.title,
				path: data.course.path,
				units: data.course.units.map((u) => ({ id: u.id, title: u.title, path: u.path }))
			}
		})
	)

	logger.info("subject course loader used bundle", {
		subjectSlug: params.subject,
		courseCount: courseDataResults.length
	})

	return {
		slug: subject.slug,
		title: subject.title,
		courses: courseDataResults
	}
}
