import Image from "next/image"
import Link from "next/link"
import React from "react"
import { LearningContentIcon } from "@/components/overview/learning-content-icons"
import { cn } from "@/lib/utils"
import type { CourseMaterial, LessonResource } from "@/lib/v2/types"
import courseChallengeIllustration from "./images/course-challenge-sidebar-illustration.png"
import quizIllustration from "./images/quiz-sidebar-illustration.png"
import unitTestIllustration from "./images/unit-test-sidebar-illustration.png"

export function CourseSidebarCourseMaterials({
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
		<div id="course-sidebar-course-materials" className="transition-all">
			<div className="flex flex-col divide-y divide-gray-200">
				<MaterialItem material={material} pathname={pathname} />
			</div>
		</div>
	)
}

function MaterialItem({ material, pathname }: { material: CourseMaterial; pathname: string }) {
	switch (material.type) {
		case "Lesson":
			return (
				<React.Fragment>
					{material.resources.map((resource) => (
						<Link key={resource.path} href={resource.path}>
							<div
								className={cn(
									"flex items-center gap-4 py-4 px-4 hover:bg-blue-100",
									pathname === resource.path && "bg-blue-100 border-l-4 border-l-blue-600"
								)}
							>
								<ResourceItemIcon key={resource.path} resource={resource} pathname={pathname} />
								<div className="flex flex-col">
									<span className={cn("text-sm text-gray-800", pathname === resource.path && "text-blue-800")}>
										{resource.title}
									</span>
									{resource.type === "Exercise" && <span className="text-xs text-gray-500">Not started</span>}
								</div>
							</div>
						</Link>
					))}
				</React.Fragment>
			)
		case "Quiz":
			return (
				<React.Fragment>
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
					<Image
						src={quizIllustration}
						alt="Quiz illustration"
						width={400}
						height={400}
						className="w-full aspect-square object-contain"
					/>
				</React.Fragment>
			)
		case "UnitTest":
			return (
				<React.Fragment>
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
					<Image
						src={unitTestIllustration}
						alt="Unit test illustration"
						width={400}
						height={400}
						className="w-full aspect-square object-contain"
					/>
				</React.Fragment>
			)
		case "CourseChallenge":
			return (
				<React.Fragment>
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
					<Image
						src={courseChallengeIllustration}
						alt="Course challenge illustration"
						width={400}
						height={400}
						className="w-full aspect-square object-contain"
					/>
				</React.Fragment>
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
