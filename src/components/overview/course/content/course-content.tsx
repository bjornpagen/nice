"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { ContentHeader } from "@/components/overview/content-header"
import type {
	Course,
	CourseResource,
	Lesson,
	LessonResource,
	Prettify,
	Unit,
	UnitResource
} from "@/components/overview/types"
import { Button } from "@/components/ui/button"
import { CourseContentBreadcrumbs } from "./course-content-breadcrumbs"
import { CourseContentChallenge } from "./course-content-challenge"
import { CourseContentUnitOverviewItem } from "./course-content-unit-overview-item"
import { CourseContentUnitProficiencyItem } from "./course-content-unit-proficiency-item"

export type CourseContentData = Prettify<
	Pick<Course, "path" | "title"> & {
		units: Array<
			Pick<Unit, "path" | "title"> & {
				lessons: Array<
					Pick<Lesson, "slug" | "path" | "title"> & {
						resources: Array<Pick<LessonResource, "slug" | "path" | "title" | "type">>
					}
				>
				resources: Array<Pick<UnitResource, "slug" | "path" | "title" | "type">>
			}
		>
		resources: Array<Pick<CourseResource, "type" | "path">>
	}
>

export function CourseContent({ coursePromise }: { coursePromise: Promise<CourseContentData> }) {
	const course = React.use(coursePromise)
	if (course.path === "") {
		throw errors.new("course data is invalid")
	}

	const challenge: CourseContentData["resources"][number] | undefined = course.resources.find(
		(resource) => resource.type === "CourseChallenge"
	)

	return (
		<div id="course-content">
			<div id="course-content-header">
				<CourseContentBreadcrumbs course={course} className="mb-4" />
				<ContentHeader title={course.title} points={0} className="mb-4" />
			</div>

			<div id="course-content-unit-proficiency-items" className="columns-2 sm:columns-1 gap-6 mt-4">
				{course.units.map((unit, index) => (
					<CourseContentUnitProficiencyItem
						key={index}
						index={index}
						unit={unit}
						active={index === 0}
						className="break-inside-avoid border-b border-gray-300 px-6 py-3 mb-2"
					/>
				))}
				{challenge && <CourseContentChallenge challenge={challenge} />}
			</div>

			<div id="course-content-app-section" className="mt-16 mb-16 text-center">
				<h2 className="text-xl font-medium text-gray-900 mb-4">Learn with the Nice Academy Kids app!</h2>
				<p className="text-gray-700 text-base mb-6 max-w-2xl mx-auto">
					Kids ages 2-8 (preschool—2nd grade) can read, play, and learn with fun animal friends in our free interactive
					mobile app, Nice Academy Kids. We have tools for teachers, too!
				</p>
				<Button
					variant="outline"
					className="px-6 py-2 text-blue-600 border-blue-600 hover:bg-blue-50 hover:ring-2 hover:ring-blue-600 hover:cursor-not-allowed"
				>
					Learn more
				</Button>
			</div>

			<div id="course-content-unit-overview-items">
				{course.units.map((unit, index) => (
					<CourseContentUnitOverviewItem key={index} index={index} unit={unit} active={index === 0} className="mb-2" />
				))}
			</div>
		</div>
	)
}
