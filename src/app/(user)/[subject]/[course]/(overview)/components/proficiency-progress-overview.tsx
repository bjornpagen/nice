import { Sparkles } from "lucide-react"
import Link from "next/link"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { UnitChild } from "@/lib/types/domain"
import { cn } from "@/lib/utils"
import { ProficiencyProgress } from "./proficiency-progress"

export function ProficiencyProgressOverview({
	index,
	unitChildren,
	path,
	next = false,
	progressMap
}: {
	index: number
	unitChildren: UnitChild[]
	path: string
	next?: boolean
	progressMap: Map<string, AssessmentProgress>
}) {
	return (
		<div className={cn("py-3 px-6", next ? "bg-blue-100" : "bg-gray-50")}>
			{next ? (
				<>
					<div className="flex items-center gap-4 mb-2">
						<h3 className="text-sm font-semibold text-gray-900 w-16">
							<Link href={path} className="hover:underline">
								Unit {index + 1}
							</Link>
						</h3>
						<div className="flex items-center gap-1">
							<Sparkles className="w-4 h-4 text-gray-500" />
							<span className="text-xs font-medium text-gray-500 uppercase tracking-wide">UP NEXT FOR YOU!</span>
						</div>
					</div>
					<div className="ml-20">
						<ProficiencyProgress unitChildren={unitChildren} progressMap={progressMap} />
					</div>
				</>
			) : (
				<div className="flex items-center gap-4">
					<h3 className="text-sm font-semibold text-gray-900 w-16">
						<Link href={path} className="hover:underline">
							Unit {index + 1}
						</Link>
					</h3>
					<ProficiencyProgress unitChildren={unitChildren} progressMap={progressMap} />
				</div>
			)}
		</div>
	)
}
