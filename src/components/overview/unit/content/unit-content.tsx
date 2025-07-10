"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { ContentHeader } from "@/components/overview/content-header"
import type { Lesson, LessonResource, Prettify, Unit, UnitResource } from "@/components/overview/types"
import { UnitContentBreadcrumbs } from "./unit-content-breadcrumbs"
import { UnitContentLessonOverview } from "./unit-content-lesson-overview"
import { UnitContentProficiencyItems } from "./unit-content-proficiency-items"

export type UnitContentData = Prettify<
	Pick<Unit, "path" | "title"> & {
		lessons: Array<
			Pick<Lesson, "slug" | "path" | "title"> & {
				resources: Array<Pick<LessonResource, "slug" | "path" | "title" | "type">>
			}
		>
		resources: Array<Pick<UnitResource, "slug" | "path" | "title" | "type">>
	}
>

export function UnitContent({ unitPromise }: { unitPromise: Promise<UnitContentData> }) {
	const unit = React.use(unitPromise)
	if (unit.path === "") {
		throw errors.new("unit data is invalid")
	}

	return (
		<div id="unit-content">
			<div id="unit-content-header">
				<UnitContentBreadcrumbs unit={unit} className="mb-4" />
				<ContentHeader title={unit.title} points={0} className="mb-4" />

				<UnitContentProficiencyItems unit={unit} className="mb-4" />
			</div>

			<div className="border-b border-gray-200 mb-3" />

			<div id="unit-content-lessons">
				{unit.lessons.map((lesson, index) => (
					<UnitContentLessonOverview key={index} lesson={lesson} />
				))}
			</div>
		</div>
	)
}
