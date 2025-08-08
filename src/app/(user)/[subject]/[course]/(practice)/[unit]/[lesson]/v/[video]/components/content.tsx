"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import * as React from "react"
import YouTube, { type YouTubePlayer } from "react-youtube"
import { sendCaliperTimeSpentEvent } from "@/lib/actions/caliper"
import { getVideoProgress, updateVideoProgress } from "@/lib/actions/tracking"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { VideoPageData } from "@/lib/types/page"

// Helper function to map URL subjects to Caliper enum values
function mapSubjectToCaliperSubject(
	subject: string
): "Science" | "Math" | "Reading" | "Language" | "Social Studies" | "None" {
	switch (subject.toLowerCase()) {
		case "science":
			return "Science"
		case "math":
			return "Math"
		case "reading":
			return "Reading"
		case "language":
			return "Language"
		case "social-studies":
			return "Social Studies"
		default:
			return "None"
	}
}

export function Content({
	videoPromise,
	paramsPromise
}: {
	videoPromise: Promise<VideoPageData>
	paramsPromise: Promise<{ subject: string; course: string; unit: string; lesson: string; video: string }>
}) {
	const video = React.use(videoPromise)
	const params = React.use(paramsPromise)
	const { user } = useUser()
	const [activeTab, setActiveTab] = React.useState<"about" | "transcript">("about")
	const playerRef = React.useRef<YouTubePlayer | null>(null)

	// Refs for tracking cumulative watch time
	const watchStartTimeRef = React.useRef<Date | null>(null)
	const totalWatchTimeRef = React.useRef<number>(0)
	const isPlayingRef = React.useRef<boolean>(false)
	const hasSentFinalEventRef = React.useRef<boolean>(false)

	// Refs for resume functionality
	const hasResumedRef = React.useRef<boolean>(false)
	const savedProgressRef = React.useRef<{ percentComplete: number } | null>(null)

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
				process: true
			}

			// Send cumulative time event
			void sendCaliperTimeSpentEvent(actor, context, Math.floor(finalWatchTime))
			hasSentFinalEventRef.current = true
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

				if (result.data && result.data.percentComplete > 0 && result.data.percentComplete < 95) {
					savedProgressRef.current = result.data
					// Note: Loaded saved video progress, will resume from this position
				}
			}
		}

		void loadSavedProgress()
	}, [user, video.id])

	// Still track progress periodically for OneRoster
	React.useEffect(() => {
		const intervalId = setInterval(() => {
			const player = playerRef.current

			// Validate user metadata if user exists
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
				}
			}
		}, 3000) // Still update OneRoster progress every 3 seconds

		return () => clearInterval(intervalId)
	}, [user, video.id, params.subject, params.course])

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
					process: true
				}

				// Send cumulative time event
				void sendCaliperTimeSpentEvent(actor, context, Math.floor(finalWatchTime))
				hasSentFinalEventRef.current = true
			}
		}
	}, [user, video.title, video.id, params.subject, params.course, params.unit, params.lesson, params.video])

	function onPlayerReady(event: { target: YouTubePlayer }) {
		playerRef.current = event.target
	}

	function onPlayerStateChange(event: { target: YouTubePlayer; data: number }) {
		const playerState = event.data
		const player = event.target

		// Playing state
		if (playerState === 1) {
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
			{/* Video Title and Share Buttons */}
			<div className="border-b">
				<div className="max-w-5xl mx-auto p-6 text-center">
					<h1 className="text-2xl font-bold text-gray-900 mb-4">{video.title}</h1>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="bg-white overflow-y-auto flex-1">
				<div className="max-w-5xl mx-auto px-6">
					{/* Video Player - Changed from iframe to YouTube component */}
					<div className="py-6">
						<div className="aspect-video bg-black rounded-lg overflow-hidden relative">
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
										// To prevent gaming the time-spent metric, we disable seeking.
										// `controls: 0` hides the video player controls, including the seek bar.
										// Play/pause is still possible by clicking the video.
										controls: 0,
										// `disablekb: 1` disables keyboard controls to prevent seeking with arrow keys.
										disablekb: 1,
										autoplay: 0
									}
								}}
							/>
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
							<button
								type="button"
								className={`pb-4 px-1 font-medium text-base transition-colors relative ${
									activeTab === "transcript" ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
								}`}
								onClick={() => setActiveTab("transcript")}
							>
								Transcript
								{activeTab === "transcript" && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600" />}
							</button>
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

						{activeTab === "transcript" && (
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
