import Link from "next/link"
import { ProficiencyIcon, type ProficiencyIconVariant } from "@/components/overview/proficiency-icons"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { LessonChild, UnitChild } from "@/lib/types/domain"

type ProficiencyItem = {
	id: string
	variant: ProficiencyIconVariant
	path: string
	title: string
	type: "Exercise" | "Quiz" | "UnitTest"
}

function getProficiencyText(resourceType: ProficiencyItem["type"]) {
	switch (resourceType) {
		case "Exercise":
			return "Exercise"
		case "Quiz":
			return "Quiz"
		case "UnitTest":
			return "Unit Test"
	}
}

export function Progress({
	unitChildren,
	progressMap,
	resourceLockStatus // Add new prop
}: {
	unitChildren: UnitChild[]
	progressMap: Map<string, AssessmentProgress>
	resourceLockStatus: Record<string, boolean> // Add new prop
}) {
	const items: ProficiencyItem[] = unitChildren.flatMap((child): ProficiencyItem[] => {
		if (child.type === "Lesson") {
			return child.children
				.filter((c): c is Extract<LessonChild, { type: "Exercise" }> => c.type === "Exercise")
				.map((exercise) => {
					const progress = progressMap.get(exercise.id)
					const variant = progress?.completed && progress?.proficiency ? progress.proficiency : "not-started"

					return {
						id: exercise.id,
						variant,
						path: exercise.path,
						title: exercise.title,
						type: "Exercise"
					}
				})
		}

		if (child.type === "Quiz") {
			return [
				{
					id: child.id,
					variant: "quiz",
					path: child.path,
					title: child.title,
					type: "Quiz"
				}
			]
		}

		if (child.type === "UnitTest") {
			return [
				{
					id: child.id,
					variant: "unit-test",
					path: child.path,
					title: child.title,
					type: "UnitTest"
				}
			]
		}

		return []
	})

	if (items.length === 0) {
		return null
	}

	return (
		<div className="flex items-center gap-1 flex-wrap max-w-full overflow-visible">
			{items.map((item) => {
				const isLocked = resourceLockStatus[item.id] === true
				const content = (
					<ProficiencyIcon variant={item.variant} isLocked={isLocked}>
						<h2 className="text-md font-bold text-gray-800 capitalize">
							{getProficiencyText(item.type)}: {item.title}
						</h2>
						<p className="text-sm text-gray-500">
							{isLocked ? "Complete the previous activity to unlock." : "Click to start this activity."}
						</p>
					</ProficiencyIcon>
				)

				if (isLocked) {
					return (
						<div key={item.id} className="inline-flex items-center flex-shrink-0 cursor-not-allowed">
							{content}
						</div>
					)
				}

				return (
					<Link key={item.id} href={item.path} className="inline-flex items-center flex-shrink-0">
						{content}
					</Link>
				)
			})}
		</div>
	)
}
