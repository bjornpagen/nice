"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Unit } from "./course-sidebar"

export function CourseSidebarUnitItem({ index, unit }: { index: number; unit: Unit }) {
	const pathname = usePathname()

	// Remove top border from first unit item to prevent double border with course item.
	const borderClasses = index === 0 ? "border-b border-gray-100" : "border-t border-b border-gray-100"

	let outerClassName = `px-4 py-3 hover:bg-blue-100 hover:shadow-sm transition-all ${borderClasses}`
	let innerClassName = "text-sm text-gray-800"
	if (pathname === unit.path) {
		outerClassName = `bg-blue-100 border border-blue-200 border-l-4 border-l-blue-600 px-4 py-3 shadow-sm ${index === 0 ? "border-t-blue-200" : ""}`
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
