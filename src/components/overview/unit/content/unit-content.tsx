"use client"

import _ from "lodash"
import { notFound } from "next/navigation"
import * as React from "react"
import { ContentHeader } from "@/components/overview/content-header"
import type { Lesson, LessonResource, Prettify, Unit, UnitResource } from "@/components/overview/types"
import { UnitContentBreadcrumbs } from "./unit-content-breadcrumbs"
import { UnitContentLessonSection } from "./unit-content-lesson-section"
import { UnitContentProficiencyItems } from "./unit-content-proficiency-items"
import { UnitContentQuizSection } from "./unit-content-quiz-section"
import { UnitContentSection } from "./unit-content-section"
import { UnitContentUnitTestSection } from "./unit-content-unit-test-section"

export type UnitContentData = Prettify<
	Pick<Unit, "path" | "title" | "description"> & {
		lessons: Array<
			Prettify<
				Pick<Lesson, "slug" | "path" | "title"> & {
					resources: Array<LessonResource>
				} & { type: "Lesson" }
			>
		>
		resources: Array<Prettify<Omit<UnitResource, "data">>>
	}
>

export function UnitContent({ unitPromise }: { unitPromise: Promise<UnitContentData | undefined> }) {
	const unit = React.use(unitPromise)
	if (unit == null) {
		notFound()
	}

	const materials = _.concat<UnitContentData["lessons"][number] | UnitContentData["resources"][number]>(
		unit.lessons,
		unit.resources
	)

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

			<div id="unit-content-materials">
				{materials.map((material, index) => (
					<UnitContentMaterialSection key={index} index={index} material={material} />
				))}
			</div>
		</div>
	)
}
function UnitContentMaterialSection({
	index,
	material
}: {
	index: number
	material: UnitContentData["lessons"][number] | UnitContentData["resources"][number]
}) {
	switch (material.type) {
		case "Lesson":
			return <UnitContentLessonSection key={index} index={index} lesson={material} />
		case "Quiz":
			return <UnitContentQuizSection key={index} index={index} quiz={material} />
		case "UnitTest":
			return <UnitContentUnitTestSection key={index} index={index} unitTest={material} />
		default:
			return undefined
	}
}
