import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { Sparkles } from "lucide-react"
import Link from "next/link"
import { ProficiencyIcon } from "@/components/overview/proficiency-icons"
import { cn } from "@/lib/utils"
import type { Course, LessonResource, UnitResource } from "@/lib/v2/types"

export function CourseContentUnitProficiencyItem({
	index,
	unit,
	className,
	active = false
}: {
	index: number
	unit: Course["units"][number]
	className?: string
	active?: boolean
}) {
	logger.debug("initializing course content unit proficiency item", {
		unit: _.omit(unit, "lessons"),
		lessons: unit.lessons.length,
		index,
		active
	})

	const materials = [
		...unit.lessons.flatMap((lesson) => lesson.resources).filter((resource) => resource.type === "Exercise"),
		...unit.resources
	]
	logger.debug("materials", { materials: materials.length })

	return (
		<div className={cn(className, active ? "bg-blue-100" : "bg-gray-50")}>
			<div className={cn("flex items-center gap-4", active && "mb-2")}>
				<h3 className="text-sm font-semibold text-gray-900 w-16">
					<Link href={unit.path} className="hover:underline">
						Unit {index + 1}
					</Link>
				</h3>
				{active && (
					<div className="flex items-center gap-1">
						<Sparkles className="w-4 h-4 text-gray-500" />
						<span className="text-xs font-medium text-gray-500 uppercase tracking-wide">UP NEXT FOR YOU!</span>
					</div>
				)}
				{!active && (
					<div className="flex items-center gap-2">
						{materials.map((material) => (
							<MaterialProficiencyIcon key={material.slug} material={material} active={false} />
						))}
					</div>
				)}
			</div>
			{active && (
				<div className="ml-20 flex items-center gap-2">
					{materials.map((material, i) => (
						<MaterialProficiencyIcon key={material.slug} material={material} active={i === 0} />
					))}
				</div>
			)}
		</div>
	)
}

function MaterialProficiencyIcon({
	material,
	active = false
}: {
	material: LessonResource | UnitResource
	active?: boolean
}) {
	switch (material.type) {
		case "Exercise":
			return (
				<Link href={material.path} className="inline-flex items-center">
					<ProficiencyIcon variant="not-started" active={active} side="bottom">
						<h2 className="text-md font-bold text-gray-800 capitalize">Exercise: {material.title}</h2>
						<p className="text-sm text-gray-500">Preview is not available for this exercise.</p>
					</ProficiencyIcon>
				</Link>
			)
		case "Quiz":
			return (
				<Link href={material.path} className="inline-flex items-center">
					<ProficiencyIcon variant="quiz" active={active}>
						<h2 className="text-md font-bold text-gray-800 capitalize">Quiz: {material.title}</h2>
						<p className="text-sm text-gray-500">Preview is not available for this quiz.</p>
					</ProficiencyIcon>
				</Link>
			)
		case "UnitTest":
			return (
				<Link href={material.path} className="inline-flex items-center">
					<ProficiencyIcon variant="unit-test" active={active}>
						<h2 className="text-md font-bold text-gray-800 capitalize">Unit Test: {material.title}</h2>
						<p className="text-sm text-gray-500">Preview is not available for this unit test.</p>
					</ProficiencyIcon>
				</Link>
			)
		default:
			return null
	}
}
