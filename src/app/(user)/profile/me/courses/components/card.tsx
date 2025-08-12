"use client"

import { BookOpen } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Card as UICard } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ProfileCourse, Unit } from "@/lib/types/domain"
import { cn } from "@/lib/utils"

type CardProps = {
	course: ProfileCourse
	units: Unit[]
	headerMinHeight?: number
	onHeaderResize?: (height: number) => void
}

export function Card({ course, units, headerMinHeight, onHeaderResize }: CardProps) {
	const [isExpanded, setIsExpanded] = React.useState(false)
	const headerRef = React.useRef<HTMLDivElement | null>(null)

	React.useEffect(() => {
		const element = headerRef.current
		if (!element) return
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const height = entry.contentRect.height
				if (onHeaderResize) {
					onHeaderResize(height)
				}
			}
		})
		observer.observe(element)
		return () => {
			observer.disconnect()
		}
	}, [onHeaderResize])

	// CRITICAL: `course.path` and `course.description` are guaranteed to be non-empty strings by the ProfileCourse type.
	// No fallbacks `||` or `??` are needed here.
	const coursePath: string = course.path
	const courseDescription: string = course.description

	// Calculate XP progress
	const earnedXP = course.earnedXP ?? 0
	const totalXP = course.totalXP ?? 0
	const progressPercentage = totalXP > 0 ? (earnedXP / totalXP) * 100 : 0

	return (
		<UICard className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-full">
			<div ref={headerRef} style={{ minHeight: headerMinHeight ? `${headerMinHeight}px` : undefined }}>
				<CardHeader className="p-0 pb-4">
					<CardTitle className="flex items-start justify-between mb-0 gap-3">
						<h2 className="text-lg font-bold text-gray-800 flex-1 min-w-0">{course.title}</h2>
						<Link href={coursePath} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex-shrink-0">
							See all ({units.length})
						</Link>
					</CardTitle>
					{/* Reserve baseline space but allow growth when expanded to push progress down */}
					<CardDescription className="text-gray-600 relative min-h-[72px]">
						{courseDescription !== "" ? (
							<>
								<div className={cn("transition-all duration-200", !isExpanded && "line-clamp-3")}>
									{courseDescription}
								</div>
								{courseDescription.length > 150 && (
									<button
										type="button"
										onClick={() => setIsExpanded(!isExpanded)}
										className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1 focus:outline-none"
									>
										{isExpanded ? "Show less" : "Read more..."}
									</button>
								)}
							</>
						) : (
							<div className="text-gray-500 italic">No description available</div>
						)}
					</CardDescription>
				</CardHeader>
			</div>

			{/* XP Progress Bar - now aligned at same level across all cards */}
			<div className="px-0 pb-4">
				{totalXP > 0 ? (
					<>
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm font-medium text-gray-700">Progress</span>
							<span className="text-sm text-gray-600">
								{earnedXP} / {totalXP} XP
							</span>
						</div>
						<div className="w-full bg-gray-200 rounded-full h-2">
							<div
								className="h-2 rounded-full transition-all duration-300"
								style={{
									width: `${Math.min(progressPercentage, 100)}%`,
									backgroundColor: "#13BF96"
								}}
							/>
						</div>
					</>
				) : (
					// Reserve space even when no XP data to maintain alignment
					<div className="h-[40px]" />
				)}
			</div>

			<CardContent className="p-0 flex-1">
				{units.length > 0 ? (
					<div className="relative">
						{/* vertical connecting line */}
						<div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-300" />

						<div className="space-y-4">
							{units.map((unit: Unit) => {
								// Find proficiency data for this unit
								const proficiencyData = course.unitProficiencies?.find((p) => p.unitId === unit.id)
								const proficiencyPercent = proficiencyData?.proficiencyPercentage ?? 0

								return (
									<div key={unit.id} className="flex items-center space-x-3 relative">
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<div
														className="w-10 h-10 rounded-full flex items-center justify-center relative z-10 flex-shrink-0 cursor-help"
														style={{
															background:
																proficiencyPercent > 0
																	? `linear-gradient(to bottom, #2563EB 0%, #2563EB ${proficiencyPercent}%, #D1D5DB ${proficiencyPercent}%, #D1D5DB 100%)`
																	: "#D1D5DB"
														}}
													>
														<BookOpen className="w-6 h-6 text-white" />
													</div>
												</TooltipTrigger>
												{proficiencyData && proficiencyData.totalExercises > 0 && (
													<TooltipContent>
														<p>
															{proficiencyData.proficientExercises}/{proficiencyData.totalExercises} proficient skills
														</p>
													</TooltipContent>
												)}
											</Tooltip>
										</TooltipProvider>

										<div className="flex-1 min-w-0">
											<Link
												href={unit.path}
												className="text-gray-800 hover:text-blue-600 font-medium text-sm block break-words"
											>
												{unit.title.trim()}
											</Link>
										</div>
									</div>
								)
							})}
						</div>
					</div>
				) : (
					<div className="text-sm text-gray-500">Course content can be viewed by starting.</div>
				)}
			</CardContent>
			<CardFooter className="p-0 pt-4 flex justify-end">
				<Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4" asChild>
					<Link href={coursePath}>Start</Link>
				</Button>
			</CardFooter>
		</UICard>
	)
}
