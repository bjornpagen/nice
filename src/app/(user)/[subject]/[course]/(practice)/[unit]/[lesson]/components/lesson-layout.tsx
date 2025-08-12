"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import * as React from "react"
import { LessonFooter } from "@/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/components/lesson-footer"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { Sidebar } from "@/components/practice/course/sidebar/sidebar"
import { PracticeCourseProvider } from "@/components/practice/course-context"
import { LessonProgressProvider } from "@/components/practice/lesson-progress-context"
import { LockOverlay } from "@/components/practice/lock-overlay"
import { Button } from "@/components/ui/button"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { LessonLayoutData } from "@/lib/types/page"
import type { Course as CourseV2 } from "@/lib/types/sidebar"
import { getCourseMaterials } from "@/lib/types/sidebar"
import { assertNoEncodedColons, normalizeString } from "@/lib/utils"

export function LessonLayout({
	dataPromise,
	progressPromise,
	coursePromise,
	children
}: {
	dataPromise: Promise<LessonLayoutData>
	progressPromise: Promise<Map<string, AssessmentProgress>>
	coursePromise: Promise<CourseV2 | undefined>
	children: React.ReactNode
}) {
	React.use(dataPromise)
	// Now we pass progressPromise to the sidebar instead of consuming it here

	const rawPathname = usePathname()
	const pathname = normalizeString(rawPathname)
	assertNoEncodedColons(pathname, "lesson-layout pathname")
	const [isCollapsed, setIsCollapsed] = React.useState(false)
	const [isMobile, setIsMobile] = React.useState<boolean>(false)

	// collapse sidebar and hide toggle on small screens (<= md)
	React.useEffect(() => {
		const mq = window.matchMedia("(max-width: 767px)")
		const update = () => {
			const mobile = mq.matches
			setIsMobile(mobile)
			setIsCollapsed(mobile ? true : false)
		}
		update()
		mq.addEventListener("change", update)
		return () => mq.removeEventListener("change", update)
	}, [])

	// Determine lock state for the current route using course + resourceLockStatus
	const course = React.use(coursePromise)
	const { resourceLockStatus } = useCourseLockStatus()
	let isLocked = false
	let isArticleOrVideo = false
	if (course) {
		const materials = getCourseMaterials(course)
		const currentMaterialIndex = materials.findIndex((material) => {
			if (material.type === "Lesson") {
				return material.resources.some((resource) => resource.path === pathname)
			}
			return material.path === pathname
		})
		if (currentMaterialIndex !== -1) {
			const currentMaterial = materials[currentMaterialIndex]
			if (currentMaterial?.type === "Lesson") {
				const currentResource = currentMaterial.resources.find((r) => r.path === pathname)
				const currentResourceId = currentResource?.id
				const t1 = currentResource?.type
				isArticleOrVideo = t1 === "Article" || t1 === "Video"
				if (currentResourceId) {
					isLocked = resourceLockStatus[currentResourceId] === true
				}
			} else if (currentMaterial) {
				const currentResourceId = currentMaterial.id
				// Non-lesson materials are assessments (Quiz, UnitTest, CourseChallenge)
				// These pages handle their own top-offset overlays via AssessmentStartScreen
				isArticleOrVideo = false
				if (currentResourceId) {
					isLocked = resourceLockStatus[currentResourceId] === true
				}
			}
		}
	}

	// Don't show Next on exercise, quiz, unit test, or course challenge pages
	const isExercisePage = pathname.includes("/e/")
	const isQuizPage = pathname.includes("/quiz/")
	const isUnitTestPage = pathname.includes("/test/")
	const isCourseChallengePage = pathname.includes("/test/") && !pathname.includes("/lesson/")

	const shouldShowNext = !isExercisePage && !isQuizPage && !isUnitTestPage && !isCourseChallengePage

	const toggleSidebar = () => setIsCollapsed(!isCollapsed)

	return (
		<LessonProgressProvider>
			<PracticeCourseProvider coursePromise={coursePromise}>
				<div className="flex h-full">
					{/* Wrap Sidebar in a flex container to match legacy layout behavior */}
					<div
						className="w-0 md:w-[var(--sidebar-width)] flex-shrink-0 md:bg-gray-50 md:border-r border-none h-full sidebar-container overflow-hidden md:overflow-visible"
						data-collapsed={isCollapsed}
					>
						<Sidebar
							coursePromise={coursePromise}
							progressPromise={progressPromise}
							className="h-full bg-transparent border-none"
						/>
					</div>

					{/* Main area with flex column layout */}
					<div className="flex-1 flex flex-col relative">
						{/* Sidebar toggle button - hidden on small screens */}
						{!isMobile && (
							<Button
								onClick={toggleSidebar}
								variant="ghost"
								size="icon"
								className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow-md z-10 rounded-l-none rounded-r-md hover:cursor-pointer size-7 border border-l-0"
							>
								{isCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
								<span className="sr-only">Toggle Sidebar</span>
							</Button>
						)}

						{/* Content area */}
						<div className="flex-1 overflow-y-auto bg-gray-50">{children}</div>

						{/* Conditionally render LessonFooter */}
						{shouldShowNext && <LessonFooter coursePromise={coursePromise} progressPromise={progressPromise} />}

						{/* Lock overlay at layout level to cover content + footer, not the in-content header */}
						{isLocked && isArticleOrVideo && (
							<div className="absolute top-[4rem] bottom-0 left-0 right-0 z-[999]">
								<LockOverlay message="This content is locked until you complete the earlier activities." />
							</div>
						)}
					</div>
				</div>
			</PracticeCourseProvider>
		</LessonProgressProvider>
	)
}
