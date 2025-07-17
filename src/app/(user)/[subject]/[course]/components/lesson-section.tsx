"use client"

import Link from "next/link"
import { ActivityIcon } from "@/components/icons/activity"
import { ProficiencyIcon } from "@/components/icons/proficiency"
import { Button } from "@/components/ui/button"
import type { AssessmentProgress } from "@/lib/data/progress"
import type { Article, ExerciseInfo, Video } from "@/lib/types/content"
import type { Lesson } from "@/lib/types/structure"
import { capitalize } from "@/lib/utils"
import { Section } from "./section"

export function LessonSection({
	lesson,
	progressMap
}: {
	lesson: Lesson
	progressMap: Map<string, AssessmentProgress>
}) {
	// Use the original order from lesson.children for learning content
	const learningContent = lesson.children.filter(
		(child): child is Video | Article => child.type === "Video" || child.type === "Article"
	)

	// Extract exercises separately (they're displayed in a different section)
	const exercises = lesson.children.filter((child): child is ExerciseInfo => child.type === "Exercise")

	return (
		<Section>
			<Link href={lesson.path} className="font-bold text-gray-900 mb-2 text-md hover:underline">
				{capitalize(lesson.title)}
			</Link>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
				<div className="mb-2 mt-4">
					<span className="text-gray-500 text-sm mb-4 block">Learn</span>
					<div className="space-y-3">
						{learningContent.length > 0 ? (
							learningContent.map((item) =>
								item.type === "Video" ? (
									<LessonVideo key={`video-${item.id}`} video={item} progress={progressMap.get(item.id)} />
								) : (
									<LessonArticle key={`article-${item.id}`} article={item} progress={progressMap.get(item.id)} />
								)
							)
						) : (
							<div className="text-gray-800 text-sm">No learning content found</div>
						)}
					</div>
				</div>
				<div className="mb-2 mt-4">
					<span className="text-gray-500 text-sm mb-4 block">Practice</span>
					<div className="space-y-3">
						{exercises.length > 0 ? (
							exercises.map((exercise, index) => (
								<LessonExercise
									key={exercise.id}
									exercise={exercise}
									next={index === 0}
									progress={progressMap.get(exercise.id)}
								/>
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

function LessonVideo({ video, progress }: { video: Pick<Video, "title" | "path">; progress?: AssessmentProgress }) {
	return (
		<div className="bg-white flex items-center gap-2">
			<ActivityIcon variant="video" completed={progress?.completed || false} progress={progress?.score} />
			<Link href={video.path} className="text-gray-800 text-sm hover:underline">
				{video.title}
			</Link>
		</div>
	)
}

function LessonArticle({
	article,
	progress
}: {
	article: Pick<Article, "title" | "path">
	progress?: AssessmentProgress
}) {
	return (
		<div className="bg-white flex items-center gap-2">
			<ActivityIcon variant="article" completed={progress?.completed || false} progress={progress?.score} />
			<Link href={article.path} className="text-gray-800 text-sm hover:underline">
				{article.title}
			</Link>
		</div>
	)
}

function LessonExercise({
	exercise,
	next = false,
	progress
}: {
	exercise: ExerciseInfo
	next: boolean
	progress?: AssessmentProgress
}) {
	const showProficiency = progress?.completed && progress?.proficiency
	const isProficient = progress?.proficiency === "proficient"

	if (next && !progress?.completed) {
		return (
			<div className="bg-gray-100 rounded-xs p-2 border-t-4 border-blue-500">
				<div className="flex justify-between items-start pr-2">
					<div className="flex-1">
						<span className="text-blue-600 text-xs block mb-1">Up next for you:</span>
						<h2 className="text-sm font-semibold text-gray-900 mb-1">{exercise.title}</h2>
						<p className="text-gray-500 text-xs mb-2">
							Get {exercise.questionsToPass} out of {exercise.totalQuestions} questions to level up!
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

	// For completed exercises that are "Up next for you"
	if (next && progress?.completed) {
		return (
			<div className="bg-gray-100 rounded-xs border-t-4 border-blue-500 flex">
				<div className="flex-1 p-2">
					<span className="text-blue-600 text-xs block mb-1">Up next for you:</span>
					<h2 className="text-sm font-semibold text-gray-900 mb-1">{exercise.title}</h2>
					{!isProficient && (
						<p className="text-gray-500 text-xs mb-2">
							Get {exercise.questionsToPass} out of {exercise.totalQuestions} questions to level up!
						</p>
					)}
					<Button
						asChild
						className="bg-white text-blue-600 hover:bg-gray-100 text-xs rounded-sm px-6 py-0 border border-gray-300"
					>
						<Link href={exercise.path}>Try again</Link>
					</Button>
				</div>
				<div className="w-px bg-gray-200 mx-2" /> {/* Full height vertical separator */}
				<div className="w-16 flex items-center justify-center">
					{progress.proficiency && <ProficiencyIcon variant={progress.proficiency} className="w-5 h-5" />}
				</div>
			</div>
		)
	}

	return (
		<div className="bg-gray-100 rounded-xs p-2">
			<div className="flex justify-between items-start pr-2">
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-1">
						{showProficiency && progress.proficiency && (
							<ProficiencyIcon variant={progress.proficiency} className="w-5 h-5" />
						)}
						<h2 className="text-sm font-semibold text-gray-900">{exercise.title}</h2>
					</div>
					{showProficiency && progress.score !== undefined ? (
						<p className="text-gray-600 text-xs mb-2">
							{progress.proficiency && getProficiencyText(progress.proficiency)} • {Math.round(progress.score * 100)}%
						</p>
					) : (
						<p className="text-gray-500 text-xs mb-2">
							Get {exercise.questionsToPass} out of {exercise.totalQuestions} questions to level up!
						</p>
					)}
				</div>
				<Button
					asChild
					className={`text-xs rounded-sm px-6 py-0 flex-shrink-0 self-center w-24 ${
						progress?.completed
							? "bg-white text-blue-600 hover:bg-gray-100 border border-gray-300"
							: "bg-white text-blue-600 hover:bg-gray-100 border border-gray-300"
					}`}
				>
					<Link href={exercise.path}>{progress?.completed ? "Try again" : "Practice"}</Link>
				</Button>
			</div>
		</div>
	)
}

function getProficiencyText(proficiency: "attempted" | "familiar" | "proficient"): string {
	switch (proficiency) {
		case "attempted":
			return "Attempted"
		case "familiar":
			return "Familiar"
		case "proficient":
			return "Proficient"
	}
}
