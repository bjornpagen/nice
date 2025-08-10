"use client"

import * as React from "react"
import { CourseChallenge } from "@/app/(user)/[subject]/[course]/(overview)/components/course-challenge"
import { CourseTab } from "@/app/(user)/[subject]/[course]/(overview)/components/course-tab"
import { UnitTab } from "@/app/(user)/[subject]/[course]/(overview)/components/unit-tab"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Course, CourseChallenge as CourseChallengeType } from "@/lib/types/domain"

export function Sidebar({
	course,
	lessonCount,
	challenges,
	resourceLockStatusPromise
}: {
	course: Promise<Pick<Course, "id" | "title" | "description" | "path" | "units">>
	lessonCount: Promise<number>
	challenges: Promise<CourseChallengeType[]>
	resourceLockStatusPromise: Promise<Record<string, boolean>>
}) {
	// Use React.use() to consume the promises
	const courseData = React.use(course)
	const lessonCountData = React.use(lessonCount)
	const challengesData = React.use(challenges)
	const resourceLockStatus = React.use(resourceLockStatusPromise)

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
								<UnitTab key={unit.id} index={index} unit={unit} resourceLockStatus={resourceLockStatus} />
							))}
						</div>
					)}

					{/* Challenges */}
					{challengesData.length > 0 && (
						<div className="mt-8">
							{challengesData.map((challenge) => (
								<CourseChallenge key={challenge.id} path={challenge.path} />
							))}
						</div>
					)}
				</ScrollArea>
			</div>
		</div>
	)
}
