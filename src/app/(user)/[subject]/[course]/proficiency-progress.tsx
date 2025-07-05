import { ProficiencyIcon, type proficiencyIconVariants } from "@/components/icons/proficiency"
import type { Lesson, Quiz, UnitTest } from "./[unit]/page"

type ProficiencyItem = {
	id: string
	variant: keyof typeof proficiencyIconVariants
}

type UnitChild = Lesson | Quiz | UnitTest

export function ProficiencyProgress({ unitChildren }: { unitChildren: UnitChild[] }) {
	const items: ProficiencyItem[] = unitChildren.flatMap((child) => {
		if (child.type === "Lesson") {
			// For lessons, map over the now-hydrated exercises array
			return child.exercises.map(
				(exercise): ProficiencyItem => ({
					id: exercise.id,
					variant: "notStarted"
				})
			)
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

	return (
		<div className="flex items-center gap-1 mt-4">
			{items.map((item) => (
				<div key={item.id} className="flex items-center gap-1">
					<ProficiencyIcon variant={item.variant} />
				</div>
			))}
		</div>
	)
}
