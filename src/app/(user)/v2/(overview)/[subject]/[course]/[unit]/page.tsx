import * as logger from "@superbuilders/slog"
import * as React from "react"
import { type Unit, UnitContent } from "@/components/overview/unit/content/unit-content"

export default async function UnitPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string }>
}) {
	const { subject, course, unit } = await params
	logger.debug("initializing unit page", { subject, course, unit })

	const unitPromise = getUnitData(subject, course, unit)
	logger.debug("unit data retrieved", { subject, course, unit })

	return (
		<div id="unit-page">
			<React.Suspense>
				<UnitContent unitPromise={unitPromise} />
			</React.Suspense>
		</div>
	)
}

async function getUnitData(subject: string, course: string, unit: string): Promise<Unit> {
	logger.debug("retrieving unit data", { subject, course, unit })

	return {
		slug: unit,
		path: `/v2/${subject}/${course}/${unit}`,
		title: `Unit '${unit}' Title`,
		lessons: [
			{
				slug: "lesson-1",
				path: `/v2/${subject}/${course}/${unit}/lesson-1`,
				type: "exercise",
				title: "Exercise Lesson 1"
			},
			{
				slug: "lesson-2",
				path: `/v2/${subject}/${course}/${unit}/lesson-2`,
				type: "quiz",
				title: "Quiz Lesson 2"
			},
			{
				slug: "lesson-3",
				path: `/v2/${subject}/${course}/${unit}/lesson-3`,
				type: "exercise",
				title: "Exercise Lesson 3"
			},
			{
				slug: "lesson-4",
				path: `/v2/${subject}/${course}/${unit}/lesson-4`,
				type: "unit-test",
				title: "Unit Test Lesson 4"
			}
		]
	}
}
