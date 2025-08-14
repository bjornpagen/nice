"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { Lock, Unlock } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import YouTube, { type YouTubePlayer } from "react-youtube"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { useLessonProgress } from "@/components/practice/lesson-progress-context"
import { Button } from "@/components/ui/button"
import { sendCaliperTimeSpentEvent } from "@/lib/actions/caliper"
import { getVideoProgress, updateVideoProgress } from "@/lib/actions/tracking"
import { VIDEO_COMPLETION_THRESHOLD_PERCENT, VIDEO_COMPLETION_THRESHOLD_RATIO } from "@/lib/constants/progress"
import { CALIPER_SUBJECT_MAPPING, type CaliperSubject, isSubjectSlug } from "@/lib/constants/subjects"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { VideoPageData } from "@/lib/types/page"

// Helper function to map URL subjects to Caliper enum values using centralized mapping
function mapSubjectToCaliperSubject(subject: string): CaliperSubject {
	return isSubjectSlug(subject) ? CALIPER_SUBJECT_MAPPING[subject] : "None"
}

export function Content({
	videoPromise,
	paramsPromise
}: {
	videoPromise: Promise<VideoPageData>
	paramsPromise: Promise<{ subject: string; course: string; unit: string; lesson: string; video: string }>
}) {
	const router = useRouter()
	const video = React.use(videoPromise)
	const params = React.use(paramsPromise)
	const { user } = useUser()
	const { setCurrentResourceCompleted } = useLessonProgress()
	// Transcript tab is intentionally hidden for now because transcript data is not hydrated.
	// We keep "transcript" in the union type non-destructively so this is trivial to re-enable later.
	const [activeTab, setActiveTab] = React.useState<"about" | "transcript">("about")
	const playerRef = React.useRef<YouTubePlayer | null>(null)

	// Refs for tracking cumulative watch time
	const watchStartTimeRef = React.useRef<Date | null>(null)
	const totalWatchTimeRef = React.useRef<number>(0)
	const isPlayingRef = React.useRef<boolean>(false)
	const hasSentFinalEventRef = React.useRef<boolean>(false)
	const hasRefreshedForCompletionRef = React.useRef<boolean>(false)

	// Refs for resume functionality
	const hasResumedRef = React.useRef<boolean>(false)
	const savedProgressRef = React.useRef<{ percentComplete: number } | null>(null)
	// Show a custom initial play overlay instead of YouTube's default
	const [showInitialPlayOverlay, setShowInitialPlayOverlay] = React.useState<boolean>(true)

	// Local UI state for read-only time display
	const [elapsedSeconds, setElapsedSeconds] = React.useState<number>(0)
	const [durationSeconds, setDurationSeconds] = React.useState<number | null>(null)

	// Auto-pause when tab/window loses focus
	React.useEffect(() => {
		const pause = () => {
			const player = playerRef.current
			if (player && typeof player.pauseVideo === "function") {
				player.pauseVideo()
			}
		}

		const handleVisibilityChange = () => {
			if (document.hidden) pause()
		}

		window.addEventListener("blur", pause)
		document.addEventListener("visibilitychange", handleVisibilityChange)

		return () => {
			window.removeEventListener("blur", pause)
			document.removeEventListener("visibilitychange", handleVisibilityChange)
		}
	}, [])

	// Unified system: use course lock context to drive video control state
	const { resourceLockStatus, setResourceLockStatus, initialResourceLockStatus, storageKey } = useCourseLockStatus()
	const allUnlocked = Object.values(resourceLockStatus).every((isLocked) => !isLocked)
	const parsedMetadata = ClerkUserPublicMetadataSchema.safeParse(user?.publicMetadata)
	const canToggleControls = parsedMetadata.success && parsedMetadata.data.roles.some((r) => r.role !== "student")
	const handleToggleLockAll = () => {
		if (!canToggleControls) return
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

	function formatTime(totalSeconds: number): string {
		const clampedSeconds = Math.max(0, Math.floor(totalSeconds))
		const hours = Math.floor(clampedSeconds / 3600)
		const minutes = Math.floor((clampedSeconds % 3600) / 60)
		const seconds = clampedSeconds % 60
		const two = (n: number) => String(n).padStart(2, "0")
		return hours > 0 ? `${hours}:${two(minutes)}:${two(seconds)}` : `${minutes}:${two(seconds)}`
	}

	// Function to send the cumulative time spent event
	function sendCumulativeTimeEvent() {
		// Prevent duplicate sends
		if (hasSentFinalEventRef.current) return

		// Calculate final watch time
		let finalWatchTime = totalWatchTimeRef.current
		if (isPlayingRef.current && watchStartTimeRef.current) {
			// Add time from current play session
			const currentSessionTime = (Date.now() - watchStartTimeRef.current.getTime()) / 1000
			finalWatchTime += currentSessionTime
		}

		// Only send if watched at least 1 second
		if (finalWatchTime < 1) return

		// Validate user metadata
		let sourceId: string | undefined
		if (user?.publicMetadata) {
			const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
			if (metadataValidation.success) {
				sourceId = metadataValidation.data.sourceId
			}
		}

		if (sourceId && user) {
			const userEmail = user.primaryEmailAddress?.emailAddress
			if (!userEmail) {
				logger.error("video tracking user email required", { userId: user.id })
				throw errors.new("video tracking: user email required for caliper event")
			}

			const actor = {
				id: `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${sourceId}`,
				type: "TimebackUser" as const,
				email: userEmail
			}

			const context = {
				id: `${process.env.NEXT_PUBLIC_APP_DOMAIN}/${params.subject}/${params.course}/${params.unit}/${params.lesson}/v/${params.video}`,
				type: "TimebackActivityContext" as const,
				subject: mapSubjectToCaliperSubject(params.subject),
				app: { name: "Nice Academy" },
				course: { name: params.course },
				activity: {
					name: video.title,
					id: video.id
				},
				process: false
			}

			// Send cumulative time event
			void sendCaliperTimeSpentEvent(actor, context, Math.floor(finalWatchTime))
			// Mark video as completed locally to enable Continue
			setCurrentResourceCompleted(true)
			hasSentFinalEventRef.current = true
			if (!hasRefreshedForCompletionRef.current) {
				hasRefreshedForCompletionRef.current = true
				router.refresh()
			}
		}
	}

	// Load saved progress when component mounts
	React.useEffect(() => {
		const loadSavedProgress = async () => {
			// Validate user metadata
			let onerosterUserSourcedId: string | undefined
			if (user?.publicMetadata) {
				const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
				if (metadataValidation.success) {
					onerosterUserSourcedId = metadataValidation.data.sourceId
				}
			}

			if (onerosterUserSourcedId) {
				const result = await errors.try(getVideoProgress(onerosterUserSourcedId, video.id))
				if (result.error) {
					// Note: Failed to load video progress, starting from beginning
					return
				}

				if (result.data) {
					if (result.data.percentComplete >= VIDEO_COMPLETION_THRESHOLD_PERCENT) {
						// Already completed previously; unlock Continue immediately
						setCurrentResourceCompleted(true)
					} else if (result.data.percentComplete > 0) {
						// Note: Loaded saved video progress, will resume from this position
						savedProgressRef.current = result.data
					}
				}
			}
		}

		void loadSavedProgress()
	}, [user, video.id, setCurrentResourceCompleted])

	// Independent 1s UI timer for read-only progress display
	React.useEffect(() => {
		const intervalId = setInterval(() => {
			const player = playerRef.current
			if (player && typeof player.getDuration === "function") {
				// Snap duration to an integer second to avoid perpetual off-by-one display
				const rawDuration = player.getDuration()
				const snappedDuration = rawDuration > 0 ? Math.round(rawDuration) : rawDuration
				if (snappedDuration > 0) {
					setDurationSeconds(snappedDuration)
				}
				if (typeof player.getCurrentTime === "function") {
					let t = player.getCurrentTime()
					if (!Number.isNaN(t)) {
						// If within half a second of the end, snap to end to show the last second
						if (snappedDuration > 0 && snappedDuration - t <= 0.5) {
							t = snappedDuration
						}
						const clampedTime = snappedDuration > 0 ? Math.min(t, snappedDuration) : t
						setElapsedSeconds(clampedTime)
						// Mark as complete locally as soon as threshold is hit (shared constant)
						if (snappedDuration > 0 && clampedTime / snappedDuration >= VIDEO_COMPLETION_THRESHOLD_RATIO) {
							setCurrentResourceCompleted(true)
						}
					}
				}
			}
		}, 1000)

		return () => clearInterval(intervalId)
	}, [setCurrentResourceCompleted])

	// Track progress periodically for OneRoster (separate from UI timer)
	React.useEffect(() => {
		const intervalId = setInterval(() => {
			const player = playerRef.current

			// Validate user metadata if user exists (for progress tracking only)
			let onerosterUserSourcedId: string | undefined
			if (user?.publicMetadata) {
				const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
				if (metadataValidation.success) {
					onerosterUserSourcedId = metadataValidation.data.sourceId
				}
			}

			// Ensure the player is ready, the user is identified, and the video is playing.
			if (
				player &&
				typeof player.getPlayerState === "function" &&
				player.getPlayerState() === 1 &&
				onerosterUserSourcedId
			) {
				const currentTime = player.getCurrentTime()
				const duration = player.getDuration()

				if (duration > 0) {
					// Existing OneRoster progress update (fire-and-forget)
					void updateVideoProgress(onerosterUserSourcedId, video.id, currentTime, duration, {
						subjectSlug: params.subject,
						courseSlug: params.course
					})

					// If completion threshold reached, unlock locally and refresh once (shared constant)
					const percentComplete = currentTime / duration
					if (percentComplete >= VIDEO_COMPLETION_THRESHOLD_RATIO) {
						setCurrentResourceCompleted(true)
						if (!hasRefreshedForCompletionRef.current) {
							hasRefreshedForCompletionRef.current = true
							router.refresh()
						}
					}
				}
			}
		}, 3000) // Sync progress every 3 seconds

		return () => clearInterval(intervalId)
	}, [user, video.id, params.subject, params.course, router, setCurrentResourceCompleted])

	// Cleanup: send cumulative event when component unmounts
	React.useEffect(() => {
		return () => {
			// Prevent duplicate sends
			if (hasSentFinalEventRef.current) return

			// Calculate final watch time
			let finalWatchTime = totalWatchTimeRef.current
			if (isPlayingRef.current && watchStartTimeRef.current) {
				// Add time from current play session
				const currentSessionTime = (Date.now() - watchStartTimeRef.current.getTime()) / 1000
				finalWatchTime += currentSessionTime
			}

			// Only send if watched at least 1 second
			if (finalWatchTime < 1) return

			// Validate user metadata
			let sourceId: string | undefined
			if (user?.publicMetadata) {
				const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
				if (metadataValidation.success) {
					sourceId = metadataValidation.data.sourceId
				}
			}

			if (sourceId && user) {
				const userEmail = user.primaryEmailAddress?.emailAddress
				if (!userEmail) {
					throw errors.new("video tracking: user email required for caliper event")
				}

				const actor = {
					id: `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${sourceId}`,
					type: "TimebackUser" as const,
					email: userEmail
				}

				const context = {
					id: `${process.env.NEXT_PUBLIC_APP_DOMAIN}/${params.subject}/${params.course}/${params.unit}/${params.lesson}/v/${params.video}`,
					type: "TimebackActivityContext" as const,
					subject: mapSubjectToCaliperSubject(params.subject),
					app: { name: "Nice Academy" },
					course: { name: params.course },
					activity: {
						name: video.title,
						id: video.id
					},
					process: false
				}

				// Send cumulative time event
				void sendCaliperTimeSpentEvent(actor, context, Math.floor(finalWatchTime))
				hasSentFinalEventRef.current = true
			}
		}
	}, [user, video.title, video.id, params.subject, params.course, params.unit, params.lesson, params.video])

	function onPlayerReady(event: { target: YouTubePlayer }) {
		playerRef.current = event.target
		const d = event.target.getDuration()
		if (d > 0) {
			setDurationSeconds(d)
		}
	}

	function handleInitialPlayClick() {
		const player = playerRef.current
		if (player && typeof player.playVideo === "function") {
			setShowInitialPlayOverlay(false)
			player.playVideo()
		}
	}

	function onPlayerStateChange(event: { target: YouTubePlayer; data: number }) {
		const playerState = event.data
		const player = event.target

		// Playing state
		if (playerState === 1) {
			if (showInitialPlayOverlay) {
				setShowInitialPlayOverlay(false)
			}
			// Handle resume functionality - seek to saved position on first play
			if (!hasResumedRef.current && savedProgressRef.current && savedProgressRef.current.percentComplete > 0) {
				const duration = player.getDuration()
				if (duration > 0) {
					const resumeTime = (savedProgressRef.current.percentComplete / 100) * duration
					// Note: Resuming video from saved position
					player.seekTo(resumeTime, true)
					hasResumedRef.current = true
				}
			}

			if (!isPlayingRef.current) {
				// Started playing
				watchStartTimeRef.current = new Date()
				isPlayingRef.current = true
			}
		}
		// Paused, ended, or any other state
		else if (isPlayingRef.current) {
			// Stopped playing - accumulate watch time
			if (watchStartTimeRef.current) {
				const sessionTime = (Date.now() - watchStartTimeRef.current.getTime()) / 1000
				totalWatchTimeRef.current += sessionTime
			}
			isPlayingRef.current = false
			watchStartTimeRef.current = null

			// If video ended (state 0), send the cumulative event
			if (playerState === 0) {
				sendCumulativeTimeEvent()
			}
		}
	}
	return (
		<div className="flex flex-col bg-white h-full">
			{/* Video Title and unified lock toggle */}
			<div className="border-b">
				<div className="max-w-5xl mx-auto px-6 py-3 md:py-4">
					<div className="flex items-center justify-between">
						<div className="w-24" />
						<div className="flex-1 min-w-0">
							<h1 className="text-2xl font-bold text-gray-900 text-center truncate">{video.title}</h1>
						</div>
						<div className="w-24 flex justify-end">
							{canToggleControls && (
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
			</div>

			{/* Main Content Area */}
			<div className="bg-white overflow-y-auto flex-1 relative">
				<div className="max-w-5xl mx-auto px-6">
					{/* Video Player - YouTube component with skip disabled */}
					<div className="py-6">
						<div className="aspect-video bg-black rounded-lg overflow-hidden relative">
							{showInitialPlayOverlay && (
								<button
									type="button"
									onClick={handleInitialPlayClick}
									aria-label="Play video"
									className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 focus:outline-none"
								>
									<span className="inline-flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg w-20 h-20 sm:w-24 sm:h-24">
										<svg viewBox="0 0 24 24" className="w-10 h-10 sm:w-12 sm:h-12 fill-white" aria-hidden="true">
											<path d="M8 5v14l11-7z" />
										</svg>
									</span>
								</button>
							)}
							<YouTube
								videoId={video.youtubeId}
								title={video.title}
								className="absolute inset-0 w-full h-full"
								onReady={onPlayerReady}
								onStateChange={onPlayerStateChange}
								opts={{
									width: "100%",
									height: "100%",
									playerVars: {
										// Use course-wide lock state to toggle media controls
										controls: allUnlocked ? 1 : 0,
										disablekb: allUnlocked ? 0 : 1,
										autoplay: 0,
										// Always enable closed captions
										cc_load_policy: 1,
										cc_lang_pref: "en"
									}
								}}
							/>
						</div>
						{/* Read-only time display (non-interactive) */}
						<div className="mt-3 flex justify-center">
							<div className="inline-flex items-center gap-2 rounded-md bg-gray-100 text-gray-700 px-3 py-1 text-xs sm:text-sm">
								<span className="tabular-nums">{formatTime(elapsedSeconds)}</span>
								<span className="text-gray-400">/</span>
								<span className="tabular-nums">
									{durationSeconds && durationSeconds > 0 ? formatTime(durationSeconds) : "--:--"}
								</span>
							</div>
						</div>
					</div>

					{/* Nice Academy Style Tabs */}
					<div className="border-b border-gray-200">
						<div className="flex space-x-8">
							<button
								type="button"
								className={`pb-4 px-1 font-medium text-base transition-colors relative ${
									activeTab === "about" ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
								}`}
								onClick={() => setActiveTab("about")}
							>
								About
								{activeTab === "about" && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600" />}
							</button>
							{/**
							 * Transcript tab temporarily hidden.
							 *
							 * Why commented out instead of removed:
							 * - Transcript data is not hydrated yet; showing the tab creates a broken UX.
							 * - Non-destructive: keeping the code here makes re-enabling trivial when data is ready.
							 *
							 * To re-enable: uncomment the button below AND the content section in the tab panel.
							 */}
							{false && (
								<button
									type="button"
									className={`pb-4 px-1 font-medium text-base transition-colors relative ${
										activeTab === "transcript" ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
									}`}
									onClick={() => setActiveTab("transcript")}
								>
									Transcript
									{activeTab === "transcript" && (
										<div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600" />
									)}
								</button>
							)}
						</div>
					</div>

					{/* Tab Content - No Cards, Direct Content */}
					<div className="py-6 bg-white">
						{activeTab === "about" && (
							<div>
								{video.description ? (
									<p className="text-gray-700 leading-relaxed">{video.description}</p>
								) : (
									<p className="text-gray-500 italic">No description available for this video.</p>
								)}
							</div>
						)}

						{/**
						 * Transcript content temporarily hidden. See the comment above near the tab button for
						 * rationale and instructions to re-enable when transcript data is available.
						 */}
						{false && activeTab === "transcript" && (
							<div>
								<p className="text-gray-500 italic">Transcript not available for this video.</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
