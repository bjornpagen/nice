"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import { Lock, Unlock } from "lucide-react"
import * as React from "react"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { useLessonProgress } from "@/components/practice/lesson-progress-context"
import { QTIRenderer } from "@/components/qti-renderer"
import { Button } from "@/components/ui/button"
import { sendCaliperTimeSpentEvent } from "@/lib/actions/caliper"
import { trackArticleView } from "@/lib/actions/tracking"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { ArticlePageData } from "@/lib/types/page"

export function Content({
	articlePromise,
	paramsPromise
}: {
	articlePromise: Promise<ArticlePageData>
	paramsPromise: Promise<{ subject: string; course: string; unit: string; lesson: string; article: string }>
}) {
	const article = React.use(articlePromise)
	const params = React.use(paramsPromise)
	const { user } = useUser()
	const startTimeRef = React.useRef<Date | null>(null)
	const { setCurrentResourceCompleted, setProgressForResource, beginProgressUpdate, endProgressUpdate } =
		useLessonProgress()
	const { resourceLockStatus, setResourceLockStatus, initialResourceLockStatus, storageKey } = useCourseLockStatus()
	const allUnlocked = Object.values(resourceLockStatus).every((isLocked) => !isLocked)
	const parsed = ClerkUserPublicMetadataSchema.safeParse(user?.publicMetadata)
	const canUnlockAll = parsed.success && parsed.data.roles.some((r) => r.role !== "student")

	const handleToggleLockAll = () => {
		if (!canUnlockAll) return
		if (allUnlocked) {
			setResourceLockStatus(initialResourceLockStatus)
			if (typeof window !== "undefined") {
				window.localStorage.removeItem(storageKey)
			}
			return
		}
		const unlockedStatus = Object.fromEntries(Object.keys(resourceLockStatus).map((key) => [key, false]))
		setResourceLockStatus(unlockedStatus)
		if (typeof window !== "undefined") {
			window.localStorage.setItem(storageKey, "1")
		}
	}

	React.useEffect(() => {
		// Record the start time when component mounts
		startTimeRef.current = new Date()

		let onerosterUserSourcedId: string | undefined
		let userEmail: string | undefined

		if (user) {
			const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
			if (!parsed.success) {
				throw parsed.error
			}
			onerosterUserSourcedId = parsed.data.sourceId
			userEmail = user.primaryEmailAddress?.emailAddress
		}

		if (onerosterUserSourcedId && article.id) {
			// Track article view on mount and refresh route so server-fetched progress updates immediately
			void (async () => {
				beginProgressUpdate(article.id)
				const result = await errors.try(
					trackArticleView(onerosterUserSourcedId, article.id, {
						subjectSlug: params.subject,
						courseSlug: params.course
					})
				)
				if (!result.error) {
					// update local overlay for immediate sidebar state
					setProgressForResource(article.id, { completed: true })
				}
				endProgressUpdate(article.id)
			})()

			// Map subject string to the enum value
			const subjectMapping: Record<string, "Science" | "Math" | "Reading" | "Language" | "Social Studies" | "None"> = {
				science: "Science",
				math: "Math",
				reading: "Reading",
				language: "Language",
				"social-studies": "Social Studies"
			}
			const mappedSubject = subjectMapping[params.subject]
			if (!mappedSubject) {
				// CRITICAL: Subject is unmapped. This indicates a configuration or routing error.
				throw errors.new("article tracking: unmapped subject")
			}

			// Cleanup function to send time spent event when component unmounts
			return () => {
				if (startTimeRef.current && user && onerosterUserSourcedId && userEmail) {
					const endTime = new Date()
					const durationInSeconds = Math.floor((endTime.getTime() - startTimeRef.current.getTime()) / 1000)

					// Only send if user spent at least 1 second on the article
					if (durationInSeconds >= 1) {
						// Ensure actor is valid before sending.
						const actorForCleanup = {
							id: `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${onerosterUserSourcedId}`,
							type: "TimebackUser" as const,
							email: userEmail
						}

						// Ensure context is valid before sending.
						const contextForCleanup = {
							id: `${process.env.NEXT_PUBLIC_APP_DOMAIN}/${params.subject}/${params.course}/${params.unit}/${params.lesson}/a/${params.article}`,
							type: "TimebackActivityContext" as const,
							subject: mappedSubject,
							app: { name: "Nice Academy" },
							course: { name: params.course },
							activity: {
								name: article.title,
								id: article.id
							},
							process: false
						}
						void sendCaliperTimeSpentEvent(actorForCleanup, contextForCleanup, durationInSeconds)
						// Mark article as completed locally to enable Continue
						setCurrentResourceCompleted(true)
					}
				}
			}
		}
	}, [
		user,
		article.id,
		article.title,
		params.subject,
		params.course,
		params.unit,
		params.lesson,
		params.article,
		setCurrentResourceCompleted,
		setProgressForResource,
		beginProgressUpdate,
		endProgressUpdate
	])

	return (
		<div className="bg-white h-full flex flex-col">
			{/* Article Header */}
			<div className="bg-white p-6 border-b border-gray-200 flex-shrink-0">
				<div className="flex items-center justify-between">
					<div className="w-24" />
					<div className="text-center flex-1">
						<h1 className="text-2xl font-bold text-gray-800">{article.title}</h1>
					</div>
					<div className="w-24 flex justify-end">
						{canUnlockAll && (
							<Button onClick={handleToggleLockAll} variant="outline" size="sm">
								{allUnlocked ? (
									<>
										<Lock className="w-4 h-4 mr-2" /> Restore Locks
									</>
								) : (
									<>
										<Unlock className="w-4 h-4 mr-2" /> Unlock All
									</>
								)}
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Article Content - Render through QTI */}
			<div className="flex-1 overflow-y-auto">
				<QTIRenderer
					identifier={article.id}
					materialType="stimulus"
					height="100%"
					width="100%"
					className="w-full h-full"
				/>
			</div>
		</div>
	)
}
