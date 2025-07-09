import * as logger from "@superbuilders/slog"
import { type Course, CourseContent } from "@/components/overview/course/content/course-content"

export default async function CoursePage({ params }: { params: Promise<{ subject: string; course: string }> }) {
	const { subject, course } = await params
	logger.debug("initializing course page", { subject, course })

	const coursePromise = getCourseData(subject, course)
	logger.debug("course data retrieved", { subject, course })

	return (
		<div id="course-page">
			<CourseContent coursePromise={coursePromise} />
		</div>
	)
}

async function getCourseData(subject: string, course: string): Promise<Course> {
	logger.debug("retrieving course data", { subject, course })

	return {
		path: `/v2/${subject}/${course}`,
		title: "Course title",
		units: [
			{
				slug: "unit-1",
				path: "/v2/math/algebra/unit-1",
				title: "Unit 1",
				lessons: [
					{
						slug: "lesson-1",
						path: "/v2/math/algebra/unit-1/lesson-1",
						type: "exercise",
						title: "Lesson 1"
					},
					{
						slug: "lesson-2",
						path: "/v2/math/algebra/unit-1/lesson-2",
						type: "quiz",
						title: "Lesson 2"
					},
					{
						slug: "lesson-3",
						path: "/v2/math/algebra/unit-1/lesson-3",
						type: "exercise",
						title: "Lesson 3"
					},
					{
						slug: "lesson-4",
						path: "/v2/math/algebra/unit-1/lesson-4",
						type: "unit-test",
						title: "Lesson 4"
					}
				]
			},
			{
				slug: "unit-2",
				path: "/v2/math/algebra/unit-2",
				title: "Unit 2",
				lessons: [
					{
						slug: "lesson-1",
						path: "/v2/math/algebra/unit-2/lesson-1",
						type: "exercise",
						title: "Lesson 1"
					},
					{
						slug: "lesson-2",
						path: "/v2/math/algebra/unit-2/lesson-2",
						type: "quiz",
						title: "Lesson 2"
					},
					{
						slug: "lesson-3",
						path: "/v2/math/algebra/unit-2/lesson-3",
						type: "exercise",
						title: "Lesson 3"
					},
					{
						slug: "lesson-4",
						path: "/v2/math/algebra/unit-2/lesson-4",
						type: "quiz",
						title: "Lesson 4"
					},
					{
						slug: "lesson-5",
						path: "/v2/math/algebra/unit-2/lesson-5",
						type: "exercise",
						title: "Lesson 5"
					},
					{
						slug: "lesson-6",
						path: "/v2/math/algebra/unit-2/lesson-6",
						type: "exercise",
						title: "Lesson 6"
					},
					{
						slug: "lesson-7",
						path: "/v2/math/algebra/unit-2/lesson-7",
						type: "exercise",
						title: "Lesson 7"
					},
					{
						slug: "lesson-8",
						path: "/v2/math/algebra/unit-2/lesson-8",
						type: "unit-test",
						title: "Lesson 8"
					}
				]
			},
			{
				slug: "unit-3",
				path: "/v2/math/algebra/unit-3",
				title: "Unit 3",
				lessons: [
					{
						slug: "lesson-1",
						path: "/v2/math/algebra/unit-3/lesson-1",
						type: "exercise",
						title: "Lesson 1"
					},
					{
						slug: "lesson-2",
						path: "/v2/math/algebra/unit-3/lesson-2",
						type: "quiz",
						title: "Lesson 2"
					}
				]
			},
			{
				slug: "unit-4",
				path: "/v2/math/algebra/unit-4",
				title: "Unit 4",
				lessons: [
					{
						slug: "lesson-1",
						path: "/v2/math/algebra/unit-4/lesson-1",
						type: "exercise",
						title: "Lesson 1"
					},
					{
						slug: "lesson-2",
						path: "/v2/math/algebra/unit-4/lesson-2",
						type: "quiz",
						title: "Lesson 2"
					},
					{
						slug: "lesson-3",
						path: "/v2/math/algebra/unit-4/lesson-3",
						type: "exercise",
						title: "Lesson 3"
					},
					{
						slug: "lesson-4",
						path: "/v2/math/algebra/unit-4/lesson-4",
						type: "unit-test",
						title: "Lesson 4"
					}
				]
			}
		],
		challenge: {
			path: "/v2/math/algebra/challenge"
		}
	}
}
