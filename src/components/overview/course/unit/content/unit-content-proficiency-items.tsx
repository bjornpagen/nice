import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import _ from "lodash"
import Link from "next/link"
import { ProficiencyIcon } from "@/components/overview/proficiency-icons"
import { cn } from "@/lib/utils"
import type { UnitContentData } from "./unit-content"

export function UnitContentProficiencyItems({
	unit,
	className
}: {
	unit: Pick<UnitContentData, "lessons" | "resources">
	className?: string
}) {
	logger.debug("initializing unit proficiency items", {
		lessons: unit.lessons.length,
		resources: unit.resources.length
	})

	const exercises = _.filter(
		_.flatMap(unit.lessons, (lesson) => lesson.resources),
		(resource) => resource.type === "Exercise"
	)
	logger.debug("exercises", { exercises: exercises.length })

	const resources = [...exercises, ...unit.resources]
	logger.debug("resources", { resources: resources.length })

	return (
		<div id="unit-content-proficiency-item" className={cn("flex items-center gap-1", className)}>
			{resources.map((resource) => (
				<ResourceProficiencyIcon key={resource.slug} resource={resource} />
			))}
		</div>
	)
}

function ResourceProficiencyIcon({
	resource
}: {
	resource: UnitContentData["lessons"][number]["resources"][number] | UnitContentData["resources"][number]
}) {
	switch (resource.type) {
		case "Exercise":
			return (
				<Link href={resource.path} className="inline-flex items-center">
					<ProficiencyIcon variant="not-started" side="bottom">
						<h2 className="text-md font-bold text-gray-800 capitalize">Exercise: {resource.title}</h2>
						<p className="text-sm text-gray-500">Preview is not available for this exercise.</p>
					</ProficiencyIcon>
				</Link>
			)
		case "Quiz":
			return (
				<Link href={resource.path} className="inline-flex items-center">
					<ProficiencyIcon variant="quiz">
						<h2 className="text-md font-bold text-gray-800 capitalize">Quiz: {resource.title}</h2>
						<p className="text-sm text-gray-500">Preview is not available for this quiz.</p>
					</ProficiencyIcon>
				</Link>
			)
		case "UnitTest":
			return (
				<Link href={resource.path} className="inline-flex items-center">
					<ProficiencyIcon variant="unit-test">
						<h2 className="text-md font-bold text-gray-800 capitalize">Unit Test: {resource.title}</h2>
						<p className="text-sm text-gray-500">Preview is not available for this unit test.</p>
					</ProficiencyIcon>
				</Link>
			)
		default:
			throw errors.new(`invalid resource type: ${resource.type}`)
	}
}
