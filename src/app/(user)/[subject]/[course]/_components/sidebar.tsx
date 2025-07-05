import { ScrollArea } from "@/components/ui/scroll-area"
import type { Course, CourseChallenge, Unit } from "../page"
import { CourseChallenge as CourseChallengeComponent } from "./course-challenge"
import { CourseTab } from "./course-tab"
import { UnitTab } from "./unit-tab"

export function CourseSidebar({
	course,
	units,
	lessonCount,
	challenges
}: {
	course: Course
	units: Unit[]
	lessonCount: number
	challenges: CourseChallenge[]
}) {
	return (
		<div className="hidden md:block lg:block w-96 bg-white border-r border-gray-200">
			<div className="px-6 pb-6">
				<ScrollArea className="h-[calc(100vh-120px)]">
					<div className="mt-4">
						<CourseTab course={course} units={units.length} lessons={lessonCount} />
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
