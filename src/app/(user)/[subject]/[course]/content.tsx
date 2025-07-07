"use client"

import { Info } from "lucide-react"
import * as React from "react"
import { Footer } from "@/components/footer"
import { CourseHeader } from "./course-header"
import type { CourseData, UnitChild } from "./page"
import { ProficiencyLegend } from "./proficiency-legend"
import { ProficiencyProgress } from "./proficiency-progress"
import { Section } from "./section"
import { CourseSidebar } from "./sidebar"

// Helper function to get display name for child type
function getChildTypeDisplayName(child: UnitChild): string {
	switch (child.type) {
		case "Lesson":
			return "Lesson"
		case "Quiz":
			return "Quiz"
		case "UnitTest":
			return "Unit Test"
		default:
			return "Unknown"
	}
}

export function Content({ dataPromise }: { dataPromise: Promise<CourseData> }) {
	// Consume the single, consolidated data promise.
	const { params, course, units, lessonCount, challenges } = React.use(dataPromise)

	return (
		<React.Fragment>
			{/* Main Layout Container */}
			<div className="flex h-full">
				{/* Sidebar */}
				<div className="h-full">
					<React.Suspense>
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

						<ProficiencyLegend />
					</div>

					{/* Separator */}
					<div className="border-t border-gray-400 mt-2 mb-6" />

					{/* About Section */}
					<Section>
						<h2 className="font-semibold text-gray-900 mb-2 text-xl">About this course</h2>
						<p className="text-gray-600 text-xs">{course.description}</p>
					</Section>

					{/* Units Section */}
					<Section>
						<h2 className="font-semibold text-gray-900 mb-4 text-xl">Units</h2>
						<div className="space-y-6">
							{units.map((unit) => {
								const lessons = unit.children.filter((child) => child.type === "Lesson")
								const quizzes = unit.children.filter((child) => child.type === "Quiz")
								const unitTests = unit.children.filter((child) => child.type === "UnitTest")

								return (
									<div key={unit.id} className="bg-white rounded-lg shadow-sm p-6">
										<div className="flex justify-between items-start mb-4">
											<div>
												<h3 className="text-lg font-semibold text-gray-900 mb-2">{unit.title}</h3>
												<p className="text-sm text-gray-600">
													{lessons.length} lessons
													{quizzes.length > 0 && ` • ${quizzes.length} quiz${quizzes.length > 1 ? "es" : ""}`}
													{unitTests.length > 0 && ` • ${unitTests.length} unit test${unitTests.length > 1 ? "s" : ""}`}
												</p>
											</div>
											<a href={unit.path} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
												Start unit →
											</a>
										</div>

										{/* Unit Content */}
										{unit.children.length > 0 && (
											<div className="space-y-2">
												<h4 className="text-sm font-medium text-gray-700 mb-2">Content:</h4>
												<div className="space-y-1">
													{unit.children.map((child) => (
														<div
															key={child.id}
															className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
														>
															<div className="flex items-center space-x-3">
																<div className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
																	{getChildTypeDisplayName(child)}
																</div>
																<div>
																	<a
																		href={child.path}
																		className="text-sm text-blue-600 hover:text-blue-800 font-medium"
																	>
																		{child.title}
																	</a>
																	{child.description && (
																		<p className="text-xs text-gray-500 mt-1">{child.description}</p>
																	)}
																</div>
															</div>
														</div>
													))}
												</div>
											</div>
										)}

										{/* Proficiency Progress for this unit */}
										<ProficiencyProgress unitChildren={unit.children} />
									</div>
								)
							})}
						</div>
					</Section>

					{/* Challenges Section (if any) */}
					{challenges.length > 0 && (
						<React.Suspense>
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
