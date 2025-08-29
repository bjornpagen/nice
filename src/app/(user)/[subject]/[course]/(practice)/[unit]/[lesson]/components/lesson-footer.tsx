"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import { BookCheck, ChevronRight, FileText, PenTool, Play, TestTube } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { trackArticleView } from "@/lib/actions/tracking"
import type { AssessmentProgress } from "@/lib/data/progress"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
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
	progressPromise: Promise<Map<string, AssessmentProgress>>
}

export function LessonFooter({ coursePromise, progressPromise }: LessonFooterProps) {
	const rawPathname = usePathname()
	const pathname = normalizeString(rawPathname)
	const { user } = useUser()
	// Assert on the normalized path to ensure correctness before use.
	assertNoEncodedColons(pathname, "lesson-footer pathname")
	const course = React.use(coursePromise)
	const progressMap = React.use(progressPromise)

	// Get lock status from course-wide context instead of props
	const { resourceLockStatus } = useCourseLockStatus()

	// delay gating for article completion button
	const mountTimeRef = React.useRef<number>(Date.now())
	const [now, setNow] = React.useState<number>(() => Date.now())
	React.useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 250)
		return () => clearInterval(id)
	}, [])

	// reset dwell timer whenever navigating to a new, incomplete article

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

	let currentResourceId: string | undefined
	if (currentMaterial.type === "Lesson") {
		// Find current resource within the lesson
		const currentResourceIndex = currentMaterial.resources.findIndex((resource) => resource.path === pathname)
		const currentResource = currentMaterial.resources[currentResourceIndex]
		currentResourceType = currentResource?.type
		currentResourceId = currentResource?.id

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

	// Use lock status from context to inform UI; video/article progression is unlocked when the server marks completion
	const nextComponentId = nextItem ? nextItem.componentResourceSourcedId : undefined
	const nextLockedByServer = nextComponentId ? resourceLockStatus[nextComponentId] === true : false

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

	// Compute UI state from server progress only. Video completion comes from OneRoster via updateVideoProgress.
	// Articles use an explicit completion button with a minimal dwell requirement.
	const isArticle = currentResourceType === "Article"
	const isServerCompleted = currentResourceId ? Boolean(progressMap.get(currentResourceId)?.completed) : false
	const articleDelayActive = isArticle && !isServerCompleted && now - mountTimeRef.current < 10000
	const countdownSeconds = articleDelayActive ? Math.ceil((10000 - (now - mountTimeRef.current)) / 1000) : 0

	const showDisabled = isArticle ? articleDelayActive : !isServerCompleted
	let disabledReason = ""
	if (!isServerCompleted && !isArticle) {
		if (currentResourceType === "Video") {
			disabledReason = "Finish the video to continue"
		} else {
			disabledReason = "Complete this activity to continue"
		}
	} else if (nextLockedByServer) {
		disabledReason = "Complete the previous activity to unlock next"
	}
	if (isArticle && articleDelayActive) {
		disabledReason = "Please read for 10 seconds to continue"
	}

	let primaryButtonLabel = "Continue"
	if (isArticle) {
		if (isServerCompleted) {
			primaryButtonLabel = "Continue"
		} else if (countdownSeconds > 0) {
			primaryButtonLabel = `Done Reading (${countdownSeconds}s)`
		} else {
			primaryButtonLabel = "Done Reading"
		}
	}
	const shouldNavigate = !showDisabled
	const handlePrimaryClick = () => {
		if (!isArticle) return
		if (!currentResourceId) return

		// derive subject/course from path
		const parts = pathname.split("/").filter(Boolean)
		const subjectSlug = parts[0]
		const courseSlug = parts[1]
		if (!subjectSlug || !courseSlug) return

		// validate user metadata for OneRoster sourced id
		let onerosterUserSourcedId: string | undefined
		if (user?.publicMetadata) {
			const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
			if (parsed.success) {
				onerosterUserSourcedId = parsed.data.sourceId
			}
		}
		if (typeof onerosterUserSourcedId !== "string") return

		const trackNavigationAsync = async () => {
			const result = await errors.try(
				trackArticleView(currentResourceId, {
					subjectSlug,
					courseSlug
				})
			)
			if (result.error) {
				// non-blocking; allow navigation regardless
				return
			}
		}
		void trackNavigationAsync()
	}

	return (
		<div className="bg-white border-t border-gray-200 shadow-lg">
			<div className="max-w-7xl mx-auto px-4 py-2 md:py-2.5">
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
							{showDisabled ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<span className="inline-flex">
											<Button
												className="bg-blue-600 hover:bg-blue-700 text-white"
												disabled
												onClick={handlePrimaryClick}
											>
												<span className="flex items-center">
													{primaryButtonLabel}
													<ChevronRight className="w-4 h-4 ml-1" />
												</span>
											</Button>
										</span>
									</TooltipTrigger>
									<TooltipContent sideOffset={6}>{disabledReason}</TooltipContent>
								</Tooltip>
							) : (
								<Button
									asChild={shouldNavigate}
									className="bg-blue-600 hover:bg-blue-700 text-white"
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
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
