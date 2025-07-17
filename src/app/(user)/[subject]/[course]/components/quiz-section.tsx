import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { Quiz } from "@/lib/types/domain"
import { startCase } from "@/lib/utils"
import { Section } from "./section"

export function QuizSection({ quiz }: { quiz: Quiz }) {
	return (
		<Section>
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
				<div className="flex flex-col">
					<Link href={quiz.path} className="font-bold text-gray-900 mb-2 text-md hover:underline">
						{startCase(quiz.title)}
					</Link>

					<p className="text-gray-600 text-xs">Level up on the above skills and collect up to 0 Mastery points!</p>
				</div>
				<Button variant="outline" className="text-blue-600 hover:border-blue-600" asChild>
					<Link href={quiz.path}>Start Quiz</Link>
				</Button>
			</div>
		</Section>
	)
}
