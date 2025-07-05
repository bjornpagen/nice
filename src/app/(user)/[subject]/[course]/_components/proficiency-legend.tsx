import { ProficiencyIcon } from "@/components/icons/proficiency"

export function ProficiencyLegend() {
	return (
		<div className="flex items-center gap-4 mt-4">
			<div className="flex items-center gap-2">
				<ProficiencyIcon variant="mastered" />
				<span className="text-sm text-gray-600">Mastered</span>
			</div>
			<div className="flex items-center gap-2">
				<ProficiencyIcon variant="proficient" />
				<span className="text-sm text-gray-600">Proficient</span>
			</div>
			<div className="flex items-center gap-2">
				<ProficiencyIcon variant="familiar" />
				<span className="text-sm text-gray-600">Familiar</span>
			</div>
			<div className="flex items-center gap-2">
				<ProficiencyIcon variant="attempted" />
				<span className="text-sm text-gray-600">Attempted</span>
			</div>
			<div className="flex items-center gap-2">
				<ProficiencyIcon variant="notStarted" />
				<span className="text-sm text-gray-600">Not started</span>
			</div>
			<div className="flex items-center gap-2">
				<ProficiencyIcon variant="quiz" />
				<span className="text-sm text-gray-600">Quiz</span>
			</div>
			<div className="flex items-center gap-2">
				<ProficiencyIcon variant="unitTest" />
				<span className="text-sm text-gray-600">Unit test</span>
			</div>
		</div>
	)
}
