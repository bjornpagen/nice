"use client"

import { ChevronRight, FileText, PenTool, Play } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { LessonChild } from "@/lib/types"

interface LessonNextProps {
	lessonChildren: LessonChild[]
}

export function LessonNext({ lessonChildren }: LessonNextProps) {
	const pathname = usePathname()

	// Find the current item and next item
	const currentIndex = lessonChildren.findIndex((child) => {
		// Extract the content path from the full pathname
		// e.g., "/physics/physics-1/forces/lesson-1/a/article-1" -> "/physics/physics-1/forces/lesson-1/a/article-1"
		return pathname.includes(child.path)
	})

	// Get the next item
	const nextItem =
		currentIndex >= 0 && currentIndex < lessonChildren.length - 1 ? lessonChildren[currentIndex + 1] : null

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
