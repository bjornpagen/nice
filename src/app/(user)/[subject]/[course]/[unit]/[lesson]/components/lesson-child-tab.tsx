"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ActivityIcon } from "@/components/icons/activity"
import { ProficiencyIcon } from "@/components/icons/proficiency"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { LessonChild } from "@/lib/types/domain"

function getVariant(child: Pick<LessonChild, "type">) {
	switch (child.type) {
		case "Exercise":
			return "exercise"
		case "Video":
			return "video"
		case "Article":
			return "article"
		default:
			return "exercise"
	}
}

function getProficiencyText(proficiency: "attempted" | "familiar" | "proficient"): string {
	switch (proficiency) {
		case "attempted":
			return "Attempted"
		case "familiar":
			return "Familiar"
		case "proficient":
			return "Proficient"
	}
}

export function LessonChildTab({ child, progress }: { child: LessonChild; progress?: AssessmentProgress }) {
	const variant = getVariant(child)
	const pathname = usePathname()
	const isActive = pathname === child.path

	// For assessments (exercises), show proficiency icon if completed
	// Note: Quizzes and Tests are not LessonChild types, they are UnitChild types
	const showProficiencyIcon = variant === "exercise" && progress?.completed && progress?.proficiency

	// For non-assessments (articles, videos), use regular activity icon
	const icon =
		showProficiencyIcon && progress?.proficiency ? (
			<ProficiencyIcon variant={progress.proficiency} className="w-6 h-6" />
		) : (
			<ActivityIcon
				variant={variant}
				color={isActive ? "bg-blue-100" : undefined}
				className="w-6 h-6"
				completed={progress?.completed}
				progress={progress?.score}
			/>
		)

	const content = (
		<Link href={child.path} className="w-full flex items-center gap-3">
			<div className="flex-shrink-0">{icon}</div>
			<div className="flex flex-col min-w-0 flex-1">
				<p className={`text-base ${isActive ? "text-blue-800" : "text-gray-800"}`}>{child.title}</p>
				{/* Show proficiency status for assessments */}
				{showProficiencyIcon && progress?.proficiency && progress?.score !== undefined && (
					<p className="text-xs text-gray-600">
						{getProficiencyText(progress.proficiency)} • {Math.round(progress.score * 100)}%
					</p>
				)}
				{/* Show "Not started" for unstarted exercises */}
				{variant === "exercise" && !progress?.completed && <p className="text-xs text-gray-500">Not started</p>}
			</div>
		</Link>
	)

	if (isActive) {
		return (
			<div className="bg-blue-100 border border-blue-200 border-l-4 border-l-blue-600 px-4 py-6 shadow-sm">
				{content}
			</div>
		)
	}

	return (
		<div className="px-4 py-6 border-t border-b border-gray-200 hover:bg-white hover:shadow-sm transition-all">
			{content}
		</div>
	)
}
