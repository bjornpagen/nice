import _ from "lodash"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LearningContentIcon } from "../../learning-content-icons"
import type { UnitContentData } from "./unit-content"
import { UnitContentSection } from "./unit-content-section"

export function UnitContentLessonSection({
	index,
	lesson,
	className
}: {
	index: number
	lesson: UnitContentData["lessons"][number]
	className?: string
}) {
	const exerciseContents = _.filter(
		lesson.resources,
		(resource): resource is Extract<typeof resource, { type: "Exercise" }> => resource.type === "Exercise"
	)
	const learningContents = _.filter(
		lesson.resources,
		(resource): resource is Extract<typeof resource, { type: "Video" | "Article" }> => resource.type !== "Exercise"
	)

	return (
		<UnitContentSection className={className}>
			<Link href={lesson.path} className="font-medium text-gray-900 mb-2 text-md hover:underline capitalize">
				{lesson.title}
			</Link>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
				<div className="mb-2 mt-4">
					<span className="text-gray-500 text-sm mb-4 block">Learn</span>

					<div className="space-y-3">
						{learningContents.length > 0 ? (
							learningContents.map((resource) => (
								<LessonResourceLearningContentItem key={resource.slug} resource={resource} />
							))
						) : (
							<div className="text-gray-800 text-sm">No learning content found.</div>
						)}
					</div>
				</div>

				<div className="mb-2 mt-4">
					<span className="text-gray-500 text-sm mb-4 block">Practice</span>

					<div className="space-y-3">
						{exerciseContents.length > 0 ? (
							exerciseContents.map((exercise, i) => (
								<LessonResourceExerciseContentItem
									key={exercise.slug}
									exercise={exercise}
									active={index === 0 && i === 0}
								/>
							))
						) : (
							<div className="text-gray-800 text-sm">No exercise content found.</div>
						)}
					</div>
				</div>
			</div>
		</UnitContentSection>
	)
}

function LessonResourceLearningContentItem({
	resource
}: {
	resource: Extract<UnitContentData["lessons"][number]["resources"][number], { type: "Video" | "Article" }>
}) {
	switch (resource.type) {
		case "Video":
			return <LessonVideoLearningContentItem resource={resource} />
		case "Article":
			return <LessonArticleLearningContentItem resource={resource} />
		default:
			return undefined
	}
}

function LessonArticleLearningContentItem({
	resource
}: {
	resource: Extract<UnitContentData["lessons"][number]["resources"][number], { type: "Article" }>
}) {
	if (resource.type !== "Article") {
		return undefined
	}

	return (
		<Link href={resource.path} className="bg-white flex items-center gap-2 text-gray-800 text-sm hover:underline">
			<LearningContentIcon variant="article" />
			{resource.title}
		</Link>
	)
}

function LessonVideoLearningContentItem({
	resource
}: {
	resource: Extract<UnitContentData["lessons"][number]["resources"][number], { type: "Video" }>
}) {
	if (resource.type !== "Video") {
		return undefined
	}

	return (
		<Link href={resource.path} className="bg-white flex items-center gap-2 text-gray-800 text-sm hover:underline">
			<LearningContentIcon variant="video" />
			{resource.title}
		</Link>
	)
}

function LessonResourceExerciseContentItem({
	exercise,
	active = false
}: {
	exercise: Extract<UnitContentData["lessons"][number]["resources"][number], { type: "Exercise" }>
	active: boolean
}) {
	const questions = exercise.data.questions.length

	let buttonClassName =
		"bg-white text-blue-600 hover:bg-gray-100 text-xs rounded-sm px-6 py-0 border border-gray-300 flex-shrink-0 self-center w-24"
	if (active) {
		buttonClassName =
			"bg-blue-600 text-white hover:bg-blue-700 text-xs rounded-sm px-6 py-0 flex-shrink-0 self-center w-24"
	}

	return (
		<div
			className={cn(
				"bg-gray-100 rounded-xs p-2 flex justify-between items-start pr-2",
				active && "border-t-4 border-blue-500"
			)}
		>
			<div className="flex-1 flex flex-col justify-center">
				{active && <span className="text-blue-600 text-xs mb-1">Up next for you:</span>}

				<Link href={exercise.path} className="text-sm font-semibold text-gray-900 mb-1 hover:underline">
					{exercise.title}
				</Link>

				<p className="text-gray-500 text-xs mb-2">
					Get {questions <= 0 ? 0 : questions - 1} out of {questions} questions to level up!
				</p>
			</div>
			<div className="flex-none self-center">
				<Button asChild className={buttonClassName}>
					<Link href={exercise.path}>{active ? "Start" : "Practice"}</Link>
				</Button>
			</div>
		</div>
	)
}
