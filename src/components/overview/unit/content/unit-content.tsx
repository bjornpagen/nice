"use client"

import { notFound } from "next/navigation"
import * as React from "react"
import { ContentHeader } from "@/components/overview/content-header"
import type { Lesson, LessonResource, Prettify, Unit, UnitResource } from "@/components/overview/types"
import { UnitContentBreadcrumbs } from "./unit-content-breadcrumbs"
import { UnitContentLessonSection } from "./unit-content-lesson-section"
import { UnitContentProficiencyItems } from "./unit-content-proficiency-items"
import { UnitContentSection } from "./unit-content-section"

export type UnitContentData = Prettify<
	Pick<Unit, "path" | "title" | "description"> & {
		lessons: Array<
			Pick<Lesson, "slug" | "path" | "title"> & {
				resources: Array<LessonResource>
			}
		>
		resources: Array<Pick<UnitResource, "slug" | "path" | "title" | "type">>
	}
>

export function UnitContent({ unitPromise }: { unitPromise: Promise<UnitContentData | undefined> }) {
	const unit = React.use(unitPromise)
	if (unit == null) {
		notFound()
	}

	return (
		<div id="unit-content">
			<div id="unit-content-header">
				<UnitContentBreadcrumbs unit={unit} className="mb-4" />
				<ContentHeader title={unit.title} points={0} className="mb-4" />

				<UnitContentProficiencyItems unit={unit} className="mb-4" />
			</div>

			{/* Separator */}
			<div className="border-b border-gray-400 mb-3" />

			<div id="unit-content-about-section">
				<UnitContentSection>
					<h2 className="text-lg font-medium mb-2">About this unit</h2>
					<p className="text-sm text-gray-500">{unit.description}</p>
				</UnitContentSection>
			</div>

			<div id="unit-content-lessons">
				{unit.lessons.map((lesson, index) => (
					<UnitContentLessonSection key={index} index={index} lesson={lesson} />
				))}
			</div>
		</div>
	)
}
