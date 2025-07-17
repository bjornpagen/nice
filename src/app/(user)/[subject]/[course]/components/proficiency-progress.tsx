import { ProficiencyIcon, type proficiencyIconVariants } from "@/components/icons/proficiency"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { UnitChild } from "@/lib/types/domain"

type ProficiencyItem = {
	id: string
	variant: keyof typeof proficiencyIconVariants
}

export function ProficiencyProgress({
	unitChildren,
	progressMap
}: {
	unitChildren: UnitChild[]
	progressMap: Map<string, AssessmentProgress>
}) {
	const items: ProficiencyItem[] = unitChildren.flatMap((child): ProficiencyItem[] => {
		if (child.type === "Lesson") {
			return child.children
				.filter((c) => c.type === "Exercise")
				.map((exercise) => {
					const progress = progressMap.get(exercise.id)
					// Use proficiency level if completed, otherwise not started
					const variant = progress?.completed && progress?.proficiency ? progress.proficiency : "notStarted"

					return {
						id: exercise.id,
						variant
					}
				})
		}

		if (child.type === "Quiz") {
			return [
				{
					id: child.id,
					variant: "quiz"
				}
			]
		}

		if (child.type === "UnitTest") {
			return [
				{
					id: child.id,
					variant: "unitTest"
				}
			]
		}

		return []
	})

	if (items.length === 0) {
		return null
	}

	return (
		<div className="flex items-center gap-1 flex-wrap max-w-full overflow-hidden">
			{items.map((item) => (
				<div key={item.id} className="flex items-center gap-1 flex-shrink-0">
					<ProficiencyIcon variant={item.variant} />
				</div>
			))}
		</div>
	)
}
