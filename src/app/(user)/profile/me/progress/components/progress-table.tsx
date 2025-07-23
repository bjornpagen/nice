"use client"

import * as React from "react"
import { ActivityIcon } from "@/components/icons/activity"
import { Button } from "@/components/ui/button"

export type Activity = {
	icon: string
	title: string
	subject: string
	date: string
	level: "Proficient" | "Familiar" | "Attempted" | "–"
	problems: string
	time: string
	xp?: number // Add optional xp field
}

export type ProgressTableProps = {
	activities: Activity[]
}

export function ProgressTable({ activities }: ProgressTableProps) {
	const [currentPage, setCurrentPage] = React.useState(1)
	const itemsPerPage = 10

	const totalPages = Math.ceil(activities.length / itemsPerPage)
	const startIndex = (currentPage - 1) * itemsPerPage
	const endIndex = startIndex + itemsPerPage
	const currentActivities = activities.slice(startIndex, endIndex)

	const handlePrevious = () => {
		setCurrentPage((prev) => Math.max(prev - 1, 1))
	}

	const handleNext = () => {
		setCurrentPage((prev) => Math.min(prev + 1, totalPages))
	}

	function getLevelColor(level: string): string {
		if (level === "Proficient") return "text-blue-600 bg-blue-50"
		if (level === "Familiar") return "text-green-600 bg-green-50"
		if (level === "Attempted") return "text-orange-600 bg-orange-50"
		return "text-gray-400 bg-gray-50"
	}

	function getActivityVariant(icon: string): "video" | "article" | "exercise" {
		// Handle both new format (direct strings) and legacy format (emojis)
		if (icon === "video" || icon === "▶️") return "video"
		if (icon === "article" || icon === "📄") return "article"
		if (icon === "exercise" || icon === "✏️") return "exercise"
		return "exercise" // Default fallback
	}

	return (
		<div className="space-y-4">
			{/* Mobile/Tablet Card View */}
			<div className="block lg:hidden space-y-3">
				{currentActivities.map((activity, index) => (
					<div
						key={`${activity.title}-${activity.date}-${index}`}
						className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
					>
						<div className="flex items-start space-x-3">
							<ActivityIcon variant={getActivityVariant(activity.icon)} className="w-8 h-8 flex-shrink-0 mt-1" />
							<div className="flex-1 min-w-0">
								<div className="flex flex-col space-y-2">
									<div>
										<h3 className="font-medium text-gray-900 text-sm leading-tight">{activity.title}</h3>
										<p className="text-sm text-gray-500 mt-1">{activity.subject}</p>
									</div>
									<div className="flex flex-wrap items-center gap-2 text-xs">
										<span className="text-gray-600">{activity.date}</span>
										{activity.level !== "–" && (
											<span
												className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(activity.level)}`}
											>
												{activity.level}
											</span>
										)}
										{activity.problems !== "–" && (
											<span className="text-gray-600">
												<span className="font-medium">{activity.problems}</span> problems
											</span>
										)}
										<span className="text-gray-600">
											<span className="font-medium">{activity.time}</span> min
										</span>
										{activity.xp !== undefined && (
											<span className="text-green-600 font-medium">
												{activity.xp > 0 ? `+${activity.xp} XP` : `${activity.xp} XP`}
											</span>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Desktop Table View */}
			<div className="hidden lg:block">
				<div className="bg-gray-50 border border-gray-200 rounded-t-lg">
					<div className="grid grid-cols-14 gap-4 px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
						<div className="col-span-5">Activity</div>
						<div className="col-span-2">Date</div>
						<div className="col-span-2">Level</div>
						<div className="col-span-2 text-center">Problems</div>
						<div className="col-span-1 text-center">Time</div>
						<div className="col-span-2 text-right">XP</div>
					</div>
				</div>
				<div className="border border-t-0 border-gray-200 rounded-b-lg bg-white">
					{currentActivities.map((activity, index) => (
						<div
							key={`${activity.title}-${activity.date}-${index}`}
							className="grid grid-cols-14 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
						>
							<div className="col-span-5">
								<div className="flex items-start space-x-3">
									<ActivityIcon variant={getActivityVariant(activity.icon)} className="w-6 h-6 flex-shrink-0 mt-0.5" />
									<div className="min-w-0 flex-1">
										<div className="font-medium text-gray-900 text-sm leading-tight break-words">{activity.title}</div>
										<div className="text-sm text-gray-500 mt-1 break-words">{activity.subject}</div>
									</div>
								</div>
							</div>
							<div className="col-span-2 text-sm text-gray-600 self-start pt-0.5">
								<div className="break-words leading-tight">{activity.date}</div>
							</div>
							<div className="col-span-2 self-start pt-0.5">
								{activity.level !== "–" ? (
									<span
										className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(activity.level)}`}
									>
										{activity.level}
									</span>
								) : (
									<span className="text-gray-400 text-sm">–</span>
								)}
							</div>
							<div className="col-span-2 text-sm text-gray-600 text-center self-start pt-0.5">{activity.problems}</div>
							<div className="col-span-1 text-sm text-gray-600 text-center self-start pt-0.5">{activity.time}</div>
							<div className="col-span-2 text-sm font-medium text-right self-start pt-0.5">
								{activity.xp !== undefined ? (
									<span className={activity.xp > 0 ? "text-green-600" : "text-red-600"}>
										{activity.xp > 0 ? `+${activity.xp}` : activity.xp} XP
									</span>
								) : (
									<span className="text-gray-400">–</span>
								)}
							</div>
						</div>
					))}
					{currentActivities.length === 0 && (
						<div className="text-center py-12 text-gray-500">
							<h3 className="text-lg font-semibold">No activities found</h3>
							<p className="text-sm mt-1">Complete some lessons, and your progress will show up here!</p>
						</div>
					)}
				</div>
			</div>

			{/* Pagination Controls */}
			{totalPages > 1 && (
				<div className="flex flex-col sm:flex-row items-center justify-between pt-4 space-y-3 sm:space-y-0">
					<div className="flex items-center space-x-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handlePrevious}
							disabled={currentPage === 1}
							className="text-gray-600 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleNext}
							disabled={currentPage === totalPages}
							className="text-gray-600 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Next
						</Button>
					</div>
					<div className="text-sm text-gray-500 text-center sm:text-right">
						Page {currentPage} of {totalPages} • Showing {currentActivities.length} of {activities.length} activities
					</div>
				</div>
			)}
		</div>
	)
}
