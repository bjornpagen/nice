import { ScrollArea } from "@/components/ui/scroll-area"
import type { CourseChallenge as CourseChallengeType } from "@/lib/types/assessment"
import type { Course } from "@/lib/types/structure"
import { CourseChallenge as CourseChallengeComponent } from "./course-challenge"
import { CourseTab } from "./course-tab"
import { UnitTab } from "./unit-tab"

export function CourseSidebar({
	course,
	lessonCount,
	challenges
}: {
	course: Pick<Course, "id" | "title" | "description" | "path" | "units">
	lessonCount: number
	challenges: CourseChallengeType[]
}) {
	return (
		<div className="hidden md:block lg:block w-96 bg-white border-r border-gray-200 flex flex-col h-full">
			<div className="px-6 pb-6 flex-1 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="mt-4">
						<CourseTab course={course} unitCount={course.units.length} lessonCount={lessonCount} />
					</div>

					{/* Units */}
					{course.units.length > 0 && (
						<div>
							{course.units.map((unit, index) => (
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
