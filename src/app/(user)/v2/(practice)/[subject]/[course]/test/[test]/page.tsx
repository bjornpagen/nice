import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { CourseChallengeContent } from "@/components/practice/course/challenge/course-challenge-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type CourseResource, getCourseBlob } from "@/lib/v2/types"

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
): Extract<CourseResource, { type: "CourseChallenge" }> | undefined {
	logger.debug("course challenge data: initializing course challenge data", { subject, course, test })

	const blob = getCourseBlob(subject, course)
	logger.debug("course challenge data: blob", { blob })

	const challengeData = _.find(
		blob.resources,
		(r): r is Extract<CourseResource, { type: "CourseChallenge" }> => r.type === "CourseChallenge" && r.slug === test
	)
	if (challengeData == null) {
		logger.error("course challenge data: course challenge not found", { subject, course, test })
		return undefined
	}

	return challengeData
}
