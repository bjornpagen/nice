"use server"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Unit } from "./course-sidebar"

export async function CourseSidebarUnitItem({
	index,
	unit,
	active = false
}: {
	index: number
	unit: Unit
	active?: boolean
}) {
	let outerClassName = "px-4 py-3 hover:bg-blue-100 hover:shadow-sm transition-all border-t border-b border-gray-100"
	let innerClassName = "text-sm text-gray-800"
	if (active) {
		outerClassName = "bg-blue-100 border border-blue-200 border-l-4 border-l-blue-600 px-4 py-3 shadow-sm"
		innerClassName = "text-sm font-medium text-blue-800"
	}

	return (
		<div id="course-sidebar-unit-item" className={outerClassName}>
			<Link href={unit.path} className="w-full">
				<h3 className="text-[10px] font-medium text-gray-500 uppercase">UNIT {index + 1}</h3>
				<p className={cn(innerClassName, "capitalize")}>{unit.title}</p>
			</Link>
		</div>
	)
}
