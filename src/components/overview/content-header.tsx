import * as logger from "@superbuilders/slog"
import { Info } from "lucide-react"
import { ProficiencyIconLegend } from "./proficiency-icons"

export function ContentHeader({ title, points, className }: { title: string; points: number; className?: string }) {
	logger.debug("initializing content header", { title, points })

	return (
		<div id="content-header" className={className}>
			<h1 className="text-3xl font-bold text-gray-800 mb-2 capitalize">{title}</h1>
			<div className="flex items-center space-x-2 text-gray-600">
				<span className="text-sm">{points} possible mastery points</span>
				<Info className="w-4 h-4 bg-gray-200 rounded-full cursor-not-allowed" />
			</div>

			<ProficiencyIconLegend className="p-4 flex-wrap gap-4" label />
		</div>
	)
}
