import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { BookOpen, Info } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CourseContentData } from "./course-content"

export function CourseContentUnitOverviewItem({
	index,
	unit,
	className,
	active = false
}: {
	index: number
	unit: CourseContentData["units"][number]
	className?: string
	active?: boolean
}) {
	logger.debug("initializing course content unit overview item", {
		unit: _.omit(unit, "lessons"),
		lessons: unit.lessons.length,
		index,
		active
	})

	const nonexercises = _.filter(
		_.flatMap(unit.lessons, (lesson) => lesson.resources),
		(resource) => resource.type !== "Exercise"
	)
	logger.debug("nonexercises", { nonexercises: nonexercises.length })

	return (
		<div
			className={cn(
				"bg-white rounded-xs border border-gray-200 shadow-sm p-4",
				className,
				active && "border-t-4 border-t-blue-500"
			)}
		>
			<div className="flex items-center mb-2">
				<div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
					<BookOpen className="w-5 h-5 text-white" />
				</div>
				<div className="ml-3">
					{active && <div className="text-blue-500 text-xs font-small">Up next for you:</div>}
					<Link href={unit.path} className="font-semibold text-gray-900 text-base text-sm capitalize hover:underline">
						Unit {index + 1}: {unit.title}
					</Link>
				</div>
				<div className="ml-auto text-right flex items-center gap-2">
					<div className="text-xs text-gray-600">Unit mastery: 0%</div>
					<Info className="w-4 h-4 text-gray-500 cursor-not-allowed" />
				</div>
			</div>

			<div className="border-b border-gray-200 mb-3" />

			<div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4">
				{nonexercises.map((lesson) => (
					<div key={lesson.slug}>
						<Link href={lesson.path} className="text-gray-600 hover:text-gray-800 hover:underline text-xs capitalize">
							{lesson.title}
						</Link>
					</div>
				))}
			</div>

			{active && (
				<Button
					variant="outline"
					className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-16 py-2 rounded-xs hover:text-whites"
					asChild
				>
					<Link href={unit.path}>Get started</Link>
				</Button>
			)}
		</div>
	)
}
