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

	return (
		<Card className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-full">
			<CardHeader className="pb-4">
				<CardTitle className="flex items-center justify-between mb-0">
					<h2 className="text-lg font-bold text-gray-800">{course.title}</h2>
					<Link href={course.path} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
						See all ({units.length})
					</Link>
				</CardTitle>
				<CardDescription className="text-gray-600 relative">
					<div className={cn("transition-all duration-200", !isExpanded && "line-clamp-3")}>{course.description}</div>
					{course.description && course.description.length > 150 && (
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
				<div className="relative">
					{/* vertical connecting line */}
					<div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-300" />

					<div className="space-y-4">
						{units.slice(0, 5).map((unit: Unit) => (
							<div key={unit.id} className="flex items-start space-x-3 relative">
								{/* circular icon background */}
								<div
									className={cn(
										"w-10 h-10 rounded-full flex items-center justify-center relative z-10 flex-shrink-0 mt-0.5",
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
			</CardContent>
			<CardFooter className="flex justify-end">
				<Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4" asChild>
					<Link href={course.path}>Start</Link>
				</Button>
			</CardFooter>
		</Card>
	)
}
