"use client"

import * as errors from "@superbuilders/errors"
import { Lock } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Unit } from "@/lib/types/domain"
import { assertNoEncodedColons, getFirstResourceIdForUnit, normalizeString } from "@/lib/utils"

export function UnitTab({
	index,
	unit,
	resourceLockStatus
}: {
	index: number
	unit: Unit
	resourceLockStatus: Record<string, boolean>
}) {
	const rawPathname = usePathname()
	const pathname = normalizeString(rawPathname)
	assertNoEncodedColons(pathname, "unit-tab pathname")

	// A unit is considered locked if its first actionable resource (by ordering) is locked
	let isLocked = false
	const result = errors.trySync(() => getFirstResourceIdForUnit(unit))
	if (result.error) {
		// No actionable resources → treat as unlocked for rendering but do not navigate
		isLocked = false
	} else {
		isLocked = resourceLockStatus[result.data] === true
	}

	// Render a locked, non-interactive state
	if (isLocked) {
		return (
			<div className="px-4 py-3 bg-gray-50 cursor-not-allowed border-t border-b border-gray-100 flex justify-between items-center">
				<div>
					<h3 className="text-[10px] font-medium text-gray-400">UNIT {index + 1}</h3>
					<p className="text-sm text-gray-400">{unit.title}</p>
				</div>
				<Lock className="w-5 h-5 text-gray-400" />
			</div>
		)
	}

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
