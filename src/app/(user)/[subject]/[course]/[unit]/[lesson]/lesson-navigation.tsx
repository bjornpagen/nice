import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { CourseInfo, LessonInfo, UnitInfo } from "@/lib/khan-academy-api"
import { upperCase } from "@/lib/utils"

export function LessonNavigation({
	course,
	unit,
	lesson
}: {
	course: Pick<CourseInfo, "title" | "path">
	unit: Pick<UnitInfo, "title" | "path" | "children">
	lesson: Pick<LessonInfo, "title">
}) {
	const index = unit.children.findIndex(
		(child): child is LessonInfo => child.type === "Lesson" && child.title === lesson.title
	)
	// logger.info("lesson navigation", { index, lesson: lesson.title })

	const prev = prevLesson(unit, index)
	// logger.info("lesson navigation: prevLesson", { found: prev != null })

	const next = nextLesson(unit, index)
	// logger.info("lesson navigation: nextLesson", { found: next != null })

	return (
		<div className="flex items-center p-5 border-b border-gray-200">
			<div className="flex-shrink-0">
				{prev == null ? (
					<Button disabled variant="link" className="pl-1 text-gray-400 w-2 h-2 opacity-50 cursor-not-allowed">
						<ChevronLeft className="w-5 h-5" />
					</Button>
				) : (
					<Button variant="link" className="pl-1 text-blue-600 w-2 h-2" asChild>
						<Link href={prev.path}>
							<ChevronLeft className="w-5 h-5" />
						</Link>
					</Button>
				)}
			</div>

			<div className="flex-1 text-center min-w-0 px-2">
				<div className="text-xs flex items-center justify-center gap-1 min-w-0">
					<Link className="text-blue-600 hover:underline font-medium text-xs whitespace-nowrap" href={course.path}>
						COURSE: {upperCase(course.title)}
					</Link>
					<span className="text-gray-600 text-xs font-medium flex-shrink-0">{" > "}</span>
					<Link className="text-blue-600 hover:underline font-medium text-xs whitespace-nowrap" href={unit.path}>
						{upperCase(unit.title)}
					</Link>
				</div>
				<div className="text-md text-gray-600 font-medium truncate">
					Lesson {index + 1}: {lesson.title}
				</div>
			</div>

			<div className="flex-shrink-0">
				{next == null ? (
					<Button disabled variant="link" className="pr-1 text-gray-400 w-2 h-2 opacity-50 cursor-not-allowed">
						<ChevronRight className="w-5 h-5" />
					</Button>
				) : (
					<Button variant="link" className="pr-1 text-blue-600 w-2 h-2" asChild>
						<Link href={next.path}>
							<ChevronRight className="w-5 h-5" />
						</Link>
					</Button>
				)}
			</div>
		</div>
	)
}

function prevLesson(
	unit: Pick<UnitInfo, "children">,
	index: number
): Pick<LessonInfo, "path" | "children"> | undefined {
	if (index <= 0) {
		return undefined
	}

	const prev = unit.children[index - 1]
	if (prev?.type === "Lesson") {
		return prev
	}

	return prevLesson(unit, index - 1)
}

function nextLesson(
	unit: Pick<UnitInfo, "children">,
	index: number
): Pick<LessonInfo, "path" | "children"> | undefined {
	if (index >= unit.children.length - 1) {
		return undefined
	}

	const next = unit.children[index + 1]
	if (next?.type === "Lesson") {
		return next
	}

	return nextLesson(unit, index + 1)
}
