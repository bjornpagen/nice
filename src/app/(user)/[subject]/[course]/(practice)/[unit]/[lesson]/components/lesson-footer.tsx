"use client"

import { BookCheck, ChevronRight, FileText, PenTool, Play, TestTube } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"
import { Button } from "@/components/ui/button"
import type { Course as CourseV2 } from "@/lib/types/sidebar"
import { getCourseMaterials } from "@/lib/types/sidebar"
import { assertNoEncodedColons } from "@/lib/utils"

interface LessonFooterProps {
	coursePromise: Promise<CourseV2 | undefined>
}

export function LessonFooter({ coursePromise }: LessonFooterProps) {
	const pathname = usePathname()
	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(pathname, "lesson-footer pathname")
	const course = React.use(coursePromise)

	if (!course) {
		return null
	}

	// Use the same approach as course-sidebar.tsx for consistency
	const materials = getCourseMaterials(course)

	// Find the current material (lesson or assessment) first
	const currentMaterialIndex = materials.findIndex((material) => {
		if (material.type === "Lesson") {
			// For lessons, check if any resource matches the current pathname exactly
			return material.resources.some((resource) => resource.path === pathname)
		}
		// For unit-level resources (Quiz, UnitTest, CourseChallenge), use exact path match
		return material.path === pathname
	})

	if (currentMaterialIndex === -1) {
		return null // Current page not found in materials
	}

	const currentMaterial = materials[currentMaterialIndex]
	if (!currentMaterial) {
		return null
	}

	// Now find the next navigable item
	let nextItem = null

	if (currentMaterial.type === "Lesson") {
		// Find current resource within the lesson
		const currentResourceIndex = currentMaterial.resources.findIndex((resource) => resource.path === pathname)

		if (currentResourceIndex >= 0 && currentResourceIndex < currentMaterial.resources.length - 1) {
			// Next resource in same lesson
			nextItem = currentMaterial.resources[currentResourceIndex + 1]
		} else {
			// Look for next material (could be another lesson or assessment)
			const nextMaterial = materials[currentMaterialIndex + 1]
			if (nextMaterial) {
				if (nextMaterial.type === "Lesson" && nextMaterial.resources.length > 0) {
					nextItem = nextMaterial.resources[0] // First resource of next lesson
				} else {
					nextItem = nextMaterial // Next assessment
				}
			}
		}
	} else {
		// Current is an assessment (Quiz, UnitTest, CourseChallenge), look for next material
		const nextMaterial = materials[currentMaterialIndex + 1]
		if (nextMaterial) {
			if (nextMaterial.type === "Lesson" && nextMaterial.resources.length > 0) {
				nextItem = nextMaterial.resources[0] // First resource of next lesson
			} else {
				nextItem = nextMaterial // Next assessment
			}
		}
	}

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
