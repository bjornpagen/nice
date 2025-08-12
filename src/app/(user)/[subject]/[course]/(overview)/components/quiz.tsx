import Image from "next/image"
import Link from "next/link"
import quizNotStartedImage from "@/app/(user)/[subject]/[course]/(overview)/components/images/quiz-not-started.svg"
import { LockedItem } from "@/app/(user)/[subject]/[course]/(overview)/components/LockedItem"
import { Section } from "@/app/(user)/[subject]/[course]/(overview)/components/section"
import { XPExplainerDialog } from "@/components/dialogs/xp-explainer-dialog"
import { Button } from "@/components/ui/button"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { Quiz } from "@/lib/types/domain"
import { startCase } from "@/lib/utils"

export function QuizSection({
	quiz,
	resourceLockStatus,
	progress
}: {
	quiz: Quiz
	resourceLockStatus: Record<string, boolean>
	progress?: AssessmentProgress
}) {
	const isLocked = resourceLockStatus[quiz.id] === true
	const hasTaken = Boolean(progress && (progress.completed || typeof progress.score === "number"))
	const percentage = typeof progress?.score === "number" ? Math.round(progress.score * 100) : undefined

	if (isLocked) {
		return (
			<Section>
				<LockedItem title={startCase(quiz.title)} />
			</Section>
		)
	}

	return (
		<Section className="relative overflow-hidden">
			<div className="flex justify-between items-end gap-6">
				<div className="flex flex-col flex-1">
					<Link
						href={quiz.path}
						className="font-bold text-gray-900 mb-2 text-md hover:underline inline-flex items-center gap-2"
					>
						<span>{startCase(quiz.title)}</span>
						{percentage !== undefined && <span className="text-xs text-gray-600">{percentage}%</span>}
					</Link>
					<div className="text-gray-600 text-xs mb-4">
						<p className="flex items-center gap-1">
							<span>Expected: {quiz.xp} XP</span>
							<XPExplainerDialog triggerVariant="icon" triggerClassName="inline-flex" />
						</p>
						<p className="text-gray-400 mt-0.5">Perfect: up to {Math.round(quiz.xp * 1.25)} XP</p>
					</div>
					<Button variant="outline" className="text-blue-600 hover:border-blue-600 w-fit" asChild>
						<Link href={quiz.path}>{hasTaken ? "Take Quiz Again" : "Start Quiz"}</Link>
					</Button>
				</div>
				<div className="flex-shrink-0 hidden sm:block relative" style={{ marginBottom: "-2rem" }}>
					<Image src={quizNotStartedImage} alt="Quiz mascot" width={280} height={280} />
				</div>
			</div>
		</Section>
	)
}
