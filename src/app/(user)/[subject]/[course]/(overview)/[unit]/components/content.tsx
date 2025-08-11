"use client"

import { Lock, Unlock } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { Header } from "@/app/(user)/[subject]/[course]/(overview)/components/header"
import { Legend } from "@/app/(user)/[subject]/[course]/(overview)/components/legend"
import { LessonSection } from "@/app/(user)/[subject]/[course]/(overview)/components/lesson"
import { Progress } from "@/app/(user)/[subject]/[course]/(overview)/components/progress"
import { QuizSection } from "@/app/(user)/[subject]/[course]/(overview)/components/quiz"
import { Section } from "@/app/(user)/[subject]/[course]/(overview)/components/section"
import { UnitTestSection } from "@/app/(user)/[subject]/[course]/(overview)/components/unit-test"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
// Info icon was previously used; replaced with XPExplainerDialog
import { XPExplainerDialog } from "@/components/dialogs/xp-explainer-dialog"
import { Button } from "@/components/ui/button"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { UnitChild } from "@/lib/types/domain"
import type { UnitPageData } from "@/lib/types/page"

export function Content({
	dataPromise,
	progressPromise,
	canUnlockAllPromise
}: {
	dataPromise: Promise<UnitPageData>
	progressPromise: Promise<Map<string, AssessmentProgress>>
	canUnlockAllPromise: Promise<boolean>
}) {
	const data = React.use(dataPromise)
	const { params, allUnits, unit, totalXP } = data
	const progressMap = React.use(progressPromise)
	const canUnlockAll = React.use(canUnlockAllPromise)

	// Use course-wide lock status context instead of local state
	const { resourceLockStatus, setResourceLockStatus, initialResourceLockStatus } = useCourseLockStatus()

	// Check if all items are currently unlocked
	const allUnlocked = Object.values(resourceLockStatus).every((isLocked) => !isLocked)

	const handleToggleLockAll = () => {
		if (allUnlocked) {
			// Restore original server-side lock state (natural progression locks)
			setResourceLockStatus(initialResourceLockStatus)
			toast.success("Lock state restored to natural progression.")
		} else {
			// Unlock all: set all to false (unlocked)
			const unlockedStatus = Object.fromEntries(Object.keys(resourceLockStatus).map((key) => [key, false]))
			setResourceLockStatus(unlockedStatus)
			toast.success("All activities have been unlocked.")
		}
	}

	const unitIndex = allUnits.findIndex((u) => u.id === unit.id)

	return (
		<>
			<Header subject={params.subject} course={params.course} />
			<div className="mb-6">
				<h1 className="text-3xl font-bold text-gray-800 mb-2">
					Unit {unitIndex + 1}: {unit.title}
				</h1>
				<div className="flex items-center space-x-2 text-gray-600">
					<span className="text-sm">{totalXP} possible mastery points</span>
					<XPExplainerDialog triggerVariant="icon" />
				</div>
				<div className="flex items-center justify-between mt-4">
					<Legend />
					{canUnlockAll && (
						<Button onClick={handleToggleLockAll} variant="outline" size="sm">
							{allUnlocked ? (
								<>
									<Lock className="w-4 h-4 mr-2" />
									Restore Locks
								</>
							) : (
								<>
									<Unlock className="w-4 h-4 mr-2" />
									Unlock All
								</>
							)}
						</Button>
					)}
				</div>
				<React.Suspense fallback={<div className="w-full h-4 bg-gray-200 animate-pulse rounded" />}>
					<div className="mt-4">
						<Progress unitChildren={unit.children} progressMap={progressMap} resourceLockStatus={resourceLockStatus} />
					</div>
				</React.Suspense>
			</div>

			<div className="border-t border-gray-400 mt-2 mb-6" />

			<Section>
				<h2 className="font-semibold text-gray-900 mb-2 text-xl">About this unit</h2>
				<p className="text-gray-600 text-xs">{unit.description}</p>
			</Section>

			<React.Suspense
				fallback={
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="bg-white rounded-lg shadow-sm p-6">
								<div className="h-6 bg-gray-200 animate-pulse rounded mb-4" />
								<div className="space-y-2">
									<div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
									<div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
								</div>
							</div>
						))}
					</div>
				}
			>
				{unit.children.map((child: UnitChild) => {
					switch (child.type) {
						case "Lesson":
							return (
								<LessonSection
									key={`${unit.id}-lesson-${child.id}`}
									lesson={child}
									progressMap={progressMap}
									resourceLockStatus={resourceLockStatus}
								/>
							)
						case "Quiz":
							return (
								<QuizSection key={`${unit.id}-quiz-${child.id}`} quiz={child} resourceLockStatus={resourceLockStatus} />
							)
						case "UnitTest":
							return (
								<UnitTestSection
									key={`${unit.id}-test-${child.id}`}
									test={child}
									resourceLockStatus={resourceLockStatus}
								/>
							)
						default:
							return null
					}
				})}
			</React.Suspense>
		</>
	)
}
