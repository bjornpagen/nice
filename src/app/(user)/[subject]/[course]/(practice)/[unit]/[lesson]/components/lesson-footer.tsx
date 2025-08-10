"use client"

import { BookCheck, ChevronRight, FileText, PenTool, Play, TestTube } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"
import { useLessonProgress } from "@/components/practice/lesson-progress-context"
import { Button } from "@/components/ui/button"
import type {
	CourseResourceMaterial,
	CourseUnitMaterial,
	Course as CourseV2,
	LessonResource
} from "@/lib/types/sidebar"
import { getCourseMaterials } from "@/lib/types/sidebar"
import { assertNoEncodedColons, normalizeString } from "@/lib/utils"

interface LessonFooterProps {
	coursePromise: Promise<CourseV2 | undefined>
	resourceLockStatusPromise?: Promise<Record<string, boolean>>
}

export function LessonFooter({ coursePromise, resourceLockStatusPromise }: LessonFooterProps) {
	const rawPathname = usePathname()
	const pathname = normalizeString(rawPathname)
	// Assert on the normalized path to ensure correctness before use.
	assertNoEncodedColons(pathname, "lesson-footer pathname")
	const course = React.use(coursePromise)
	const { isCurrentResourceCompleted, setCurrentResourceCompleted } = useLessonProgress()

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

	// Identify the current resource and find the next navigable item
	let nextItem: LessonResource | CourseUnitMaterial | CourseResourceMaterial | null = null
	let currentResourceType: "Video" | "Article" | "Exercise" | "Quiz" | "UnitTest" | "CourseChallenge" | undefined

	if (currentMaterial.type === "Lesson") {
		// Find current resource within the lesson
		const currentResourceIndex = currentMaterial.resources.findIndex((resource) => resource.path === pathname)
		const currentResource = currentMaterial.resources[currentResourceIndex]
		currentResourceType = currentResource?.type

		if (currentResourceIndex >= 0 && currentResourceIndex < currentMaterial.resources.length - 1) {
			// Next resource in same lesson
			nextItem = currentMaterial.resources[currentResourceIndex + 1] ?? null
		} else {
			// Look for next material (could be another lesson or assessment)
			const nextMaterial = materials[currentMaterialIndex + 1]
			if (nextMaterial) {
				if (nextMaterial.type === "Lesson" && nextMaterial.resources.length > 0) {
					nextItem = nextMaterial.resources[0] ?? null // First resource of next lesson
				} else if (nextMaterial.type !== "Lesson") {
					nextItem = nextMaterial // Next assessment (Quiz, UnitTest, CourseChallenge)
				}
			}
		}
	} else {
		// Current is an assessment (Quiz, UnitTest, CourseChallenge), look for next material
		const nextMaterial = materials[currentMaterialIndex + 1]
		if (nextMaterial) {
			if (nextMaterial.type === "Lesson" && nextMaterial.resources.length > 0) {
				nextItem = nextMaterial.resources[0] ?? null // First resource of next lesson
			} else if (nextMaterial.type !== "Lesson") {
				nextItem = nextMaterial // Next assessment
			}
		}
	}

	// Don't show if there's no next item
	if (!nextItem) {
		return null
	}

	// If lock status is available, use it to inform UI, but do not block progression locally
	// once the current resource has been completed in this session (article/video cases).
	const resourceLockStatus = React.use(resourceLockStatusPromise ?? Promise.resolve<Record<string, boolean>>({}))
	const nextLockedByServer = resourceLockStatus ? resourceLockStatus[nextItem.id] === true : false

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

	// Compute UI state messaging and optional action for incomplete states
	// Allow progression immediately after local completion for articles/videos,
	// even if the server-side lock map hasn't reflected it yet.
	const isArticle = currentResourceType === "Article"
	const showDisabled = isArticle ? false : !isCurrentResourceCompleted
	let disabledReason = ""
	if (!isCurrentResourceCompleted) {
		if (currentResourceType === "Video") {
			disabledReason = "Finish the video to continue"
		} else if (currentResourceType === "Article") {
			disabledReason = "Mark this article as read to continue"
		} else {
			disabledReason = "Complete this activity to continue"
		}
	} else if (nextLockedByServer) {
		disabledReason = "Complete the previous activity to unlock next"
	}

	const primaryButtonLabel = isArticle ? "Done Reading" : "Continue"
	const shouldNavigate = isArticle ? isCurrentResourceCompleted : !showDisabled
	const handlePrimaryClick = () => {
		if (isArticle && !isCurrentResourceCompleted) {
			setCurrentResourceCompleted(true)
		}
	}

	return (
		<div className="bg-white border-t border-gray-200 shadow-lg">
			<div className="max-w-7xl mx-auto px-4 py-3">
				<div className="flex items-center justify-between gap-4">
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

					<div className="flex items-center gap-3">
						<div className="flex flex-col items-end">
							<Button
								asChild={shouldNavigate}
								className="bg-blue-600 hover:bg-blue-700 text-white"
								disabled={!isArticle && showDisabled}
								onClick={handlePrimaryClick}
							>
								{shouldNavigate ? (
									<Link href={nextItem.path}>
										{primaryButtonLabel}
										<ChevronRight className="w-4 h-4 ml-1" />
									</Link>
								) : (
									<span className="flex items-center">
										{primaryButtonLabel}
										<ChevronRight className="w-4 h-4 ml-1" />
									</span>
								)}
							</Button>
							{!isArticle && showDisabled && <span className="mt-1 text-xs text-gray-500">{disabledReason}</span>}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
