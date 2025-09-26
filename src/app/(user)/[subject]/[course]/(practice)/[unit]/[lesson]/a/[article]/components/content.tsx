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
import { trackArticleView } from "@/lib/actions/tracking"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { AccumulateRequest, PartialFinalizeRequest } from "@/lib/schemas/caliper-article"
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
	const lastSyncTimestampRef = React.useRef<number | null>(null)
	const { resourceLockStatus, setResourceLockStatus, initialResourceLockStatus, storageKey } = useCourseLockStatus()
	const { setProgressForResource, beginProgressUpdate, endProgressUpdate } = useLessonProgress()
	const allUnlocked = Object.values(resourceLockStatus).every((isLocked) => !isLocked)
	const isLocked = resourceLockStatus[article.componentResourceSourcedId] === true
	const parsed = ClerkUserPublicMetadataSchema.safeParse(user?.publicMetadata)
	if (!parsed.success) {
		logger.error("clerk user metadata validation failed", { error: parsed.error })
		throw parsed.error
	}
	const onerosterUserSourcedId = parsed.data.sourceId
	if (!onerosterUserSourcedId) {
		logger.error("CRITICAL: missing OneRoster sourcedId in clerk metadata")
		throw errors.new("clerk metadata: sourceId required")
	}
	const canUnlockAll = parsed.data.roles.some((r) => r.role !== "student")

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

	// Helper function to send partial finalization using sendBeacon
	const sendBestEffortPartialFinalize = React.useCallback(() => {
		const url = "/api/caliper/article/partial-finalize"
		const payload: PartialFinalizeRequest = {
			onerosterUserSourcedId,
			onerosterArticleResourceSourcedId: article.id,
			articleTitle: article.title,
			courseInfo: {
				subjectSlug: params.subject,
				courseSlug: params.course
			}
		}
		const body = JSON.stringify(payload)
		// Best-effort send using sendBeacon, failures are acceptable here
		// as server-side finalization provides the safety net
		const beaconResult = errors.trySync(() =>
			navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))
		)
		if (beaconResult.error) {
			logger.debug("sendBeacon failed during page unload", { error: beaconResult.error })
		}
	}, [article.id, article.title, params.subject, params.course, onerosterUserSourcedId])

	React.useEffect(() => {
		if (isLocked) {
			// Do not track or mark progress when locked
			return
		}

		if (article.id) {
			// Delay marking as completed until the user has dwelled for 20 seconds
			const timerId = setTimeout(() => {
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
			}, 20000) // 20-second dwell time

			return () => clearTimeout(timerId)
		}
	}, [
		user,
		article.id,
		params.subject,
		params.course,
		params.article,
		isLocked,
		router,
		beginProgressUpdate,
		endProgressUpdate,
		setProgressForResource
	])

	// Effect for heartbeat accumulation
	React.useEffect(() => {
		if (isLocked || !user) {
			return
		}

		const HEARTBEAT_INTERVAL_MS = 5000 // Use 5s cadence

		const heartbeat = async () => {
			const now = Date.now()
			if (document.visibilityState === "visible") {
				const lastSync = lastSyncTimestampRef.current
				if (lastSync) {
					const deltaSeconds = (now - lastSync) / 1000
					const body: AccumulateRequest = {
						onerosterUserSourcedId,
						onerosterArticleResourceSourcedId: article.id,
						sessionDeltaSeconds: deltaSeconds
					}
					const result = await errors.try(fetch("/api/caliper/article/accumulate", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(body)
					}))
					if (result.error) {
						logger.error("failed to accumulate article read time", { error: result.error })
					}
				}
			}
			lastSyncTimestampRef.current = now
		}

		lastSyncTimestampRef.current = Date.now()
		const intervalId = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS)
		return () => clearInterval(intervalId)
	}, [user, article.id, params.subject, params.course, isLocked])

	// Effect for page visibility changes and closure
	React.useEffect(() => {
		if (isLocked || !user) {
			return
		}

		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				sendBestEffortPartialFinalize()
			} else {
				lastSyncTimestampRef.current = Date.now()
			}
		}

		const handlePageHide = () => {
			sendBestEffortPartialFinalize()
		}

		document.addEventListener("visibilitychange", handleVisibilityChange)
		window.addEventListener("pagehide", handlePageHide)

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange)
			window.removeEventListener("pagehide", handlePageHide)
			// Send partial finalize on unmount to handle SPA navigation
			sendBestEffortPartialFinalize()
		}
	}, [user, isLocked, sendBestEffortPartialFinalize])

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
