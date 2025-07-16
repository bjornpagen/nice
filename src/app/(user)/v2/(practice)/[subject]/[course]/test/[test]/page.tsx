import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { CourseChallengeContent } from "@/components/practice/course/challenge/course-challenge-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type CourseMaterial, getCourseBlob, getCourseMaterials, type LessonResource } from "@/lib/v2/types"

export default function PracticeCourseChallengePage({
	params
}: {
	params: Promise<{ subject: string; course: string; test: string }>
}) {
	// Chain the promise properly to handle the error case
	const challengePromise = params.then(({ subject, course, test }) => {
		logger.debug("initializing challenge page", { subject, course, test })
		return getCourseChallengeData(subject, course, test)
	})

	return (
		<div id="practice-course-challenge-page" className="h-full">
			<ErrorBoundary fallback={<PracticeCourseChallengePageErrorFallback />}>
				<React.Suspense>
					<CourseChallengeContent challengePromise={challengePromise} className="h-full bg-blue-950 text-white" />
				</React.Suspense>
			</ErrorBoundary>
		</div>
	)
}

function PracticeCourseChallengePageErrorFallback({ className }: { className?: string }) {
	return (
		<Alert variant="destructive" className={className}>
			<AlertCircleIcon />
			<AlertTitle>Unable to retrieve course challenge page content.</AlertTitle>
			<AlertDescription>Please try again later.</AlertDescription>
		</Alert>
	)
}

function getCourseChallengeData(
	subject: string,
	course: string,
	test: string
): Extract<CourseMaterial, { type: "CourseChallenge" }> | undefined {
	logger.info("course challenge data: initializing course challenge data", { subject, course, test })

	const blob = getCourseBlob(subject, course)
	logger.info("course challenge data: blob retrieved", { subject, course, test, blobKeys: _.keys(blob) })

	const materials = getCourseMaterials(blob)
	logger.info("course challenge data: materials extracted", { subject, course, test, materialCount: materials.length })

	const challengeIndex = materials.findIndex(
		(u): u is Extract<CourseMaterial, { type: "CourseChallenge" }> => u.type === "CourseChallenge" && u.slug === test
	)
	if (challengeIndex === -1) {
		logger.error("course challenge data: course challenge not found", { subject, course, test })
		return undefined
	}
	logger.info("course challenge data: challenge index found", { subject, course, test, challengeIndex })

	const challengeData = materials[challengeIndex]
	if (challengeData == null || challengeData.type !== "CourseChallenge") {
		logger.error("course challenge data: course challenge data not found", { subject, course, test })
		return undefined
	}
	logger.info("course challenge data: challenge data retrieved", {
		subject,
		course,
		test,
		challengeDataKeys: _.keys(challengeData)
	})

	let nextMaterial:
		| { type: CourseMaterial["type"]; path: string; title: string; resources?: LessonResource[] }
		| undefined = materials[challengeIndex + 1]
	if (nextMaterial != null && nextMaterial.type === "Lesson") {
		const nextFromLesson = nextMaterial.resources?.find(
			(r): r is Extract<CourseMaterial, { type: "Article" | "Exercise" | "Video" }> => r != null
		)
		if (nextFromLesson != null) {
			nextMaterial = { type: nextFromLesson.type, path: nextFromLesson.path, title: nextFromLesson.title }
		}
	}
	logger.info("course challenge data: next material identified", {
		subject,
		course,
		test,
		nextMaterial
	})

	if (nextMaterial != null) {
		challengeData.meta = {
			...challengeData.meta,
			next: { type: nextMaterial.type, path: nextMaterial.path, title: nextMaterial.title }
		}
		logger.info("course challenge data: challenge data enhanced with next material", {
			subject,
			course,
			test,
			nextMaterial
		})
	}

	return challengeData
}
