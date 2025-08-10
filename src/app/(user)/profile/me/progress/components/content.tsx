"use client"

import * as React from "react"
import { XPExplainerDialog } from "@/components/dialogs/xp-explainer-dialog"
import type { ProgressPageData } from "@/lib/data/progress"
import { Table } from "./table"

export function Content({ progressPromise }: { progressPromise: Promise<ProgressPageData> }) {
	const { activities, exerciseMinutes, totalLearningMinutes, totalXpEarned } = React.use(progressPromise)

	return (
		<React.Fragment>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-gray-800">My progress</h1>

				<div className="flex items-center space-x-6">
					<span className="text-sm flex items-center gap-2">
						<span className="font-bold text-xl text-green-600">{totalXpEarned}</span> XP earned
						<XPExplainerDialog triggerVariant="icon" />
					</span>
					<span className="text-sm">
						<span className="font-bold text-xl">{exerciseMinutes}</span> exercise minutes
					</span>
					<span className="text-sm">
						<span className="font-bold text-xl">{totalLearningMinutes}</span> total learning minutes
					</span>
				</div>
			</div>

			<div className="bg-white rounded-lg border border-gray-200">
				{activities.length > 0 ? (
					<Table activities={activities} />
				) : (
					<div className="text-center p-12 text-gray-500">
						<h2 className="text-xl font-semibold">No activity yet</h2>
						<p>Complete some lessons, and your progress will show up here!</p>
					</div>
				)}
			</div>
		</React.Fragment>
	)
}
