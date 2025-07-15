import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { Course, Lesson, Unit } from "@/lib/types"
import { upperCase } from "@/lib/utils"

function findNextLesson(unit: Pick<Unit, "children">, currentIndex: number): Lesson | undefined {
	if (currentIndex >= unit.children.length - 1) return undefined
	for (let i = currentIndex + 1; i < unit.children.length; i++) {
		const child = unit.children[i]
		if (child?.type === "Lesson") return child
	}
	return undefined
}

function findPrevLesson(unit: Pick<Unit, "children">, currentIndex: number): Lesson | undefined {
	if (currentIndex <= 0) return undefined
	for (let i = currentIndex - 1; i >= 0; i--) {
		const child = unit.children[i]
		if (child?.type === "Lesson") return child
	}
	return undefined
}

export function LessonNavigation({
	course,
	unit,
	lesson,
	setSelectedLessonId
}: {
	course: Pick<Course, "title" | "path">
	unit: Pick<Unit, "title" | "path" | "children" | "ordering">
	lesson: Pick<Lesson, "title">
	setSelectedLessonId: (lessonId: string) => void
}) {
	const pathname = usePathname()

	const index = unit.children.findIndex((child) => child.type === "Lesson" && child.title === lesson.title)
	// logger.info("lesson navigation", { index, lesson: lesson.title })

	const prev = findPrevLesson(unit, index)
	// logger.info("lesson navigation: prevLesson", { found: prev != null })

	const next = findNextLesson(unit, index)
	// logger.info("lesson navigation: nextLesson", { found: next != null })

	// Truncate course title if it's too long (Khan Academy style)
	const truncateCourseTitle = (title: string, maxLength = 25) => {
		if (title.length <= maxLength) return title
		return `${title.substring(0, maxLength).trim()}...`
	}

	// Construct unit path from current pathname
	// Current path: /economics/microeconomics/basic-economic-concepts/scarcity/v/scarcity-video
	// Unit path should be: /economics/microeconomics/basic-economic-concepts
	const pathSegments = pathname.split("/").filter(Boolean)
	const unitPagePath = pathSegments.length >= 3 ? `/${pathSegments.slice(0, 3).join("/")}` : unit.path

	// Handle navigation to previous lesson
	const handlePrevLesson = () => {
		if (prev) {
			setSelectedLessonId(prev.id)
		}
	}

	// Handle navigation to next lesson
	const handleNextLesson = () => {
		if (next) {
			setSelectedLessonId(next.id)
		}
	}

	return (
		<div className="flex items-center p-5 border-b border-gray-200">
			<div className="flex-shrink-0">
				{prev == null ? (
					<Button disabled variant="link" className="pl-1 text-gray-400 w-2 h-2 opacity-50 cursor-not-allowed">
						<ChevronLeft className="w-5 h-5" />
					</Button>
				) : (
					<Button variant="link" className="pl-1 text-blue-600 w-2 h-2" onClick={handlePrevLesson}>
						<ChevronLeft className="w-5 h-5" />
					</Button>
				)}
			</div>

			<div className="flex-1 text-center min-w-0 px-2">
				<div className="text-xs flex items-center justify-center gap-1 min-w-0">
					<Link className="text-blue-600 hover:underline font-medium text-xs whitespace-nowrap" href={course.path}>
						COURSE: {upperCase(truncateCourseTitle(course.title))}
					</Link>
					<span className="text-gray-600 text-xs font-medium flex-shrink-0">{" > "}</span>
					<Link className="text-blue-600 hover:underline font-medium text-xs whitespace-nowrap" href={unitPagePath}>
						UNIT {unit.ordering + 1}
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
					<Button variant="link" className="pr-1 text-blue-600 w-2 h-2" onClick={handleNextLesson}>
						<ChevronRight className="w-5 h-5" />
					</Button>
				)}
			</div>
		</div>
	)
}
