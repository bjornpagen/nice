"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { Lock, Unlock } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { useLessonProgress } from "@/components/practice/lesson-progress-context"
import { QTIRenderer } from "@/components/qti-renderer"
import { Button } from "@/components/ui/button"
import { sendCaliperTimeSpentEvent } from "@/lib/actions/caliper"
import { trackArticleView } from "@/lib/actions/tracking"
import { CALIPER_SUBJECT_MAPPING, type CaliperSubject, isSubjectSlug } from "@/lib/constants/subjects"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { ArticlePageData } from "@/lib/types/page"

export function Content({
	articlePromise,
	paramsPromise
}: {
	articlePromise: Promise<ArticlePageData>
	paramsPromise: Promise<{ subject: string; course: string; unit: string; lesson: string; article: string }>
}) {
	const router = useRouter()
	const article = React.use(articlePromise)
	const params = React.use(paramsPromise)
	const { user } = useUser()
	const startTimeRef = React.useRef<Date | null>(null)
	const { resourceLockStatus, setResourceLockStatus, initialResourceLockStatus, storageKey } = useCourseLockStatus()
	const { setProgressForResource, beginProgressUpdate, endProgressUpdate } = useLessonProgress()
	const allUnlocked = Object.values(resourceLockStatus).every((isLocked) => !isLocked)
	const isLocked = resourceLockStatus[article.id] === true
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
		if (isLocked) {
			// Do not track or mark progress when locked
			return
		}
		// Record the start time when component mounts
		startTimeRef.current = new Date()

		let onerosterUserSourcedId: string | undefined
		let userEmail: string | undefined

		if (user) {
			const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
			if (!parsed.success) {
				logger.error("clerk user metadata validation failed", { error: parsed.error })
				throw parsed.error
			}
			onerosterUserSourcedId = parsed.data.sourceId
			userEmail = user.primaryEmailAddress?.emailAddress
		}

		if (article.id) {
			// Track article view on mount and refresh route so server-fetched progress updates immediately
			const trackArticleAsync = async () => {
				beginProgressUpdate(article.id)
				const result = await errors.try(
					trackArticleView(article.id, {
						subjectSlug: params.subject,
						courseSlug: params.course
					})
				)
				if (result.error) {
					endProgressUpdate(article.id)
					return
				}
				// update local overlay for immediate sidebar state (by OneRoster id)
				setProgressForResource(article.id, { completed: true })
				// also update by slug id for the injected sidebar row on current page
				{
					const currentSlug = params.article
					if (currentSlug) {
						setProgressForResource(currentSlug, { completed: true })
					}
				}
				// Ensure server-side lock state is refreshed after recording completion
				router.refresh()
				endProgressUpdate(article.id)
			}
			void trackArticleAsync()
			// Resolve subject via centralized mapping with strong typing
			let mappedSubject: CaliperSubject = "None"
			if (isSubjectSlug(params.subject)) {
				mappedSubject = CALIPER_SUBJECT_MAPPING[params.subject]
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
		isLocked,
		router,
		beginProgressUpdate,
		endProgressUpdate,
		setProgressForResource
	])

	// isLocked computed above

	return (
		<div className="bg-white h-full flex flex-col">
			{/* Article Header */}
			<div className="bg-white p-6 border-b border-gray-200 flex-shrink-0">
				<div className="flex items-center justify-between">
					<div className="w-24" />
					<div className="text-center flex-1 min-w-0">
						<h1 className="text-2xl font-bold text-gray-800 truncate">{article.title}</h1>
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

			{/* XP Banking Information Note */}
			<div className="flex-shrink-0 p-6 pt-3">
				<div className="flex justify-center">
					<div className="inline-flex items-center gap-2 rounded-md bg-gray-100 text-gray-600 px-3 py-2 text-xs sm:text-sm max-w-2xl">
						<span className="text-center">
							Read this whole article to earn <span className="font-bold text-blue-600">{article.xp} XP</span>! You'll
							get your points <span className="font-bold text-blue-600">after</span> you show what you learned in the{" "}
							<span className="font-bold text-blue-600">next exercise</span>.
						</span>
					</div>
				</div>
			</div>

			{/* Article Content - Render through QTI */}
			<div className="flex-1 overflow-y-auto relative">
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
