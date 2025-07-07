import { ProficiencyIcon, type proficiencyIconVariants } from "@/components/icons/proficiency"
import type { UnitChild } from "./page"

type ProficiencyItem = {
	id: string
	variant: keyof typeof proficiencyIconVariants
}

export function ProficiencyProgress({ unitChildren }: { unitChildren: UnitChild[] }) {
	const items: ProficiencyItem[] = unitChildren.flatMap((child): ProficiencyItem[] => {
		if (child.type === "Lesson") {
			// For lessons, we'll show one icon per lesson for now
			// In the future, this could be expanded to show exercises within lessons
			return [
				{
					id: child.id,
					variant: "notStarted"
				}
			]
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
		<div className="flex items-center gap-1 mt-4">
			<span className="text-xs text-gray-500 mr-2">Progress:</span>
			{items.map((item) => (
				<div key={item.id} className="flex items-center gap-1">
					<ProficiencyIcon variant={item.variant} />
				</div>
			))}
		</div>
	)
}
