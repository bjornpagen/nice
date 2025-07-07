"use client"

import { Info } from "lucide-react"
import * as React from "react"
import { Footer } from "@/components/footer"
import { CourseHeader } from "./course-header"
import type { CourseData } from "./page"
import { ProficiencyLegend } from "./proficiency-legend"
import { Section } from "./section"
import { CourseSidebar } from "./sidebar"

export function Content({ dataPromise }: { dataPromise: Promise<CourseData> }) {
	// Consume the single, consolidated data promise.
	const { params, course, units, lessonCount, challenges } = React.use(dataPromise)

	return (
		<React.Fragment>
			{/* Main Layout Container */}
			<div className="flex h-full">
				{/* Sidebar */}
				<div className="h-full">
					<React.Suspense fallback={<div className="w-80 bg-gray-100 animate-pulse h-full" />}>
						<CourseSidebar course={course} units={units} lessonCount={lessonCount} challenges={challenges} />
					</React.Suspense>
				</div>

				{/* Main Content Area */}
				<div className="flex-1 p-6 overflow-y-auto bg-gray-50">
					<CourseHeader subject={params.subject} course={params.course} />

					{/* Course Header */}
					<div className="mb-6">
						{/* Course Details */}
						<h1 className="text-3xl font-bold text-gray-800 mb-2">{course.title}</h1>
						<div className="flex items-center space-x-2 text-gray-600">
							<span className="text-sm">0 possible mastery points</span>
							<Info className="w-4 h-4 bg-gray-200 rounded-full cursor-not-allowed" />
						</div>

						{/* Proficiency Metrics */}
						<ProficiencyLegend />
						{/* Future: Add course-level proficiency progress */}
					</div>

					{/* Separator */}
					<div className="border-t border-gray-400 mt-2 mb-6" />

					{/* About Section */}
					<Section>
						<h2 className="font-semibold text-gray-900 mb-2 text-xl">About this course</h2>
						<p className="text-gray-600 text-xs">{course.description}</p>
					</Section>

					{/* Units Section with Streaming */}
					<React.Suspense
						fallback={
							<div className="space-y-4">
								{Array.from({ length: 4 }).map((_, i) => (
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
						<Section>
							<h2 className="font-semibold text-gray-900 mb-4 text-xl">Units ({units.length})</h2>
							<div className="space-y-4">
								{units.map((unit, index) => (
									<div key={unit.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
										<h3 className="text-lg font-medium text-gray-900 mb-2">
											Unit {index + 1}: {unit.title}
										</h3>
										<a href={unit.path} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
											View Unit →
										</a>
									</div>
								))}
							</div>
						</Section>
					</React.Suspense>

					{/* Challenges Section (if any) */}
					{challenges.length > 0 && (
						<React.Suspense
							fallback={
								<div className="bg-white rounded-lg shadow-sm p-6">
									<div className="h-6 bg-gray-200 animate-pulse rounded mb-4" />
									<div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
								</div>
							}
						>
							<Section>
								<h2 className="font-semibold text-gray-900 mb-4 text-xl">Course Challenges</h2>
								<div className="space-y-2">
									{challenges.map((challenge) => (
										<div
											key={challenge.id}
											className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
										>
											<a href={challenge.path} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
												View Challenge →
											</a>
										</div>
									))}
								</div>
							</Section>
						</React.Suspense>
					)}
				</div>
			</div>

			<Footer />
		</React.Fragment>
	)
}
