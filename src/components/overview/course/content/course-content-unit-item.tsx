import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { Sparkles } from "lucide-react"
import Link from "next/link"
import { ProficiencyIcon } from "@/components/overview/proficiency-icons"
import { cn } from "@/lib/utils"
import type { Lesson, Unit } from "./course-content"

export function CourseContentUnitItem({
	index,
	unit,
	className,
	active = false
}: {
	index: number
	unit: Unit
	className?: string
	active?: boolean
}) {
	logger.debug("initializing course content unit item", {
		unit: _.omit(unit, "lessons"),
		lessons: unit.lessons.length,
		index,
		active
	})

	return (
		<div className={cn(className, active ? "bg-blue-100" : "bg-gray-50")}>
			<div className={cn("flex items-center gap-4", active && "mb-2")}>
				<h3 className="text-sm font-semibold text-gray-900 w-16">
					<Link href={unit.path} className="hover:underline">
						Unit {index + 1}
					</Link>
				</h3>
				{active && (
					<div className="flex items-center gap-1">
						<Sparkles className="w-4 h-4 text-gray-500" />
						<span className="text-xs font-medium text-gray-500 uppercase tracking-wide">UP NEXT FOR YOU!</span>
					</div>
				)}
				{!active && (
					<div className="flex items-center gap-2">
						{unit.lessons.map((lesson) => (
							<LessonProficiencyIcon key={lesson.slug} lesson={lesson} active={false} />
						))}
					</div>
				)}
			</div>
			{active && (
				<div className="ml-20 flex items-center gap-2">
					{unit.lessons.map((lesson, i) => (
						<LessonProficiencyIcon key={lesson.slug} lesson={lesson} active={i === 0} />
					))}
				</div>
			)}
		</div>
	)
}

function LessonProficiencyIcon({ lesson, active = false }: { lesson: Lesson; active?: boolean }) {
	switch (lesson.type) {
		case "exercise":
			return (
				<Link href={lesson.path} className="inline-flex items-center">
					<ProficiencyIcon variant="not-started" active={active}>
						<span className="text-xs font-medium text-gray-500 capitalize">Exercise: {lesson.title}</span>
					</ProficiencyIcon>
				</Link>
			)
		case "quiz":
			return (
				<ProficiencyIcon variant="quiz" active={active}>
					<Link href={lesson.path} className="inline-flex items-center text-xs font-medium text-gray-500 capitalize">
						Quiz: {lesson.title}
					</Link>
				</ProficiencyIcon>
			)
		case "unit-test":
			return (
				<ProficiencyIcon variant="unit-test" active={active}>
					<Link href={lesson.path} className="inline-flex items-center text-xs font-medium text-gray-500 capitalize">
						Unit Test: {lesson.title}
					</Link>
				</ProficiencyIcon>
			)
	}
}
