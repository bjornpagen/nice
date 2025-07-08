"use client"

import { Info } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { CourseChallenge } from "./course-challenge"
import { CourseHeader } from "./course-header"
import type { CourseData } from "./page"
import { ProficiencyLegend } from "./proficiency-legend"
import { ProficiencyProgressOverview } from "./proficiency-progress-overview"
import { Section } from "./section"
import { CourseSidebar } from "./sidebar"
import { UnitOverviewSection } from "./unit-overview-section"

export function Content({ dataPromise }: { dataPromise: Promise<CourseData> }) {
	// Consume the single, consolidated data promise.
	const { params, course, units, lessonCount, challenges } = React.use(dataPromise)

	return (
		<div className="h-full overflow-y-auto">
			{/* Main Layout Container */}
			<div className="flex">
				{/* Sidebar */}
				<div className="flex-shrink-0">
					<React.Suspense>
						<CourseSidebar course={course} units={units} lessonCount={lessonCount} challenges={challenges} />
					</React.Suspense>
				</div>

				{/* Main Content Area */}
				<div className="flex-1 p-6 bg-gray-50">
					<CourseHeader subject={params.subject} course={params.course} />

					{/* Course Header */}
					<div className="mb-6">
						{/* Course Details */}
						<h1 className="text-3xl font-bold text-gray-800 mb-2">{course.title}</h1>
						<div className="flex items-center space-x-2 text-gray-600">
							<span className="text-sm">0 possible mastery points</span>
							<Info className="w-4 h-4 bg-gray-200 rounded-full cursor-not-allowed" />
						</div>

						<ProficiencyLegend />
					</div>

					{/* Units Layout */}
					<div className="columns-1 lg:columns-2 gap-6 mt-4">
						{units.map((unit, index) => (
							<div key={unit.id} className="break-inside-avoid border-b border-gray-300">
								<ProficiencyProgressOverview
									index={index}
									unitChildren={unit.children}
									path={unit.path}
									next={index === 0}
								/>
							</div>
						))}

						{/* Course Challenge */}
						{challenges.length > 0 && challenges[0] && (
							<div className="break-inside-avoid">
								<CourseChallenge path={challenges[0].path} />
							</div>
						)}
					</div>

					{/* Nice Academy Kids App Section */}
					<div className="mt-16 mb-16 text-center">
						<h2 className="text-xl font-medium text-gray-900 mb-4">Learn with the Nice Academy Kids app</h2>
						<p className="text-gray-700 text-base mb-6 max-w-2xl mx-auto">
							Kids ages 2-8 (preschool—2nd grade) can read, play, and learn with fun animal friends in our free
							interactive mobile app, Nice Academy Kids. We have tools for teachers, too!
						</p>
						<Button
							variant="outline"
							disabled
							className="px-6 py-2 text-blue-600 border-blue-600 hover:bg-blue-50 disabled:opacity-100 disabled:cursor-not-allowed"
						>
							Learn more
						</Button>
					</div>

					{/* Units Breakdown Section */}
					<div className="rounded-sm mt-6">
						{units.map((unit, index) => (
							<div key={unit.id} className="break-inside-avoid border-b border-gray-300 mb-2 rounded-sm">
								<UnitOverviewSection unit={unit} index={index} next={index === 0} />
							</div>
						))}
					</div>

					{/* Course Challenge */}
					<div className="rounded-sm">
						{challenges.length > 0 && challenges[0] && (
							<div className="break-inside-avoid">
								<Section className="rounded-sm">
									<h2 className="font-medium text-gray-900 text-base text-lg">Course challenge</h2>
									<p className="text-gray-600 text-sm">Test your knowledge of the skills in this course.</p>
									<Button
										variant="ghost"
										className="bg-white text-blue-600 text-sm border border-gray-400 px-4 py-2 rounded-sm mt-2 hover:ring-2 hover:ring-blue-500 hover:text-blue-600"
										asChild
									>
										<Link href={challenges[0].path}>Start Course challenge</Link>
									</Button>
								</Section>
							</div>
						)}
					</div>
				</div>
			</div>

			<Footer />
		</div>
	)
}
