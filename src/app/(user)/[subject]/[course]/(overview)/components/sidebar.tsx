"use client"

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Course, CourseChallenge as CourseChallengeType } from "@/lib/types/domain"
import { CourseChallenge as CourseChallengeComponent } from "./course-challenge"
import { CourseTab } from "./course-tab"
import { UnitTab } from "./unit-tab"

export function CourseSidebar({
	course,
	lessonCount,
	challenges
}: {
	course: Promise<Pick<Course, "id" | "title" | "description" | "path" | "units">>
	lessonCount: Promise<number>
	challenges: Promise<CourseChallengeType[]>
}) {
	// Use React.use() to consume the promises
	const courseData = React.use(course)
	const lessonCountData = React.use(lessonCount)
	const challengesData = React.use(challenges)

	return (
		<div className="hidden md:block lg:block w-96 bg-white border-r border-gray-200 flex flex-col h-full">
			<div className="px-6 pb-6 flex-1 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="mt-4">
						<CourseTab course={courseData} unitCount={courseData.units.length} lessonCount={lessonCountData} />
					</div>

					{/* Units */}
					{courseData.units.length > 0 && (
						<div>
							{courseData.units.map((unit, index) => (
								<UnitTab key={unit.id} index={index} unit={unit} />
							))}
						</div>
					)}

					{/* Challenges */}
					{challengesData.length > 0 && (
						<div className="mt-8">
							{challengesData.map((challenge) => (
								<CourseChallengeComponent key={challenge.id} path={challenge.path} />
							))}
						</div>
					)}
				</ScrollArea>
			</div>
		</div>
	)
}
