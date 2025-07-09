"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Unit } from "@/components/overview/types"
import { cn } from "@/lib/utils"

export function CourseSidebarUnitItem({
	index,
	unit,
	className
}: {
	index: number
	unit: Omit<Unit, "description">
	className?: string
}) {
	const pathname = usePathname()

	let outerClassName = ""
	let innerClassName = "text-sm text-gray-800"
	if (pathname === unit.path) {
		outerClassName = "bg-blue-100 border-l-4 border-l-blue-600"
		innerClassName = "text-sm font-medium text-blue-800"
	}

	return (
		<div
			id="course-sidebar-unit-item"
			className={cn("px-4 py-3 hover:bg-blue-100 hover:shadow-sm transition-all", outerClassName, className)}
		>
			<Link href={unit.path} className="w-full">
				<h3 className="text-[10px] font-medium text-gray-500 uppercase">Unit {index + 1}</h3>
				<p className={cn(innerClassName, "capitalize")}>{unit.title}</p>
			</Link>
		</div>
	)
}
