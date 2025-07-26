import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { Quiz } from "@/lib/types/domain"
import { startCase } from "@/lib/utils"
import quizNotStartedImage from "./images/quiz-not-started.svg"
import { Section } from "./section"

export function QuizSection({ quiz }: { quiz: Quiz }) {
	return (
		<Section className="relative overflow-hidden">
			<div className="flex justify-between items-end gap-6">
				<div className="flex flex-col flex-1">
					<Link href={quiz.path} className="font-bold text-gray-900 mb-2 text-md hover:underline">
						{startCase(quiz.title)}
					</Link>
					<p className="text-gray-600 text-xs mb-4">Level up on the above skills and collect up to 0 Mastery points!</p>
					<Button variant="outline" className="text-blue-600 hover:border-blue-600 w-fit" asChild>
						<Link href={quiz.path}>Start quiz</Link>
					</Button>
				</div>
				<div className="flex-shrink-0 hidden sm:block relative" style={{ marginBottom: "-2rem" }}>
					<Image src={quizNotStartedImage} alt="Quiz mascot" width={280} height={280} />
				</div>
			</div>
		</Section>
	)
}
