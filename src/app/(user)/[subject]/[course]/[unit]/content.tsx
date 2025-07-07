"use client"

import { Info } from "lucide-react"
import * as React from "react"
import { Footer } from "@/components/footer"
import { CourseHeader } from "../course-header"
import { LessonSection } from "../lesson-section"
import { ProficiencyLegend } from "../proficiency-legend"
import { ProficiencyProgress } from "../proficiency-progress"
import { QuizSection } from "../quiz-section"
import { Section } from "../section"
import { CourseSidebar } from "../sidebar"
import { UnitTestSection } from "../unit-test-section"
import type { HydratedUnitData } from "./page"

export function Content({ dataPromise }: { dataPromise: Promise<HydratedUnitData> }) {
	// Consume the single, consolidated data promise.
	const { params, course, allUnits, lessonCount, challenges, unit, unitChildren } = React.use(dataPromise)

	const unitIndex = allUnits.findIndex((u) => u.id === unit.id)
	if (unitIndex === -1) {
		return <div>Unit not found.</div>
	}

	return (
		<React.Fragment>
			<div className="flex">
				<div className="sticky top-0 h-screen overflow-y-auto">
					<React.Suspense fallback={<div className="w-80 bg-gray-100 animate-pulse h-screen" />}>
						<CourseSidebar course={course} units={allUnits} lessonCount={lessonCount} challenges={challenges} />
					</React.Suspense>
				</div>
				<div className="flex-1 p-6 overflow-y-auto bg-gray-50">
					<CourseHeader subject={params.subject} course={params.course} />
					<div className="mb-6">
						<h1 className="text-3xl font-bold text-gray-800 mb-2">
							Unit {unitIndex + 1}: {unit.title}
						</h1>
						<div className="flex items-center space-x-2 text-gray-600">
							<span className="text-sm">0 possible mastery points</span>
							<Info className="w-4 h-4 bg-gray-200 rounded-full cursor-not-allowed" />
						</div>
						<ProficiencyLegend />
						<React.Suspense fallback={<div className="w-full h-4 bg-gray-200 animate-pulse rounded" />}>
							<ProficiencyProgress unitChildren={unitChildren} />
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
						{unitChildren.map((child) => {
							switch (child.type) {
								case "Lesson":
									// Pass the fully hydrated lesson to the component
									return (
										<LessonSection
											key={child.id}
											lesson={child}
											videos={child.videos}
											exercises={child.exercises}
											articles={child.articles}
										/>
									)
								case "Quiz":
									return <QuizSection key={child.id} quiz={child} />
								case "UnitTest":
									return <UnitTestSection key={child.id} unitTest={child} />
								default:
									return null
							}
						})}
					</React.Suspense>
				</div>
			</div>
			<Footer />
		</React.Fragment>
	)
}
