import * as logger from "@superbuilders/slog"
import _ from "lodash"
import type { Unit } from "./course-content"

export function CourseContentUnitItem({ unit, active }: { unit: Unit; active: boolean }) {
	logger.debug("initializing course content unit item", {
		unit: _.omit(unit, "lessons"),
		lessons: unit.lessons.length,
		active
	})

	return (
		<div>
			<h2>{unit.title}</h2>
			<p>{unit.lessons.length} lessons</p>
			<p>{unit.lessons.filter((lesson) => lesson.type === "exercise").length} exercises</p>
			<p>{unit.lessons.filter((lesson) => lesson.type === "quiz").length} quizzes</p>
			<p>{unit.lessons.filter((lesson) => lesson.type === "unit-test").length} unit tests</p>
		</div>
	)
}
