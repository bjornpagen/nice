"use client"

import { Info } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { Button } from "@/components/ui/button"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { CoursePageData } from "@/lib/types/page"
import { CourseChallenge } from "./course-challenge"
import { CourseHeader } from "./course-header"
import { ProficiencyLegend } from "./proficiency-legend"
import { ProficiencyProgressOverview } from "./proficiency-progress-overview"
import { Section } from "./section"
// REMOVED: The sidebar is no longer imported or rendered here.
// import { CourseSidebar } from "./sidebar"
import { UnitOverviewSection } from "./unit-overview-section"

export function Content({
	dataPromise,
	progressPromise
}: {
	dataPromise: Promise<CoursePageData>
	progressPromise: Promise<Map<string, AssessmentProgress>>
}) {
	// Consume the promises.
	const { params, course, totalXP } = React.use(dataPromise)
	const progressMap = React.use(progressPromise)

	// REMOVED: The outer layout structure is now handled by layout.tsx
	// The component now returns only the main content without sidebar container
	return (
		<>
			<CourseHeader subject={params.subject} course={params.course} />

			{/* Course Header */}
			<div className="mb-6">
				{/* Course Details */}
				<h1 className="text-3xl font-bold text-gray-800 mb-2">{course.title}</h1>
				<div className="flex items-center space-x-2 text-gray-600">
					<span className="text-sm">{totalXP} possible mastery points</span>
					<Info className="w-4 h-4 bg-gray-200 rounded-full cursor-not-allowed" />
				</div>

				<ProficiencyLegend />
			</div>

			{/* Units Layout */}
			<div className="columns-1 xl:columns-2 gap-6 mt-4">
				{course.units.map((unit, index) => (
					<div key={unit.id} className="break-inside-avoid border-b border-gray-300">
						<ProficiencyProgressOverview
							index={index}
							unitChildren={unit.children}
							path={unit.path}
							next={index === 0}
							progressMap={progressMap}
						/>
					</div>
				))}

				{/* Course Challenge */}
				{course.challenges.length > 0 && course.challenges[0] && (
					<div className="break-inside-avoid">
						<CourseChallenge path={course.challenges[0].path} />
					</div>
				)}
			</div>

			{/* Units Breakdown Section */}
			<div className="rounded-sm mt-6">
				{course.units.map((unit, index) => (
					<div key={unit.id} className="break-inside-avoid border-b border-gray-300 mb-2 rounded-sm">
						<UnitOverviewSection unit={unit} index={index} next={index === 0} />
					</div>
				))}
			</div>

			{/* Course Challenge */}
			<div className="rounded-sm">
				{course.challenges.length > 0 && course.challenges[0] && (
					<div className="break-inside-avoid">
						<Section className="rounded-sm">
							<h2 className="font-medium text-gray-900 text-base text-lg">Course challenge</h2>
							<p className="text-gray-600 text-sm">Test your knowledge of the skills in this course.</p>
							<Button
								variant="ghost"
								className="bg-white text-blue-600 text-sm border border-gray-400 px-4 py-2 rounded-sm mt-2 hover:ring-2 hover:ring-blue-500 hover:text-blue-600"
								asChild
							>
								<Link href={course.challenges[0].path}>Start Course challenge</Link>
							</Button>
						</Section>
					</div>
				)}
			</div>
		</>
	)
}
