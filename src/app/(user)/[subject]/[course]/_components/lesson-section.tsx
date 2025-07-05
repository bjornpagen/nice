"use client"

import _ from "lodash"
import Link from "next/link"
import { ActivityIcon } from "@/components/icons/activity"
import { Button } from "@/components/ui/button"
import type { Exercise, Lesson, Video } from "../[unit]/page"
import { Section } from "./section"

export function LessonSection({
	lesson,
	videos,
	exercises
}: {
	lesson: Lesson
	videos: Video[]
	exercises: Exercise[]
}) {
	return (
		<Section>
			<Link href={lesson.path} className="font-bold text-gray-900 mb-2 text-md hover:underline">
				{_.capitalize(lesson.title)}
			</Link>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
				<div className="mb-2 mt-4">
					<span className="text-gray-500 text-sm mb-4 block">Learn</span>
					<div className="space-y-3">
						{videos.length > 0 ? (
							videos.map((video) => <LessonVideo key={video.id} video={video} />)
						) : (
							<div className="text-gray-800 text-sm">No videos found</div>
						)}
					</div>
				</div>
				<div className="mb-2 mt-4">
					<span className="text-gray-500 text-sm mb-4 block">Practice</span>
					<div className="space-y-3">
						{exercises.length > 0 ? (
							exercises.map((exercise, index) => (
								<LessonExercise key={exercise.id} exercise={exercise} next={index === 0} />
							))
						) : (
							<div className="text-gray-800 text-sm">No exercises found</div>
						)}
					</div>
				</div>
			</div>
		</Section>
	)
}

function LessonVideo({ video }: { video: Pick<Video, "title" | "path"> }) {
	return (
		<div className="bg-white flex items-center gap-2">
			<ActivityIcon variant="video" />
			<Link href={video.path} className="text-gray-800 text-sm hover:underline">
				{video.title}
			</Link>
		</div>
	)
}

function LessonExercise({ exercise, next = false }: { exercise: Exercise; next: boolean }) {
	if (next) {
		return (
			<div className="bg-gray-100 rounded-xs p-2 border-t-4 border-blue-500">
				<div className="flex justify-between items-start pr-2">
					<div className="flex-1">
						<span className="text-blue-600 text-xs block mb-1">Up next for you:</span>
						<h2 className="text-sm font-semibold text-gray-900 mb-1">{exercise.title}</h2>
						<p className="text-gray-500 text-xs mb-2">
							Get {exercise.questions.length <= 0 ? 0 : exercise.questions.length - 1} out of{" "}
							{exercise.questions.length} questions to level up!
						</p>
					</div>
					<Button
						asChild
						className="bg-blue-600 text-white hover:bg-blue-700 text-xs rounded-sm px-6 py-0 flex-shrink-0 self-center w-24"
					>
						<Link href={exercise.path}>Start</Link>
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="bg-gray-100 rounded-xs p-2">
			<div className="flex justify-between items-start pr-2">
				<div className="flex-1">
					<h2 className="text-sm font-semibold text-gray-900 mb-1">{exercise.title}</h2>
					<p className="text-gray-500 text-xs mb-2">
						Get {exercise.questions.length <= 0 ? 0 : exercise.questions.length - 1} out of {exercise.questions.length}{" "}
						questions to level up!
					</p>
				</div>
				<Button
					asChild
					className="bg-white text-blue-600 hover:bg-gray-100 text-xs rounded-sm px-6 py-0 border border-gray-300 flex-shrink-0 self-center w-24"
				>
					<Link href={exercise.path}>Practice</Link>
				</Button>
			</div>
		</div>
	)
}
