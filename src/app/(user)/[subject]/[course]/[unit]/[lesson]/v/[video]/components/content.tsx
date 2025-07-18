"use client"

import { useUser } from "@clerk/nextjs"
import Image from "next/image"
import * as React from "react"
import YouTube, { type YouTubePlayer } from "react-youtube"
import { Button } from "@/components/ui/button"
import { sendCaliperTimeSpentEvent } from "@/lib/actions/caliper"
import { updateVideoProgress } from "@/lib/actions/tracking"
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

	const SEND_INTERVAL_SECONDS = 3 // Send a Caliper event every 3 seconds

	// Periodically track video progress when the user is watching.
	React.useEffect(() => {
		const intervalId = setInterval(() => {
			const player = playerRef.current

			// Validate user metadata if user exists
			let sourceId: string | undefined
			if (user?.publicMetadata) {
				const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
				if (metadataValidation.success) {
					sourceId = metadataValidation.data.sourceId
				}
			}

			// Ensure the player is ready, the user is identified, and the video is playing.
			if (player && typeof player.getPlayerState === "function" && player.getPlayerState() === 1 && sourceId) {
				const currentTime = player.getCurrentTime()
				const duration = player.getDuration()

				if (duration > 0) {
					// Existing OneRoster progress update (fire-and-forget)
					void updateVideoProgress(sourceId, video.id, currentTime, duration)

					// NEW: Send Caliper TimeSpentEvent (only if user exists)
					if (user) {
						const actor = {
							id: `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${sourceId}`,
							type: "TimebackUser" as const,
							email: user.primaryEmailAddress?.emailAddress ?? ""
						}

						const context = {
							id: `https://alpharead.alpha.school/videos/${video.id}`,
							type: "TimebackActivityContext" as const,
							subject: mapSubjectToCaliperSubject(params.subject),
							app: { name: "Nice Academy" },
							course: { name: params.course },
							activity: { name: video.title }
						}

						// Fire-and-forget Caliper event
						void sendCaliperTimeSpentEvent(actor, context, SEND_INTERVAL_SECONDS)
					}
				}
			}
		}, SEND_INTERVAL_SECONDS * 1000) // Convert interval to milliseconds

		return () => clearInterval(intervalId) // Cleanup on component unmount.
	}, [user, video.id, video.title, params.subject, params.course])

	const onPlayerReady = (event: { target: YouTubePlayer }) => {
		playerRef.current = event.target
	}

	return (
		<div className="flex flex-col h-full bg-white">
			{/* Video Title and Share Buttons */}
			<div className="border-b">
				<div className="max-w-5xl mx-auto p-6 text-center">
					<h1 className="text-2xl font-bold text-gray-900 mb-4">{video.title}</h1>
					<div className="flex justify-center items-center">
						<div className="flex space-x-4">
							<Button
								variant="outline"
								className="text-green-600 border-green-600 hover:bg-green-50 text-sm cursor-not-allowed"
								disabled
							>
								<Image
									src="https://cdn.kastatic.org/images/google_classroom_color.png"
									alt=""
									className="w-4 h-4 mr-2"
									width={16}
									height={16}
								/>
								Google Classroom
							</Button>
							<Button
								variant="outline"
								className="text-purple-600 border-purple-600 hover:bg-purple-50 text-sm cursor-not-allowed"
								disabled
							>
								<span className="mr-2">📘</span>
								Microsoft Teams
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="flex-1 bg-white">
				<div className="max-w-5xl mx-auto px-6">
					{/* Video Player - Changed from iframe to YouTube component */}
					<div className="py-6">
						<div className="aspect-video bg-black rounded-lg overflow-hidden relative">
							<YouTube
								videoId={video.youtubeId}
								title={video.title}
								className="absolute inset-0 w-full h-full"
								onReady={onPlayerReady}
								opts={{
									width: "100%",
									height: "100%",
									playerVars: {
										// Standard YouTube player variables
										autoplay: 0,
										controls: 1
									}
								}}
							/>
						</div>
					</div>

					{/* Khan Academy Style Tabs */}
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
