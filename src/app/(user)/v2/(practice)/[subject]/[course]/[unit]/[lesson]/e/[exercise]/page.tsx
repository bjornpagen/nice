import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { LessonExerciseContent } from "@/components/practice/course/unit/lesson/exercise/lesson-exercise-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type CourseMaterial, getCourseBlob, getCourseMaterials, type LessonResource } from "@/lib/v2/types"

export default function PracticeExercisePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; exercise: string }>
}) {
	// Chain the promise properly to handle the error case
	const exercisePromise = params.then(({ subject, course, unit, lesson, exercise }) => {
		logger.debug("initializing exercise page", { subject, course, unit, lesson, exercise })
		return getExerciseData(subject, course, unit, lesson, exercise)
	})

	return (
		<div id="practice-exercise-page" className="h-full">
			<ErrorBoundary fallback={<PracticeExercisePageErrorFallback />}>
				<React.Suspense>
					<LessonExerciseContent exercisePromise={exercisePromise} className="h-full bg-blue-950 text-white" />
				</React.Suspense>
			</ErrorBoundary>
		</div>
	)
}

function PracticeExercisePageErrorFallback({ className }: { className?: string }) {
	return (
		<Alert variant="destructive" className={className}>
			<AlertCircleIcon />
			<AlertTitle>Unable to retrieve exercise page content.</AlertTitle>
			<AlertDescription>Please try again later.</AlertDescription>
		</Alert>
	)
}

function getExerciseData(
	subject: string,
	course: string,
	unit: string,
	lesson: string,
	exercise: string
): Extract<CourseMaterial, { type: "Exercise" }> | undefined {
	logger.info("lesson exercise data: initializing lesson exercise data", { subject, course, unit, lesson, exercise })

	const blob = getCourseBlob(subject, course)
	logger.info("lesson exercise data: blob retrieved", {
		subject,
		course,
		unit,
		lesson,
		exercise,
		blobKeys: _.keys(blob)
	})

	const materials = getCourseMaterials(blob)
	logger.info("lesson exercise data: materials extracted", {
		subject,
		course,
		unit,
		lesson,
		exercise,
		materialCount: materials.length
	})

	const lessonIndex = materials.findIndex(
		(m): m is Extract<CourseMaterial, { type: "Lesson" }> => m.type === "Lesson" && m.slug === lesson
	)
	if (lessonIndex === -1) {
		logger.error("lesson exercise data: lesson index not found", { subject, course, unit, lesson, exercise })
		return undefined
	}
	logger.info("lesson exercise data: lesson index found", { subject, course, unit, lesson, lessonIndex })

	const lessonData = materials[lessonIndex]
	if (lessonData == null || lessonData.type !== "Lesson") {
		logger.error("lesson exercise data: lesson data not found", { subject, course, unit, lesson, exercise })
		return undefined
	}
	logger.info("lesson exercise data: lesson data retrieved", {
		subject,
		course,
		unit,
		lesson,
		lessonDataKeys: _.keys(lessonData)
	})

	const exerciseIndex = lessonData.resources.findIndex(
		(r): r is Extract<CourseMaterial, { type: "Exercise" }> => r.type === "Exercise" && r.slug === exercise
	)
	if (exerciseIndex === -1) {
		logger.error("lesson exercise data: exercise index not found", { subject, course, unit, lesson, exercise })
		return undefined
	}
	logger.info("lesson exercise data: exercise index found", { subject, course, unit, lesson, exercise, exerciseIndex })

	const exerciseData = lessonData.resources[exerciseIndex]
	if (exerciseData == null || exerciseData.type !== "Exercise") {
		logger.error("lesson exercise data: exercise data not found", { subject, course, unit, lesson, exercise })
		return undefined
	}
	logger.info("lesson exercise data: exercise data retrieved", {
		subject,
		course,
		unit,
		lesson,
		exercise,
		exerciseDataKeys: _.keys(exerciseData)
	})

	// Stupid typescript fuckery to get the compiler to understand that the meta object is valid.
	const enhancedExerciseData: Extract<CourseMaterial, { type: "Exercise" }> = {
		...exerciseData,
		meta: {
			...exerciseData.meta,
			unit: lessonData.meta.unit
		}
	}
	logger.info("lesson exercise data: exercise data enhanced with unit", {
		subject,
		course,
		unit,
		lesson,
		exercise,
		exerciseDataKeys: _.keys(enhancedExerciseData)
	})

	let nextMaterial: { type: CourseMaterial["type"]; title: string; resources?: LessonResource[] } | undefined =
		lessonData.resources[exerciseIndex + 1]
	if (nextMaterial == null) {
		nextMaterial = materials[lessonIndex + 1]
	}
	if (nextMaterial != null && nextMaterial.type === "Lesson") {
		nextMaterial = nextMaterial.resources?.find(
			(r): r is Extract<CourseMaterial, { type: "Article" | "Exercise" | "Video" }> => r != null
		)
	}
	logger.info("lesson exercise data: next material identified", {
		subject,
		course,
		unit,
		lesson,
		exercise,
		nextMaterialKeys: _.keys(nextMaterial)
	})

	if (nextMaterial != null) {
		enhancedExerciseData.meta = {
			...enhancedExerciseData.meta,
			next: { type: nextMaterial.type, title: nextMaterial.title }
		}
		logger.info("lesson exercise data: exercise data enhanced with next material", {
			subject,
			course,
			unit,
			lesson,
			exercise,
			nextType: nextMaterial.type,
			nextTitle: nextMaterial.title
		})
	}

	return enhancedExerciseData
}
