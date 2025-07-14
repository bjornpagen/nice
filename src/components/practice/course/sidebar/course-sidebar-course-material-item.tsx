import Link from "next/link"
import React from "react"
import { LearningContentIcon } from "@/components/overview/learning-content-icons"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { CourseMaterial, LessonResource } from "@/lib/v2/types"

export function CourseSidebarCourseMaterialItem({
	index,
	materials,
	pathname
}: {
	index: number
	materials: CourseMaterial[]
	pathname: string
}) {
	const material = materials[index]
	if (material == null) {
		return undefined
	}

	return (
		<div id="course-sidebar-course-materials transition-all">
			<ScrollArea className="h-full">
				<div className="flex flex-col divide-y divide-gray-200">
					<MaterialItem material={material} pathname={pathname} />
				</div>
			</ScrollArea>
		</div>
	)
}

function MaterialItem({ material, pathname }: { material: CourseMaterial; pathname: string }) {
	switch (material.type) {
		case "Lesson":
			return (
				<React.Fragment>
					{material.resources.map((resource) => (
						<div
							key={resource.path}
							className={cn(
								"flex items-center gap-4 py-4 px-4 hover:bg-blue-100",
								pathname === resource.path && "bg-blue-100 border-l-4 border-l-blue-600"
							)}
						>
							<ResourceItemIcon key={resource.path} resource={resource} pathname={pathname} />
							<div className="flex flex-col">
								<Link
									href={resource.path}
									className={cn("text-sm text-gray-800", pathname === resource.path && "text-blue-800")}
								>
									{resource.title}
								</Link>
								{resource.type === "Exercise" && <span className="text-xs text-gray-500">Not started</span>}
							</div>
						</div>
					))}
				</React.Fragment>
			)
		case "Quiz":
		case "UnitTest":
		case "CourseChallenge":
			return (
				<Link href={material.path}>
					<div
						className={cn(
							"flex items-center gap-4 py-4 px-4 hover:bg-blue-100",
							pathname === material.path && "bg-blue-100 border-l-4 border-l-blue-600"
						)}
					>
						<div className="flex flex-col">
							<span className={cn("text-sm text-gray-800", pathname === material.path && "text-blue-800")}>
								{material.title}
							</span>
							<span className="text-xs text-gray-500">Not started</span>
						</div>
					</div>
				</Link>
			)
		default:
			return undefined
	}
}

function ResourceItemIcon({ resource, pathname }: { resource: LessonResource; pathname: string }) {
	switch (resource.type) {
		case "Article":
			return <LearningContentIcon variant="article" className={cn(pathname === resource.path && "bg-blue-100")} />
		case "Exercise":
			return <LearningContentIcon variant="exercise" className={cn(pathname === resource.path && "bg-blue-100")} />
		case "Video":
			return <LearningContentIcon variant="video" className={cn(pathname === resource.path && "bg-blue-100")} />
		default:
			return undefined
	}
}
