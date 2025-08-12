"use client"

import { useUser } from "@clerk/nextjs"
import { Lock, Unlock } from "lucide-react"
import type * as React from "react"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { XPExplainerDialog } from "@/components/dialogs/xp-explainer-dialog"
import { AssessmentBottomNav, type AssessmentType } from "@/components/practice/assessment-bottom-nav"
import { LockOverlay } from "@/components/practice/lock-overlay"
import { Button } from "@/components/ui/button"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

interface Props {
	headerTitle: string
	headerDescription?: string
	title: string
	subtitle: string
	subtitleColorClass: string
	questionsCount: number
	expectedXp?: number // Total XP for the assessment
	onStart: () => void
	bgClass: string
	contentType: AssessmentType
	children?: React.ReactNode // For character images
	textPositioning?: string // Custom text positioning classes
	isLocked?: boolean
}

export function AssessmentStartScreen({
	headerTitle,
	headerDescription,
	title,
	subtitle,
	subtitleColorClass,
	questionsCount,
	expectedXp,
	onStart,
	bgClass,
	contentType,
	children,
	textPositioning,
	isLocked
}: Props) {
	const defaultPositioning = children ? "justify-start pt-16" : "justify-center"
	const positioning = textPositioning || defaultPositioning
	const { user } = useUser()
	const { resourceLockStatus, setResourceLockStatus, initialResourceLockStatus, storageKey } = useCourseLockStatus()
	const allUnlocked = Object.values(resourceLockStatus).every((isLocked) => !isLocked)
	const parsed = ClerkUserPublicMetadataSchema.safeParse(user?.publicMetadata)
	const canUnlockAll = parsed.success && parsed.data.roles.some((r) => r.role !== "student")

	const handleToggleLockAll = () => {
		if (!canUnlockAll) return
		if (allUnlocked) {
			setResourceLockStatus(initialResourceLockStatus)
			if (typeof window !== "undefined") {
				window.localStorage.removeItem(storageKey)
			}
			return
		}
		const unlockedStatus = Object.fromEntries(Object.keys(resourceLockStatus).map((key) => [key, false]))
		setResourceLockStatus(unlockedStatus)
		if (typeof window !== "undefined") {
			window.localStorage.setItem(storageKey, "1")
		}
	}

	return (
		<div className="flex flex-col h-full relative">
			<div className="bg-white p-6 border-b border-gray-200 flex-shrink-0">
				<div className="flex items-center justify-between">
					<div className="w-24" />
					<div className="text-center flex-1">
						<h1 className="text-2xl font-bold text-gray-900">{headerTitle}</h1>
						{headerDescription && <p className="text-gray-600 mt-2">{headerDescription}</p>}
					</div>
					<div className="w-24 flex justify-end">
						{canUnlockAll && (
							<Button onClick={handleToggleLockAll} variant="outline" size="sm">
								{allUnlocked ? (
									<>
										<Lock className="w-4 h-4 mr-2" /> Restore Locks
									</>
								) : (
									<>
										<Unlock className="w-4 h-4 mr-2" /> Unlock All
									</>
								)}
							</Button>
						)}
					</div>
				</div>
			</div>

			<div className={`${bgClass} text-white flex-1 flex flex-col items-center ${positioning} p-12 pb-32 relative`}>
				<div className="text-center max-w-md z-10">
					<h2 className="text-3xl font-bold mb-4">{title}</h2>
					<p className={`text-lg mb-8 ${subtitleColorClass}`}>{subtitle}</p>
					<div className="text-lg font-medium mb-8 text-center">
						<div className="flex items-center justify-center gap-3">
							<span>{questionsCount} questions</span>
							{typeof expectedXp === "number" && expectedXp > 0 && (
								<>
									<span>•</span>
									<span className="flex items-center gap-1">
										{expectedXp} XP
										<XPExplainerDialog triggerVariant="icon" triggerClassName="inline-flex" />
									</span>
								</>
							)}
						</div>
						{typeof expectedXp === "number" && expectedXp > 0 && (
							<div className="text-sm text-gray-500 mt-1">Perfect score: up to {Math.round(expectedXp * 1.25)} XP</div>
						)}
					</div>
				</div>
				{children}
			</div>

			<AssessmentBottomNav contentType={contentType} onContinue={onStart} isEnabled={true} isStartScreen={true} />

			{isLocked && (
				<div className="absolute top-[6rem] bottom-0 left-0 right-0 z-30">
					<LockOverlay message="This content is locked. Please complete earlier activities in the unit." />
				</div>
			)}
		</div>
	)
}
