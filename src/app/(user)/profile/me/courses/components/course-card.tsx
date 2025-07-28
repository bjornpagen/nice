"use client"

import { BookOpen } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProfileCourse, Unit } from "@/lib/types/domain"
import { cn } from "@/lib/utils"

type CourseCardProps = {
	course: ProfileCourse
	units: Unit[]
	color: string
}

export function CourseCard({ course, units, color }: CourseCardProps) {
	const [isExpanded, setIsExpanded] = React.useState(false)

	// CRITICAL: `course.path` and `course.description` are guaranteed to be non-empty strings by the ProfileCourse type.
	// No fallbacks `||` or `??` are needed here.
	const coursePath: string = course.path
	const courseDescription: string = course.description

	// Calculate XP progress
	const earnedXP = course.earnedXP ?? 0
	const totalXP = course.totalXP ?? 0
	const progressPercentage = totalXP > 0 ? (earnedXP / totalXP) * 100 : 0

	return (
		<Card className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-full">
			<CardHeader className="p-0 pb-4">
				<CardTitle className="flex items-start justify-between mb-0 gap-3">
					<h2 className="text-lg font-bold text-gray-800 flex-1 min-w-0">{course.title}</h2>
					<Link href={coursePath} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex-shrink-0">
						See all ({units.length})
					</Link>
				</CardTitle>
				<CardDescription className="text-gray-600 relative">
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

			{/* XP Progress Bar */}
			{totalXP > 0 && (
				<div className="px-0 pb-4">
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
				</div>
			)}

			<CardContent className="p-0 flex-1">
				{units.length > 0 ? (
					<div className="relative">
						{/* vertical connecting line */}
						<div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-300" />

						<div className="space-y-4">
							{units.slice(0, 5).map((unit: Unit) => (
								<div key={unit.id} className="flex items-center space-x-3 relative">
									{/* circular icon background */}
									<div
										className={cn(
											"w-10 h-10 rounded-full flex items-center justify-center relative z-10 flex-shrink-0",
											color
										)}
									>
										<BookOpen className="w-6 h-6 text-white" />
									</div>

									<div className="flex-1 min-w-0">
										<Link
											href={unit.path}
											className="text-gray-800 hover:text-blue-600 font-medium text-sm block break-words"
										>
											{unit.title.trim()}
										</Link>
									</div>
								</div>
							))}
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
		</Card>
	)
}
