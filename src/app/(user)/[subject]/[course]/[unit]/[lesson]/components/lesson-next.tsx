"use client"

import { BookCheck, ChevronRight, FileText, PenTool, Play, TestTube } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { Unit } from "@/lib/types/domain"

interface LessonNextProps {
	unitData: Unit
}

export function LessonNext({ unitData }: LessonNextProps) {
	const pathname = usePathname()

	// Create a flattened, ordered list of all navigable content items in the unit
	// This includes items within lessons (articles, videos, exercises) and
	// unit-level items like quizzes and unit tests
	const allUnitItems: Array<{ id: string; path: string; type: string; title: string }> = []

	for (const unitChild of unitData.children) {
		if (unitChild.type === "Lesson") {
			// Add all children of the lesson to the list
			for (const lessonChild of unitChild.children) {
				allUnitItems.push({
					id: lessonChild.id,
					path: lessonChild.path,
					type: lessonChild.type,
					title: lessonChild.title
				})
			}
		} else if (unitChild.type === "Quiz" || unitChild.type === "UnitTest") {
			// Add the quiz or unit test itself to the list
			allUnitItems.push({
				id: unitChild.id,
				path: unitChild.path,
				type: unitChild.type,
				title: unitChild.title
			})
		}
	}

	// Find the current item and next item
	const currentIndex = allUnitItems.findIndex((item) => {
		// Use exact match instead of includes to prevent substring matches
		return pathname === item.path
	})

	// Get the next item
	const nextItem = currentIndex >= 0 && currentIndex < allUnitItems.length - 1 ? allUnitItems[currentIndex + 1] : null

	// Don't show if there's no next item
	if (!nextItem) {
		return null
	}

	const getIcon = (type: string) => {
		switch (type) {
			case "Video":
				return <Play className="w-4 h-4" />
			case "Article":
				return <FileText className="w-4 h-4" />
			case "Exercise":
				return <PenTool className="w-4 h-4" />
			case "Quiz":
				return <BookCheck className="w-4 h-4" />
			case "UnitTest":
				return <TestTube className="w-4 h-4" />
			default:
				return <ChevronRight className="w-4 h-4" />
		}
	}

	const getTypeLabel = (type: string) => {
		switch (type) {
			case "Video":
				return "Video"
			case "Article":
				return "Article"
			case "Exercise":
				return "Exercise"
			case "Quiz":
				return "Quiz"
			case "UnitTest":
				return "Unit Test"
			default:
				return "Content"
		}
	}

	return (
		<div className="bg-white border-t border-gray-200 shadow-lg">
			<div className="max-w-7xl mx-auto px-4 py-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<div className="text-sm text-gray-600 font-medium">Up next:</div>
						<div className="flex items-center space-x-2">
							{getIcon(nextItem.type)}
							<div className="flex flex-col">
								<div className="text-xs text-gray-500 uppercase tracking-wide">{getTypeLabel(nextItem.type)}</div>
								<div className="text-sm font-medium text-gray-900">{nextItem.title}</div>
							</div>
						</div>
					</div>

					<Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
						<Link href={nextItem.path}>
							Continue
							<ChevronRight className="w-4 h-4 ml-1" />
						</Link>
					</Button>
				</div>
			</div>
		</div>
	)
}
