import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"

async function main(): Promise<void> {
	const args = process.argv.slice(2)
	const showLabel = args.includes("-l") || args.includes("--label")
	const input = args.find((arg) => !arg.startsWith("-"))
	
	if (!input) {
		throw errors.new("course path or url argument required")
	}

	let coursePath: string
	if (input.startsWith("http://") || input.startsWith("https://")) {
		const url = new URL(input)
		coursePath = url.pathname
	} else {
		coursePath = input
	}

	const courseResult = await errors.try(
		db.query.niceCourses.findFirst({
			where: eq(schema.niceCourses.path, coursePath)
		})
	)
	if (courseResult.error) {
		throw errors.wrap(courseResult.error, "database query for course")
	}

	const course = courseResult.data
	if (!course) {
		throw errors.new(`course not found for path: ${coursePath}`)
	}

	const unitsResult = await errors.try(
		db.query.niceUnits.findMany({
			where: eq(schema.niceUnits.courseId, course.id)
		})
	)
	if (unitsResult.error) {
		throw errors.wrap(unitsResult.error, "database query for units")
	}

	const units = unitsResult.data.sort((a, b) => a.ordering - b.ordering)

	for (let i = 0; i < units.length; i++) {
		const unit = units[i]
		if (!unit) continue
		
		if (showLabel) {
			console.log(`${i + 1}. ${unit.title}: https://www.nice.academy${unit.path}`)
		} else {
			console.log(`${i + 1}. https://www.nice.academy${unit.path}`)
		}
	}
}

const result = await errors.try(main())
if (result.error) {
	console.error(result.error.toString())
	process.exit(1)
}

process.exit(0)
