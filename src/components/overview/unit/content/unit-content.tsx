"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { ContentHeader } from "@/components/overview/content-header"
import { UnitContentBreadcrumbs } from "./unit-content-breadcrumbs"
import { UnitContentProficiencyItems } from "./unit-content-proficiency-items"

export type Lesson = {
	slug: string
	path: string
	type: "exercise" | "quiz" | "unit-test"
	title: string
}

export type Unit = {
	slug: string
	path: string
	title: string
	lessons: Lesson[]
}

export function UnitContent({ unitPromise }: { unitPromise: Promise<Unit> }) {
	const unit = React.use(unitPromise)
	if (unit.path === "") {
		throw errors.new("unit data is invalid")
	}

	return (
		<div id="unit-content">
			<div id="unit-content-header">
				<UnitContentBreadcrumbs unit={unit} className="mb-4" />
				<ContentHeader title={unit.title} points={0} className="mb-4" />

				<UnitContentProficiencyItems lessons={unit.lessons} className="mb-4" />
			</div>
		</div>
	)
}
