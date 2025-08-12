import { Lock } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import React from "react"
import { ActivityIcon } from "@/components/icons/activity"
import { ProficiencyIcon } from "@/components/overview/proficiency-icons"
import courseChallengeIllustration from "@/components/practice/course/sidebar/images/course-challenge-sidebar-illustration.png"
import quizIllustration from "@/components/practice/course/sidebar/images/quiz-sidebar-illustration.png"
import unitTestIllustration from "@/components/practice/course/sidebar/images/unit-test-sidebar-illustration.png"
import { useLessonProgress } from "@/components/practice/lesson-progress-context"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { CourseMaterial, LessonResource } from "@/lib/types/sidebar"
import { cn } from "@/lib/utils"

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

export function Materials({
	index,
	materials,
	pathname,
	progressMap,
	resourceLockStatus
}: {
	index: number
	materials: CourseMaterial[]
	pathname: string
	progressMap: Map<string, AssessmentProgress>
	resourceLockStatus: Record<string, boolean>
}) {
	const material = materials[index]
	if (material == null) {
		return undefined
	}

	return (
		<div id="course-sidebar-course-materials" className="transition-all">
			<div className="flex flex-col divide-y divide-gray-200">
				<MaterialItem
					material={material}
					pathname={pathname}
					progressMap={progressMap}
					resourceLockStatus={resourceLockStatus}
				/>
			</div>
		</div>
	)
}

function MaterialItem({
	material,
	pathname,
	progressMap,
	resourceLockStatus
}: {
	material: CourseMaterial
	pathname: string
	progressMap: Map<string, AssessmentProgress>
	resourceLockStatus: Record<string, boolean>
}) {
	const { updatingResourceIds } = useLessonProgress()
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
						const isLocked = resourceLockStatus[resource.id] === true

						if (isLocked) {
							return (
								<div key={resource.path} className="flex items-center gap-4 py-4 px-4 bg-gray-50 cursor-not-allowed">
									<Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
									<div className="flex flex-col">
										<span className="text-sm text-gray-400">{resource.title}</span>
									</div>
								</div>
							)
						}

						const isUpdating = updatingResourceIds.has(resource.id)
						return (
							<Link key={resource.path} href={resource.path}>
								<div
									className={cn(
										"flex items-center gap-4 py-4 px-4 hover:bg-blue-100",
										pathname === resource.path && "bg-blue-100 border-l-4 border-l-blue-600"
									)}
								>
									<ResourceItemIcon resource={resource} progress={progress} isUpdating={isUpdating} />
									<div className="flex flex-col">
										<span className={cn("text-sm text-gray-800", pathname === resource.path && "text-blue-800")}>
											{resource.title}
										</span>
										{isUpdating ? (
											<span className="text-xs text-gray-500">updating...</span>
										) : (
											renderStatusText(progress, resource.type)
										)}
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
			const isLocked = resourceLockStatus[material.id] === true

			// Get the appropriate illustration based on material type
			let illustration: typeof quizIllustration
			if (material.type === "Quiz") {
				illustration = quizIllustration
			} else if (material.type === "UnitTest") {
				illustration = unitTestIllustration
			} else {
				illustration = courseChallengeIllustration
			}

			if (isLocked) {
				return (
					<React.Fragment>
						<div className="flex items-center gap-4 py-4 px-4 bg-gray-50 cursor-not-allowed">
							<Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
							<div className="flex flex-col">
								<span className="text-sm text-gray-400">{material.title}</span>
							</div>
						</div>
						<div className="relative">
							<Image
								src={illustration}
								alt={`${material.type} illustration`}
								width={400}
								height={400}
								className="w-full aspect-[4/3] object-cover opacity-50"
							/>
							<div className="absolute inset-0 flex items-center justify-center">
								<Lock className="w-12 h-12 text-gray-400" />
							</div>
						</div>
					</React.Fragment>
				)
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
	progress,
	isUpdating
}: {
	resource: LessonResource
	progress: AssessmentProgress | undefined
	isUpdating: boolean
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

	if (isUpdating) {
		return <div className="w-6 h-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
	}

	if (showProficiencyIcon && progress?.proficiency) {
		return <ProficiencyIcon variant={progress.proficiency} size={6} />
	}

	// For all other cases (articles, videos, or exercises without completion/proficiency), use ActivityIcon
	return (
		<ActivityIcon variant={variant} className="w-6 h-6" completed={progress?.completed} progress={progress?.score} />
	)
}
