import { BookOpen } from "lucide-react"
import Link from "next/link"
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
	return (
		<Card className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-full">
			<CardHeader className="pb-4">
				<CardTitle className="flex items-center justify-between mb-0">
					<h2 className="text-lg font-bold text-gray-800">{course.title}</h2>
					<Link href={course.path} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
						See all ({units.length})
					</Link>
				</CardTitle>
				<CardDescription className="text-gray-600">{course.description}</CardDescription>
			</CardHeader>
			<CardContent className="pt-0 flex-1">
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
									<BookOpen className="w-6 h-6, text-white" />
								</div>

								<Button
									variant="link"
									className="text-left p-0 h-auto font-medium text-gray-800 hover:text-blue-600 break-words"
									asChild
								>
									<Link href={unit.path}>{unit.title.trim()}</Link>
								</Button>
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
