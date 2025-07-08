import { and, eq, sql } from "drizzle-orm"
import { redirect } from "next/navigation"
import { db } from "@/db"
import * as schema from "@/db/schemas"

// Query to verify test exists in this unit
const getTestInUnitQuery = db
	.select({
		id: schema.niceAssessments.id,
		title: schema.niceAssessments.title,
		slug: schema.niceAssessments.slug
	})
	.from(schema.niceAssessments)
	.where(
		and(
			eq(schema.niceAssessments.parentId, sql.placeholder("unitId")),
			eq(schema.niceAssessments.slug, sql.placeholder("testSlug")),
			eq(schema.niceAssessments.type, "UnitTest")
		)
	)
	.limit(1)
	.prepare("src_app_user_subject_course_unit_test_test_page_get_test_in_unit")

// Query to get unit ID by path
const getUnitByPathQuery = db
	.select({
		id: schema.niceUnits.id
	})
	.from(schema.niceUnits)
	.where(eq(schema.niceUnits.path, sql.placeholder("unitPath")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_test_test_page_get_unit_by_path")

// Query to get the first lesson in the unit (for redirect)
const getFirstLessonInUnitQuery = db
	.select({
		slug: schema.niceLessons.slug
	})
	.from(schema.niceLessons)
	.where(eq(schema.niceLessons.unitId, sql.placeholder("unitId")))
	.orderBy(schema.niceLessons.ordering)
	.limit(1)
	.prepare("src_app_user_subject_course_unit_test_test_page_get_first_lesson_in_unit")

export default async function TestRedirectPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; test: string }>
}) {
	const resolvedParams = await params
	const decodedTest = decodeURIComponent(resolvedParams.test)
	const decodedUnit = decodeURIComponent(resolvedParams.unit)

	const coursePath = `/${resolvedParams.subject}/${resolvedParams.course}`
	const unitPath = `${coursePath}/${decodedUnit}`

	// Get the unit ID
	const unitResult = await getUnitByPathQuery.execute({ unitPath })
	const unit = unitResult[0]

	if (!unit) {
		// Unit doesn't exist, this will 404
		return <div>Unit not found</div>
	}

	// Verify the test exists in this unit
	const testResult = await getTestInUnitQuery.execute({
		unitId: unit.id,
		testSlug: decodedTest
	})
	const test = testResult[0]

	if (!test) {
		// Test doesn't exist in this unit, this will 404
		return <div>Test not found</div>
	}

	// Get the first lesson in this unit for the redirect
	const lessonResult = await getFirstLessonInUnitQuery.execute({ unitId: unit.id })
	const lesson = lessonResult[0]

	if (!lesson) {
		// No lessons in unit - this shouldn't happen but handle gracefully
		return <div>No lessons found in unit</div>
	}

	// Redirect to the canonical 4-slug URL
	const canonicalUrl = `/${resolvedParams.subject}/${resolvedParams.course}/${decodedUnit}/${lesson.slug}/test/${decodedTest}`
	redirect(canonicalUrl)
}
