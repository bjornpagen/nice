"use client"

import * as errors from "@superbuilders/errors"
import Image from "next/image"
import Link from "next/link"
import { notFound, usePathname } from "next/navigation"
import * as React from "react"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { Breadcrumbs } from "@/components/practice/course/sidebar/breadcrumbs"
import { Carousel } from "@/components/practice/course/sidebar/carousel"
import courseIconForeground from "@/components/practice/course/sidebar/images/7a86b575f4360619-course-icon.svg"
import courseIconBackground from "@/components/practice/course/sidebar/images/course-accordion-bg.png"
import { Materials } from "@/components/practice/course/sidebar/materials"
import { useLessonProgress } from "@/components/practice/lesson-progress-context"
import { ScrollArea } from "@/components/ui/scroll-area"
// import { useSidebar } from "@/components/ui/sidebar" // Removed for relative positioning layout
import type { AssessmentProgress } from "@/lib/data/progress"
import { type Course, getCourseMaterials } from "@/lib/types/sidebar"
import { assertNoEncodedColons, cn, normalizeString } from "@/lib/utils"

export function Sidebar({
	coursePromise,
	progressPromise,
	className
}: {
	coursePromise: Promise<Course | undefined>
	progressPromise: Promise<Map<string, AssessmentProgress>>
	className?: string
}) {
	const rawPathname = usePathname()
	const pathname = normalizeString(rawPathname)
	// Assert on the normalized path to ensure correctness.
	assertNoEncodedColons(pathname, "sidebar pathname")
	// Removed useSidebar() dependency for relative positioning layout

	const course = React.use(coursePromise)
	const baseProgressMap = React.use(progressPromise)
	const { progressOverrides } = useLessonProgress()
	const progressMap = (() => {
		const merged = new Map(baseProgressMap)
		for (const [key, value] of progressOverrides.entries()) {
			merged.set(key, value)
		}
		return merged
	})()

	// Get lock status from course-wide context instead of props
	const { resourceLockStatus } = useCourseLockStatus()
	if (course == null) {
		notFound()
	}

	const materials = getCourseMaterials(course)
	if (materials.length === 0) {
		throw errors.new(`course sidebar: no content found for course: ${course.title}`)
	}

	const cursor = (() => {
		if (course == null) {
			return -1
		}
		return materials.findIndex((material) => {
			if (material.type === "Lesson") {
				// For lessons, check if any resource matches the current pathname exactly
				return material.resources.some((resource) => resource.path === pathname)
			}

			// For unit-level resources (Quiz, UnitTest, CourseChallenge), use exact path match
			return material.path === pathname
		})
	})()

	if (cursor === -1) {
		throw errors.new(`course sidebar: material not found: ${pathname}`)
	}

	const material = materials[cursor]
	if (material == null) {
		throw errors.new(`course sidebar: material not found: ${pathname}`)
	}

	const [index, setIndex] = React.useState<number>(Math.max(0, Math.min(cursor, materials.length - 1)))

	return (
		<div id="course-sidebar" className={cn("bg-transparent h-full overflow-hidden", className)}>
			{/* Add padding and white background container to match legacy styling */}
			<div className="p-5 h-full flex flex-col">
				{/* White content card with proper borders */}
				<div className="bg-white border border-gray-200 rounded-lg max-h-full flex flex-col">
					{/* FIXED HEADER SECTION - Course title and carousel */}
					<div className="flex-shrink-0 px-6 pt-4 pb-0">
						<Link href={course.path} className="block">
							<div
								id="course-sidebar-course-title"
								className="text-lg font-bold mb-4 hover:opacity-80 transition-opacity"
							>
								<div className="flex items-center gap-4">
									<div className="w-10 h-10 rounded flex items-center justify-center relative">
										<Image
											src={courseIconBackground}
											alt="Course icon background"
											fill
											className="object-cover rounded"
										/>
										<Image
											src={courseIconForeground}
											alt="Course icon foreground"
											className="w-6 h-6 relative z-10 brightness-0 invert"
										/>
									</div>

									<span className="font-medium text-gray-900 text-xl capitalize">{course.title}</span>
								</div>
							</div>
						</Link>

						{/* Separator */}
						<div className="h-px my-4 bg-gray-200" />

						<div className="mt-4">
							<Carousel
								course={course}
								materials={materials}
								index={index}
								setIndex={setIndex}
								resourceLockStatus={resourceLockStatus}
							/>
						</div>

						{/* Separator */}
						<div className="h-px mt-4 mb-0 bg-gray-200" />
					</div>

					{/* SCROLLABLE CONTENT SECTION - Materials, breadcrumbs, footer */}
					<div className="flex-1 overflow-hidden">
						<ScrollArea className="h-full bg-white border-none">
							<div className="px-6 pb-4">
								<Materials
									index={index}
									materials={materials}
									pathname={pathname}
									progressMap={progressMap}
									resourceLockStatus={resourceLockStatus}
								/>

								{/* Separator */}
								<div className="h-px my-4 bg-gray-200" />

								<Breadcrumbs
									course={{ path: course.path, title: course.title }}
									material={material}
									pathname={pathname}
								/>

								<div id="course-sidebar-footer" className="p-2 my-4 flex flex-col gap-2 text-center">
									<div className="text-xs text-gray-600">© 2025 Nice Academy</div>
									<div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 justify-center">
										<span className="hover:text-gray-700 underline cursor-not-allowed whitespace-nowrap">
											Terms of use
										</span>
										<span className="hover:text-gray-700 underline cursor-not-allowed whitespace-nowrap">
											Privacy Policy
										</span>
										<span className="hover:text-gray-700 underline cursor-not-allowed whitespace-nowrap">
											Cookie Notice
										</span>
										<span className="hover:text-gray-700 underline cursor-not-allowed whitespace-nowrap">
											Accessibility Statement
										</span>
									</div>
								</div>
							</div>
						</ScrollArea>
					</div>
				</div>
			</div>
		</div>
	)
}
