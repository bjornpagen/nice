import * as React from "react"
import { Button } from "@/components/ui/button"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { Content } from "./_components/content"

// 1. Drizzle prepared statements are colocated and explicitly select columns.
const getAllCoursesQuery = db
	.select({
		id: schema.niceCourses.id,
		title: schema.niceCourses.title,
		description: schema.niceCourses.description,
		path: schema.niceCourses.path
	})
	.from(schema.niceCourses)
	.prepare("src_app_user_profile_me_courses_page_get_all_courses")

const getAllUnitsQuery = db
	.select({
		id: schema.niceUnits.id,
		courseId: schema.niceUnits.courseId,
		title: schema.niceUnits.title,
		path: schema.niceUnits.path,
		slug: schema.niceUnits.slug,
		description: schema.niceUnits.description,
		ordering: schema.niceUnits.ordering
	})
	.from(schema.niceUnits)
	.prepare("src_app_user_profile_me_courses_page_get_all_units")

// 2. Types are derived from the queries and exported for use in child components.
export type Course = Awaited<ReturnType<typeof getAllCoursesQuery.execute>>[0]
export type Unit = Awaited<ReturnType<typeof getAllUnitsQuery.execute>>[0]

// 3. The page component is NOT async. It orchestrates promises.
export default function CoursesPage() {
	// 4. Create promises for the data fetches.
	const coursesPromise = getAllCoursesQuery.execute()
	const unitsPromise = getAllUnitsQuery.execute()

	// 5. Render a Suspense boundary and pass all promises to the client component.
	return (
		<React.Fragment>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-gray-800">My courses</h1>
				<Button variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4">
					Edit Courses
				</Button>
			</div>
			<React.Suspense fallback={<div>Loading courses...</div>}>
				<Content coursesPromise={coursesPromise} unitsPromise={unitsPromise} />
			</React.Suspense>
		</React.Fragment>
	)
}
