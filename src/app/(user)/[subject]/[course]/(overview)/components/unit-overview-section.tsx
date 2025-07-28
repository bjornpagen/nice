import { BookOpen, Info } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { UnitProficiency } from "@/lib/data/progress"
import type { Lesson, Unit } from "@/lib/types/domain"

export function UnitOverviewSection({
	unit,
	index,
	next = false,
	unitProficiency
}: {
	unit: Unit
	index: number
	next: boolean
	unitProficiency?: UnitProficiency
}) {
	// Extract videos from lessons within the unit
	const videos = unit.children
		.filter((child): child is Lesson => child.type === "Lesson")
		.flatMap((lesson) =>
			lesson.children.filter((c) => c.type === "Video").map((video) => ({ ...video, lessonId: lesson.id }))
		)

	// Get the proficiency percentage, defaulting to 0% if no data available
	const masteryPercentage = unitProficiency?.proficiencyPercentage ?? 0

	return (
		<div
			className={`bg-white border border-gray-200 rounded-xs p-4 mb-2 ${next ? "border-t-4 border-t-blue-500" : ""}`}
		>
			<div className="flex items-center mb-2">
				<div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
					<BookOpen className="w-5 h-5 text-white" />
				</div>
				<div className="ml-3">
					{next && <div className="text-blue-500 text-xs font-small">Up next for you:</div>}
					<h2 className="font-semibold text-gray-900 text-base text-sm">
						Unit {index + 1}: {unit.title}
					</h2>
				</div>
				<div className="ml-auto text-right flex items-center gap-2">
					<div className="text-xs text-gray-600">Unit mastery: {masteryPercentage}%</div>
					<Info className="w-4 h-4 text-gray-500 cursor-not-allowed" />
				</div>
			</div>

			<div className="border-b border-gray-200 mb-3" />

			<div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4">
				{videos.map((video) => (
					<div key={`${video.lessonId}-${video.id}`}>
						<Link href={video.path} className="text-gray-600 hover:text-gray-800 hover:underline text-xs">
							{video.title}
						</Link>
					</div>
				))}
			</div>

			{next && (
				<Button className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-16 py-2 rounded-xs">Get started</Button>
			)}
		</div>
	)
}
