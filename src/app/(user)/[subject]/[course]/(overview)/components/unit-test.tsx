import Image from "next/image"
import Link from "next/link"
import unitTestNotStartedImage from "@/app/(user)/[subject]/[course]/(overview)/components/images/unit-test-not-started.svg"
import { LockedItem } from "@/app/(user)/[subject]/[course]/(overview)/components/LockedItem"
import { Section } from "@/app/(user)/[subject]/[course]/(overview)/components/section"
import { XPExplainerDialog } from "@/components/dialogs/xp-explainer-dialog"
import { Button } from "@/components/ui/button"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { UnitTest } from "@/lib/types/domain"
import { startCase } from "@/lib/utils"

export function UnitTestSection({
	test,
	resourceLockStatus,
	progress
}: {
	test: UnitTest
	resourceLockStatus: Record<string, boolean>
	progress?: AssessmentProgress
}) {
	const isLocked = resourceLockStatus[test.componentResourceSourcedId] === true
	const hasTaken = Boolean(progress && (progress.completed || typeof progress.score === "number"))
	const percentage = typeof progress?.score === "number" ? Math.round(progress.score) : undefined

	if (isLocked) {
		return (
			<Section>
				<LockedItem title={startCase(test.title)} />
			</Section>
		)
	}

	return (
		<Section className="relative overflow-hidden">
			<div className="flex justify-between items-end gap-6">
				<div className="flex flex-col flex-1">
					<Link
						href={test.path}
						className="font-bold text-gray-900 mb-2 text-md hover:underline inline-flex items-center gap-2"
					>
						<span>{startCase(test.title)}</span>
						{percentage !== undefined && <span className="text-xs text-gray-600">{percentage}%</span>}
					</Link>
					<p className="text-gray-600 text-xs mb-2">Test your understanding of the entire unit!</p>
					{typeof test.xp === "number" && test.xp > 0 && (
						<div className="text-gray-600 text-xs mb-4">
							<p className="flex items-center gap-1">
								<span>Expected: {test.xp} XP</span>
								<XPExplainerDialog triggerVariant="icon" triggerClassName="inline-flex" />
							</p>
							<p className="text-gray-400 mt-0.5">Perfect: up to {Math.round(test.xp * 1.25)} XP</p>
						</div>
					)}
					<Button variant="outline" className="text-blue-600 hover:border-blue-600 w-fit" asChild>
						<Link href={test.path}>{hasTaken ? "Take Unit Test Again" : "Start Unit Test"}</Link>
					</Button>
				</div>
				<div className="flex-shrink-0 hidden sm:block relative" style={{ marginBottom: "-2rem" }}>
					<Image src={unitTestNotStartedImage} alt="Unit test mascot" width={280} height={280} />
				</div>
			</div>
		</Section>
	)
}
