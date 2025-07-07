import { ProficiencyIcon, type proficiencyIconVariants } from "@/components/icons/proficiency"

type ProficiencyItem = {
	id: string
	variant: keyof typeof proficiencyIconVariants
}

type MinimalUnitChild = {
	id: string
	type: "Lesson" | "Quiz" | "UnitTest"
}

export function ProficiencyProgress({ unitChildren }: { unitChildren: MinimalUnitChild[] }) {
	const items: ProficiencyItem[] = unitChildren.flatMap((child): ProficiencyItem[] => {
		if (child.type === "Lesson") {
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
			{items.map((item) => (
				<div key={item.id} className="flex items-center gap-1">
					<ProficiencyIcon variant={item.variant} />
				</div>
			))}
		</div>
	)
}
