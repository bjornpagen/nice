"use client"

import * as React from "react"
import { useUser } from "@clerk/nextjs"
import { useCoursePolling } from "@/hooks/use-course-polling"
import { fetchStudentCourseProgress } from "./actions"
import type { MergedLessonPlan, ProcessedComponent } from "@/lib/powerpath-progress"
import { MASTERY_THRESHOLD } from "@/lib/powerpath-progress"
import type { CourseProgressionStatus } from "@/lib/actions/course-progression"
import { checkAndProgressCourses } from "@/lib/actions/course-progression"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

function ComponentTree({ component, depth = 0 }: { component: ProcessedComponent; depth?: number }) {
	const indent = depth * 20

	return (
		<div style={{ marginLeft: `${indent}px` }} className="border-l-2 border-border pl-4 my-2">
			<div className="flex items-center gap-4">
				<div className="flex-1">
					<div className="font-semibold">{component.title}</div>
					<div className="text-sm text-muted-foreground">id: {component.sourcedId}</div>
				</div>
				<div className="flex items-center gap-2">
					<div
						className={`px-2 py-1 rounded text-xs font-medium ${
							component.componentProgress.status === "completed"
								? "bg-green-500/20 text-green-500"
								: component.componentProgress.status === "in_progress"
									? "bg-yellow-500/20 text-yellow-500"
									: "bg-gray-500/20 text-gray-500"
						}`}
					>
						{component.componentProgress.status}
					</div>
					<div className="text-sm font-mono">{Math.round(component.componentProgress.progress)}%</div>
				</div>
			</div>

			{component.componentResources && component.componentResources.length > 0 && (
				<div className="mt-2 space-y-1">
					{component.componentResources.map((resource) => (
						<div key={resource.sourcedId} className="text-sm flex items-center gap-2 bg-muted p-2 rounded">
							<div className="flex-1">
								<span className="font-medium">resource:</span> {resource.title ?? resource.sourcedId}
							</div>
							<div
								className={`px-2 py-0.5 rounded text-xs ${
									resource.componentProgress.status === "completed"
										? "bg-green-500/20 text-green-500"
										: resource.componentProgress.status === "in_progress"
											? "bg-yellow-500/20 text-yellow-500"
											: "bg-gray-500/20 text-gray-500"
								}`}
							>
								{Math.round(resource.componentProgress.progress)}%
							</div>
						</div>
					))}
				</div>
			)}

			{component.items && component.items.length > 0 && (
				<div className="mt-2">
					{component.items.map((item) => (
						<ComponentTree key={item.sourcedId} component={item} depth={depth + 1} />
					))}
				</div>
			)}
		</div>
	)
}

