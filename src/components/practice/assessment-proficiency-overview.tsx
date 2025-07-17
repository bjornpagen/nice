"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
import * as React from "react"
import { ProficiencyIcon, type proficiencyIconVariants } from "@/components/icons/proficiency"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import type { UnitChild } from "@/lib/types/domain"
import { cn } from "@/lib/utils"

type ProficiencyStatus = keyof typeof proficiencyIconVariants

interface AssessmentProficiencyOverviewProps {
	currentAssessmentId: string
	unitChildren: UnitChild[]
	courseUnits?: {
		unitName: string
		unitChildren: UnitChild[]
	}[]
	completedQuestions?: number
	totalQuestions?: number
	className?: string
}

export function AssessmentProficiencyOverview({
	currentAssessmentId,
	unitChildren,
	courseUnits,
	completedQuestions = 0,
	totalQuestions = 0,
	className
}: AssessmentProficiencyOverviewProps) {
	const [isOpen, setIsOpen] = React.useState(false)

	// Calculate progress for current assessment
	const currentProgress = totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0

	// Generate proficiency items for a unit
	const getProficiencyItems = (children: UnitChild[], currentId?: string) => {
		return children.flatMap((child): Array<{ id: string; variant: ProficiencyStatus; type: string }> => {
			if (child.type === "Lesson") {
				return child.children
					.filter((c) => c.type === "Exercise")
					.map((exercise) => ({
						id: exercise.id,
						variant: exercise.id === currentId ? "attempted" : "notStarted",
						type: "Exercise"
					}))
			}

			if (child.type === "Quiz") {
				return [
					{
						id: child.id,
						variant: child.id === currentId ? "attempted" : "quiz",
						type: "Quiz"
					}
				]
			}

			if (child.type === "UnitTest") {
				return [
					{
						id: child.id,
						variant: child.id === currentId ? "attempted" : "unitTest",
						type: "UnitTest"
					}
				]
			}

			return []
		})
	}

	const unitItems = getProficiencyItems(unitChildren, currentAssessmentId)

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={cn(
						"flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors",
						className
					)}
				>
					<span>Progress: {currentProgress}%</span>
					{isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
				{/* Current Unit Progress */}
				<div className="px-4 py-3">
					<h3 className="text-sm font-semibold text-gray-900 mb-2">Current Unit Progress</h3>
					<div className="flex items-center gap-1 flex-wrap">
						{unitItems.map((item) => (
							<div key={item.id} className="relative group">
								<ProficiencyIcon variant={item.variant} />
								{item.id === currentAssessmentId && (
									<div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
								)}
								<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
									{item.type}
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Course Progress (if provided) */}
				{courseUnits && courseUnits.length > 0 && (
					<>
						<DropdownMenuSeparator />
						<div className="px-4 py-3">
							<h3 className="text-sm font-semibold text-gray-900 mb-2">Course Progress</h3>
							<div className="space-y-3">
								{courseUnits.map((unit, index) => {
									const items = getProficiencyItems(unit.unitChildren)
									return (
										<div key={index}>
											<h4 className="text-xs font-medium text-gray-600 mb-1">{unit.unitName}</h4>
											<div className="flex items-center gap-1 flex-wrap">
												{items.map((item) => (
													<ProficiencyIcon key={item.id} variant={item.variant} />
												))}
											</div>
										</div>
									)
								})}
							</div>
						</div>
					</>
				)}

				{/* Current Assessment Stats */}
				{totalQuestions > 0 && (
					<>
						<DropdownMenuSeparator />
						<div className="px-4 py-3 bg-gray-50">
							<div className="text-sm">
								<div className="flex justify-between mb-1">
									<span className="text-gray-600">Current Assessment</span>
									<span className="font-medium">{currentProgress}%</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Questions Completed</span>
									<span className="font-medium">
										{completedQuestions} / {totalQuestions}
									</span>
								</div>
							</div>
						</div>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
