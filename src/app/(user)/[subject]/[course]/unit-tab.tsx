"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { CoursePage_Unit } from "./page"

export function UnitTab({ index, unit }: { index: number; unit: CoursePage_Unit }) {
	const pathname = usePathname()
	if (pathname === unit.path) {
		return (
			<div className="bg-blue-100 border border-blue-200 border-l-4 border-l-blue-600 px-4 py-3 shadow-sm">
				<Link href={unit.path} className="w-full">
					<h3 className="text-[10px] font-medium text-gray-500">UNIT {index + 1}</h3>
					<p className="text-sm font-medium text-blue-800">{unit.title}</p>
				</Link>
			</div>
		)
	}

	return (
		<div className="px-4 py-3 hover:bg-blue-100 hover:shadow-sm transition-all border-t border-b border-gray-100">
			<Link href={unit.path} className="w-full">
				<h3 className="text-[10px] font-medium text-gray-500">UNIT {index + 1}</h3>
				<p className="text-sm text-gray-800">{unit.title}</p>
			</Link>
		</div>
	)
}