export default function PollingDebugPage() {
	const { user, isLoaded } = useUser()
	
	// basic polling state
	const [pollCount, setPollCount] = React.useState(0)
	const [lastSuccess, setLastSuccess] = React.useState<string | undefined>(undefined)
	const [lastError, setLastError] = React.useState<string | undefined>(undefined)
	const [enabled, setEnabled] = React.useState(true)

	// progress polling state
	const [progressEnabled, setProgressEnabled] = React.useState(false)
	const [courseId, setCourseId] = React.useState("")
	const [lessonPlan, setLessonPlan] = React.useState<MergedLessonPlan | undefined>(undefined)
	const [progressError, setProgressError] = React.useState<string | undefined>(undefined)

	// auto-progression state
	const [autoProgressEnabled, setAutoProgressEnabled] = React.useState(false)
	const [progressionStatuses, setProgressionStatuses] = React.useState<CourseProgressionStatus[]>([])
	const [progressionError, setProgressionError] = React.useState<string | undefined>(undefined)

	// extract sourceId from clerk metadata
	const sourceId = React.useMemo(() => {
		if (!isLoaded || !user) return undefined
		const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
		if (!metadataValidation.success) return undefined
		return metadataValidation.data.sourceId
	}, [isLoaded, user])

	useCoursePolling({
		interval: 5 * 1000,
		enabled: progressEnabled && !!courseId && !!sourceId,
		pollFn: async () => {
			if (!sourceId) {
				throw new Error("no sourceId available")
			}
			const result = await fetchStudentCourseProgress(courseId, sourceId)
			return result
		},
		onUpdate: (data) => {
			setLessonPlan(data)
			setProgressError(undefined)
		},
		onError: (error) => {
			setProgressError(`error: ${error.message}`)
		}
	})

	useCoursePolling({
		interval: 5 * 1000,
		enabled: autoProgressEnabled,
		pollFn: async () => {
			const result = await checkAndProgressCourses()
			return result
		},
		onUpdate: (statuses) => {
			setProgressionStatuses(statuses)
			setProgressionError(undefined)
		},
		onError: (error) => {
			setProgressionError(`error: ${error.message}`)
		}
	})

	return (
		<div className="container mx-auto p-8 space-y-8">
			<h1 className="text-3xl font-bold">polling test</h1>

			{/* PowerPath Progress Polling */}
			<div className="space-y-4 border-t pt-8">
				<h2 className="text-2xl font-semibold">powerpath progress polling</h2>

				<div className="bg-card p-4 rounded-lg border space-y-4">
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium mb-1">current user sourceId</label>
							<div className="px-3 py-2 border rounded-md bg-muted font-mono text-sm">
								{sourceId ?? "not available (no sourceId in metadata)"}
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1">course id</label>
							<input
								type="text"
								value={courseId}
								onChange={(e) => setCourseId(e.target.value)}
								placeholder="enter course sourced id"
								className="w-full px-3 py-2 border rounded-md bg-background"
							/>
						</div>
					</div>

					<button
						type="button"
						onClick={() => setProgressEnabled(!progressEnabled)}
						disabled={!courseId || !sourceId}
						className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{progressEnabled ? "disable" : "enable"} progress polling
					</button>

					{!sourceId && (
						<div className="text-yellow-500 text-sm">
							⚠️ no sourceId found in user metadata. ensure you're logged in and synced.
						</div>
					)}

					{progressError && (
						<div className="text-red-500 font-mono text-sm">
							{progressError}
						</div>
					)}
				</div>

				{lessonPlan && (
					<div className="bg-card p-4 rounded-lg border">
						<h3 className="text-xl font-semibold mb-4">
							lesson plan: {lessonPlan.course.title as string}
						</h3>
						<div className="space-y-2">
							{lessonPlan.components.map((component) => (
								<ComponentTree key={component.sourcedId} component={component} />
							))}
						</div>
					</div>
				)}
			</div>

			{/* Auto-Progression Polling */}
			<div className="space-y-4 border-t pt-8">
				<h2 className="text-2xl font-semibold">auto-progression polling</h2>

				<div className="bg-card p-4 rounded-lg border space-y-4">
					<p className="text-sm text-muted-foreground">
						automatically enroll in next science course when current course reaches {MASTERY_THRESHOLD}% completion
					</p>

					<button
						type="button"
						onClick={() => setAutoProgressEnabled(!autoProgressEnabled)}
						className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
					>
						{autoProgressEnabled ? "disable" : "enable"} auto-progression
					</button>

					{progressionError && <div className="text-red-500 font-mono text-sm">{progressionError}</div>}
				</div>

				{progressionStatuses.length > 0 && (
					<div className="bg-card p-4 rounded-lg border">
						<h3 className="text-xl font-semibold mb-4">progression status</h3>
						<div className="space-y-3">
							{progressionStatuses.map((status) => (
								<div key={status.currentCourseId} className="border-l-4 pl-4 border-border">
									<div className="flex items-center justify-between mb-1">
										<div className="font-semibold">{status.currentCourseId}</div>
										<div
											className={`text-lg font-mono ${
												status.currentCourseProgress >= MASTERY_THRESHOLD
													? "text-green-500"
													: "text-yellow-500"
											}`}
										>
											{Math.round(status.currentCourseProgress)}%
										</div>
									</div>
									{status.nextCourseId && (
										<div className="text-sm space-y-1">
											<div>next course: {status.nextCourseId}</div>
											{status.alreadyEnrolledInNext && (
												<div className="text-green-500">✓ already enrolled</div>
											)}
											{status.shouldEnrollNext && (
												<div className="text-blue-500 font-medium">→ enrolling automatically</div>
											)}
											{!status.shouldEnrollNext &&
												!status.alreadyEnrolledInNext &&
												status.currentCourseProgress < MASTERY_THRESHOLD && (
													<div className="text-muted-foreground">
														needs {MASTERY_THRESHOLD - Math.round(status.currentCourseProgress)}% more to unlock
													</div>
												)}
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Info */}
			<div className="mt-8 p-4 bg-muted rounded-lg">
				<h3 className="font-semibold mb-2">how it works:</h3>
				<ul className="list-disc list-inside space-y-1 text-sm">
					<li>basic polling tests random success/failure every 15s</li>
					<li>progress polling fetches powerpath lesson plan + progress data every 15s</li>
					<li>progress is merged into the lesson plan structure</li>
					<li>tree view shows hierarchical components with progress percentages</li>
					<li>color coding: green (completed), yellow (in progress), gray (not started)</li>
					<li>
						auto-progression checks all enrolled science courses every 15s and enrolls in next course when ≥
						{MASTERY_THRESHOLD}%
					</li>
				</ul>
			</div>
		</div>
	)
}

