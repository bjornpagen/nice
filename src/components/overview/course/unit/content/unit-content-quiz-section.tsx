import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { UnitContentData } from "./unit-content"
import { UnitContentSection } from "./unit-content-section"

export function UnitContentQuizSection({ index, quiz }: { index: number; quiz: UnitContentData["resources"][number] }) {
	if (quiz.type !== "Quiz") {
		return undefined
	}

	void index
	return (
		<UnitContentSection>
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
				<div className="flex flex-col">
					<Link href={quiz.path} className="font-medium text-gray-900 mb-2 text-md hover:underline capitalize">
						{quiz.title}
					</Link>

					<p className="text-gray-600 text-xs">Level up on the above skills and collect up to 0 Mastery points!</p>
				</div>
				<Button variant="outline" className="text-blue-600 hover:border-blue-600" asChild>
					<Link href={quiz.path}>Start Quiz</Link>
				</Button>
			</div>
		</UnitContentSection>
	)
}
