"use client"

import { Info } from "lucide-react"
import * as React from "react"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { UnitChild } from "@/lib/types/domain"
import type { UnitPageData } from "@/lib/types/page"
import { Header } from "../../components/header"
import { Legend } from "../../components/legend"
import { LessonSection } from "../../components/lesson"
import { Progress } from "../../components/progress"
import { QuizSection } from "../../components/quiz"
import { Section } from "../../components/section"
import { UnitTestSection } from "../../components/unit-test"

export function Content({
	dataPromise,
	progressPromise
}: {
	dataPromise: Promise<UnitPageData>
	progressPromise: Promise<Map<string, AssessmentProgress>>
}) {
	const { params, allUnits, unit, totalXP } = React.use(dataPromise)
	const progressMap = React.use(progressPromise)

	// Data validation is now handled in the data fetching layer.
	// We can trust that `unit` and `allUnits` are valid here.
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
					<Info className="w-4 h-4 bg-gray-200 rounded-full cursor-not-allowed" />
				</div>
				<Legend />
				<React.Suspense fallback={<div className="w-full h-4 bg-gray-200 animate-pulse rounded" />}>
					<div className="mt-4">
						<Progress unitChildren={unit.children} progressMap={progressMap} />
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
							return <LessonSection key={`${unit.id}-lesson-${child.id}`} lesson={child} progressMap={progressMap} />
						case "Quiz":
							return <QuizSection key={`${unit.id}-quiz-${child.id}`} quiz={child} />
						case "UnitTest":
							return <UnitTestSection key={`${unit.id}-test-${child.id}`} test={child} />
						default:
							return null
					}
				})}
			</React.Suspense>
		</>
	)
}
