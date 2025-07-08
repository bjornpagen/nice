import { ProficiencyIcon, type proficiencyIconVariants } from "@/components/icons/proficiency"
import type { UnitChild } from "./[unit]/page"

type ProficiencyItem = {
	id: string
	variant: keyof typeof proficiencyIconVariants
}

export function ProficiencyProgress({ unitChildren }: { unitChildren: UnitChild[] }) {
	const items: ProficiencyItem[] = unitChildren.flatMap((child): ProficiencyItem[] => {
		if (child.type === "Lesson" && child.exercises != null && child.exercises.length > 0) {
			return child.exercises.map((exercise) => ({
				id: exercise.id,
				variant: "notStarted"
			}))
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
