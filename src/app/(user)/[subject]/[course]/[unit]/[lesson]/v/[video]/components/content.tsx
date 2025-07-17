"use client"

import { useUser } from "@clerk/nextjs"
import Image from "next/image"
import * as React from "react"
import type { YouTubePlayer } from "react-youtube"
import YouTube from "react-youtube"
import { Button } from "@/components/ui/button"
import { updateVideoProgress } from "@/lib/actions/tracking"
import type { VideoPageData } from "@/lib/types/page"

export function Content({ videoPromise }: { videoPromise: Promise<VideoPageData> }) {
	const video = React.use(videoPromise)
	const { user } = useUser()
	const [activeTab, setActiveTab] = React.useState<"about" | "transcript">("about")
	const playerRef = React.useRef<YouTubePlayer | null>(null)

	// Periodically track video progress when the user is watching.
	React.useEffect(() => {
		const intervalId = setInterval(() => {
			const player = playerRef.current
			const sourceId = user?.publicMetadata?.sourceId

			// Ensure the player is ready, the user is identified, and the video is playing.
			if (player && typeof player.getPlayerState === "function" && player.getPlayerState() === 1 && sourceId) {
				const currentTime = player.getCurrentTime()
				const duration = player.getDuration()

				if (duration > 0 && typeof sourceId === "string") {
					// Fire-and-forget the tracking action.
					// We don't need to block the UI or show errors for this.
					void updateVideoProgress(sourceId, video.id, currentTime, duration)
				}
			}
		}, 1000) // Send an update every 1 second.

		return () => clearInterval(intervalId) // Cleanup on component unmount.
	}, [user, video.id])

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
