import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import React from "react"
import { Button } from "@/components/ui/button"
import type { Course, CourseMaterial } from "@/lib/types/sidebar"
import { cn } from "@/lib/utils"

export function Carousel({
	course,
	materials,
	index,
	setIndex,
	className
}: {
	course: Pick<Course, "path" | "title">
	materials: CourseMaterial[]
	index: number
	setIndex: (index: number) => void
	className?: string
}) {
	const material = materials[index]
	if (material == null) {
		logger.error("course sidebar course carousel: material is null", { course, materials })
		throw errors.new("course sidebar course carousel: material is null")
	}
	logger.debug("course sidebar course carousel: material", { course, material })

	const unit = material.meta && "unit" in material.meta ? material.meta.unit : undefined
	logger.debug("course sidebar course carousel: unit", { course, unit })

	const handlePrev = () => {
		setIndex(index - 1 < 0 ? materials.length - 1 : index - 1)
	}
	const handleNext = () => {
		setIndex(index + 1 >= materials.length ? 0 : index + 1)
	}

	return (
		<div id="course-sidebar-course-carousel" className={cn("flex flex-row items-center justify-center", className)}>
			<div id="course-sidebar-course-carousel-prev" className="flex-shrink-0">
				<Button
					variant="link"
					className={cn("pl-1 text-blue-600 w-2 h-2", index === 0 && "opacity-50 cursor-not-allowed")}
					onClick={handlePrev}
					disabled={index === 0}
				>
					<ChevronLeft className="w-5 h-5" />
				</Button>
			</div>

			<div id="course-sidebar-course-carousel-content" className="flex-1 text-center">
				<div className="flex items-center justify-center">
					<Link
						href={course.path}
						className="text-blue-600 hover:underline font-medium text-[10px] whitespace-nowrap uppercase"
					>
						Course: {course.title}
					</Link>
					{unit != null && (
						<React.Fragment>
							<span className="text-gray-600 text-[10px] font-bold flex-shrink-0 mx-1">{">"}</span>
							<Link
								href={unit.path}
								className="text-blue-600 hover:underline font-medium text-[10px] whitespace-nowrap uppercase"
							>
								Unit {unit.index + 1}
							</Link>
						</React.Fragment>
					)}
				</div>
				<div className="text-sm text-gray-800 font-medium">{material.title}</div>
			</div>

			<div id="course-sidebar-course-carousel-next" className="flex-shrink-0">
				<Button
					variant="link"
					className={cn(
						"pl-1 text-blue-600 w-2 h-2",
						index === materials.length - 1 && "opacity-50 cursor-not-allowed"
					)}
					onClick={handleNext}
					disabled={index === materials.length - 1}
				>
					<ChevronRight className="w-5 h-5" />
				</Button>
			</div>
		</div>
	)
}
