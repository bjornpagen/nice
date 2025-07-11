"use client"

import { BookOpen } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Course, Unit } from "./page"

type CourseCardProps = {
	course: Course
	units: Unit[]
	color?: string
}

export function CourseCard({ course, units, color = "bg-gray-200" }: CourseCardProps) {
	const [isExpanded, setIsExpanded] = React.useState(false)

	// Use the OneRoster course metadata path first, fallback to generated path
	const coursePath =
		course.coursePath ||
		(course.subject && course.courseSlug
			? `/${course.subject}/${course.courseSlug}`
			: `/courses/${course.course.sourcedId}`)

	// Helper function to extract metadata value
	const getMetadataValue = (metadata: Record<string, unknown> | undefined, key: string): string | undefined => {
		if (!metadata) return undefined
		const value = metadata[key]
		return typeof value === "string" ? value : undefined
	}

	// Use description or khanDescription from metadata, with fallback
	const courseDescription =
		getMetadataValue(course.metadata, "description") ||
		getMetadataValue(course.metadata, "khanDescription") ||
		course.courseDescription ||
		`${course.title} - ${course.classType} class`

	return (
		<Card className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-full">
			<CardHeader className="pb-4">
				<CardTitle className="flex items-start justify-between mb-0 gap-3">
					<h2 className="text-lg font-bold text-gray-800 flex-1 min-w-0">{course.title}</h2>
					<Link href={coursePath} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex-shrink-0">
						See all ({units.length})
					</Link>
				</CardTitle>
				<CardDescription className="text-gray-600 relative">
					<div className={cn("transition-all duration-200", !isExpanded && "line-clamp-3")}>{courseDescription}</div>
					{courseDescription && courseDescription.length > 150 && (
						<button
							type="button"
							onClick={() => setIsExpanded(!isExpanded)}
							className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1 focus:outline-none"
						>
							{isExpanded ? "Show less" : "Read more..."}
						</button>
					)}
				</CardDescription>
			</CardHeader>
			<CardContent className="pt-0 flex-1">
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
			<CardFooter className="flex justify-end">
				<Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4" asChild>
					<Link href={coursePath}>Start</Link>
				</Button>
			</CardFooter>
		</Card>
	)
}
