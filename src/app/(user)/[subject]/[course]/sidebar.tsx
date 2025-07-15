import { ScrollArea } from "@/components/ui/scroll-area"
import { CourseChallenge as CourseChallengeComponent } from "./course-challenge"
import { CourseTab } from "./course-tab"
import type { CoursePage_Course, CoursePage_CourseChallenge, CoursePage_UnitWithChildren } from "./page"
import { UnitTab } from "./unit-tab"

export function CourseSidebar({
	course,
	units,
	lessonCount,
	challenges
}: {
	course: CoursePage_Course
	units: CoursePage_UnitWithChildren[]
	lessonCount: number
	challenges: CoursePage_CourseChallenge[]
}) {
	return (
		<div className="hidden md:block lg:block w-96 bg-white border-r border-gray-200 flex flex-col h-full">
			<div className="px-6 pb-6 flex-1 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="mt-4">
						<CourseTab course={course} lessonCount={lessonCount} />
					</div>

					{/* Units */}
					{units.length > 0 && (
						<div>
							{units.map((unit, index) => (
								<UnitTab key={unit.id} index={index} unit={unit} />
							))}
						</div>
					)}

					{/* Challenges */}
					{challenges.length > 0 && (
						<div className="mt-8">
							{challenges.map((challenge) => (
								<CourseChallengeComponent key={challenge.id} path={challenge.path} />
							))}
						</div>
					)}
				</ScrollArea>
			</div>
		</div>
	)
}
