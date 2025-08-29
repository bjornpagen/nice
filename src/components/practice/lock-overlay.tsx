"use client"

import { Lock } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { usePracticeCourse } from "@/components/practice/course-context"
import { Button } from "@/components/ui/button"
import type { Course as CourseV2 } from "@/lib/types/sidebar"

function getTargetUnitPath(
	course: CourseV2 | undefined,
	resourceLockStatus: Record<string, boolean>
): string | undefined {
	if (!course) return undefined
	// Iterate units in order; track the last unit whose first actionable resource is unlocked
	let lastUnlockedPath: string | undefined
	for (const unit of course.units) {
		// First, prefer lesson resources in order
		const ordered: Array<{ id: string; path: string }> = []
		for (const lesson of unit.lessons) {
			for (const resource of lesson.resources) {
				ordered.push({ id: resource.componentResourceSourcedId, path: unit.path })
			}
		}
		// Then unit-level assessments
		for (const res of unit.resources) {
			ordered.push({ id: res.componentResourceSourcedId, path: unit.path })
		}
		const first = ordered[0]
		if (!first) continue
		const unitLocked = resourceLockStatus[first.id] === true
		if (unitLocked) break
		lastUnlockedPath = unit.path
	}
	// Fallback to course root if none detected (e.g., all locked by design)
	return lastUnlockedPath ?? course.path
}

export function LockOverlay({ message }: { message?: string }) {
	const { resourceLockStatus } = useCourseLockStatus()
	const course = usePracticeCourse()

	const id = React.useId()
	const targetUnitPath = getTargetUnitPath(course, resourceLockStatus)

	if (!targetUnitPath) return null

	return (
		<div
			className="absolute inset-0 z-[999] pointer-events-auto touch-none"
			id={id}
			role="alertdialog"
			aria-modal="true"
		>
			<div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" />
			<div className="absolute inset-0 flex items-center justify-center">
				<div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 max-w-md text-center">
					<div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
						<Lock className="h-5 w-5 text-gray-600" />
					</div>
					<h3 className="text-lg font-semibold text-gray-900">Content locked</h3>
					<p className="text-sm text-gray-600 mt-1">
						{message ?? "This content is locked until you complete the earlier activities."}
					</p>
					<div className="mt-4 flex justify-center">
						<Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
							<Link href={targetUnitPath}>Go to current unit</Link>
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
