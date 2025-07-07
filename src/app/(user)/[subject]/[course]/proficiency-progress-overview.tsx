import { Sparkles } from "lucide-react"
import type { UnitChild } from "./page"
import { ProficiencyProgress } from "./proficiency-progress"

export function ProficiencyProgressOverview({
	index,
	unitChildren,
	next = false
}: {
	index: number
	unitChildren: UnitChild[]
	next?: boolean
}) {
	return (
		<div className="bg-gray-50 py-3 px-6">
			{next ? (
				<>
					<div className="flex items-center gap-4 mb-2">
						<h3 className="text-sm font-semibold text-gray-900 w-16">Unit {index + 1}</h3>
						<div className="flex items-center gap-1">
							<Sparkles className="w-4 h-4 text-gray-500" />
							<span className="text-xs font-medium text-gray-500 uppercase tracking-wide">UP NEXT FOR YOU!</span>
						</div>
					</div>
					<div className="ml-20">
						<ProficiencyProgress unitChildren={unitChildren} />
					</div>
				</>
			) : (
				<div className="flex items-center gap-4">
					<h3 className="text-sm font-semibold text-gray-900 w-16">Unit {index + 1}</h3>
					<ProficiencyProgress unitChildren={unitChildren} />
				</div>
			)}
		</div>
	)
}
