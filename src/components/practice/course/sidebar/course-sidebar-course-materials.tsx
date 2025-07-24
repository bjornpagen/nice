import Image from "next/image"
import Link from "next/link"
import React from "react"
import { ActivityIcon } from "@/components/icons/activity"
import { ProficiencyIcon } from "@/components/overview/proficiency-icons"
import type { AssessmentProgress } from "@/lib/data/progress"
import { cn } from "@/lib/utils"
import type { CourseMaterial, LessonResource } from "@/lib/v2/types"
import courseChallengeIllustration from "./images/course-challenge-sidebar-illustration.png"
import quizIllustration from "./images/quiz-sidebar-illustration.png"
import unitTestIllustration from "./images/unit-test-sidebar-illustration.png"

// Helper function to get proficiency text, adapted from legacy LessonChildTab
function getProficiencyText(proficiency: "attempted" | "familiar" | "proficient" | "mastered"): string {
	switch (proficiency) {
		case "attempted":
			return "Attempted"
		case "familiar":
			return "Familiar"
		case "proficient":
			return "Proficient"
		case "mastered":
			return "Mastered"
	}
}

export function CourseSidebarCourseMaterials({
	index,
	materials,
	pathname,
	progressMap
}: {
	index: number
	materials: CourseMaterial[]
	pathname: string
	progressMap: Map<string, AssessmentProgress>
}) {
	const material = materials[index]
	if (material == null) {
		return undefined
	}

	return (
		<div id="course-sidebar-course-materials" className="transition-all">
			<div className="flex flex-col divide-y divide-gray-200">
				<MaterialItem material={material} pathname={pathname} progressMap={progressMap} />
			</div>
		</div>
	)
}

function MaterialItem({
	material,
	pathname,
	progressMap
}: {
	material: CourseMaterial
	pathname: string
	progressMap: Map<string, AssessmentProgress>
}) {
	const renderStatusText = (progress: AssessmentProgress | undefined, type: string) => {
		if (type !== "Exercise" && type !== "Quiz" && type !== "UnitTest" && type !== "CourseChallenge") {
			return null
		}

		if (progress?.completed && progress?.proficiency && progress.score !== undefined) {
			return (
				<span className="text-xs text-gray-600">
					{getProficiencyText(progress.proficiency)} • {Math.round(progress.score * 100)}%
				</span>
			)
		}

		return <span className="text-xs text-gray-500">Not started</span>
	}

	switch (material.type) {
		case "Lesson":
			return (
				<React.Fragment>
					{material.resources.map((resource) => {
						const progress = progressMap.get(resource.id)
						return (
							<Link key={resource.path} href={resource.path}>
								<div
									className={cn(
										"flex items-center gap-4 py-4 px-4 hover:bg-blue-100",
										pathname === resource.path && "bg-blue-100 border-l-4 border-l-blue-600"
									)}
								>
									<ResourceItemIcon resource={resource} progress={progress} />
									<div className="flex flex-col">
										<span className={cn("text-sm text-gray-800", pathname === resource.path && "text-blue-800")}>
											{resource.title}
										</span>
										{renderStatusText(progress, resource.type)}
									</div>
								</div>
							</Link>
						)
					})}
				</React.Fragment>
			)
		case "Quiz":
		case "UnitTest":
		case "CourseChallenge": {
			const progress = progressMap.get(material.id)

			// Get the appropriate illustration based on material type
			let illustration: typeof quizIllustration
			if (material.type === "Quiz") {
				illustration = quizIllustration
			} else if (material.type === "UnitTest") {
				illustration = unitTestIllustration
			} else {
				illustration = courseChallengeIllustration
			}

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
								{renderStatusText(progress, material.type)}
							</div>
						</div>
					</Link>
					<Image
						src={illustration}
						alt={`${material.type} illustration`}
						width={400}
						height={400}
						className="w-full aspect-[4/3] object-cover"
					/>
				</React.Fragment>
			)
		}
		default:
			return undefined
	}
}

function ResourceItemIcon({
	resource,
	progress
}: {
	resource: LessonResource
	progress: AssessmentProgress | undefined
}) {
	// Create variant mapping without type assertion
	let variant: "article" | "exercise" | "video"
	if (resource.type === "Article") {
		variant = "article"
	} else if (resource.type === "Exercise") {
		variant = "exercise"
	} else {
		variant = "video"
	}

	// Only show proficiency icon for exercises that are completed AND have proficiency
	const showProficiencyIcon = variant === "exercise" && progress?.completed && progress?.proficiency

	if (showProficiencyIcon && progress?.proficiency) {
		return <ProficiencyIcon variant={progress.proficiency} size={6} />
	}

	// For all other cases (articles, videos, or exercises without completion/proficiency), use ActivityIcon
	return (
		<ActivityIcon variant={variant} className="w-6 h-6" completed={progress?.completed} progress={progress?.score} />
	)
}
