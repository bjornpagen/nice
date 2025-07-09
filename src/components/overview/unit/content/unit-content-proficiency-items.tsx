import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import Link from "next/link"
import { ProficiencyIcon } from "@/components/overview/proficiency-icons"
import { cn } from "@/lib/utils"
import type { Lesson } from "./unit-content"

export function UnitContentProficiencyItems({ lessons, className }: { lessons: Lesson[]; className?: string }) {
	logger.debug("initializing unit proficiency items", { lessons: lessons.length })

	return (
		<div id="unit-content-proficiency-item" className={cn("flex items-center gap-1", className)}>
			{lessons.map((lesson) => (
				<LessonProficiencyIcon key={lesson.slug} lesson={lesson} />
			))}
		</div>
	)
}

function LessonProficiencyIcon({ lesson }: { lesson: Lesson }) {
	switch (lesson.type) {
		case "exercise":
			return (
				<Link href={lesson.path} className="inline-flex items-center">
					<ProficiencyIcon variant="not-started">
						<h2 className="text-md font-bold text-gray-800 capitalize">Exercise: {lesson.title}</h2>
						<p className="text-sm text-gray-500">Preview is not available for this exercise.</p>
					</ProficiencyIcon>
				</Link>
			)
		case "quiz":
			return (
				<Link href={lesson.path} className="inline-flex items-center">
					<ProficiencyIcon variant="quiz">
						<h2 className="text-md font-bold text-gray-800 capitalize">Quiz: {lesson.title}</h2>
						<p className="text-sm text-gray-500">Preview is not available for this quiz.</p>
					</ProficiencyIcon>
				</Link>
			)
		case "unit-test":
			return (
				<Link href={lesson.path} className="inline-flex items-center">
					<ProficiencyIcon variant="unit-test">
						<h2 className="text-md font-bold text-gray-800 capitalize">Unit Test: {lesson.title}</h2>
						<p className="text-sm text-gray-500">Preview is not available for this unit test.</p>
					</ProficiencyIcon>
				</Link>
			)
		default:
			throw errors.new(`invalid lesson type: ${lesson.type}`)
	}
}
