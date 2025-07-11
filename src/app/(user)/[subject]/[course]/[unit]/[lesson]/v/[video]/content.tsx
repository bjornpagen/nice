"use client"

import Image from "next/image"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Video } from "./page"

export function Content({ videoPromise }: { videoPromise: Promise<Video> }) {
	const video = React.use(videoPromise)
	const [activeTab, setActiveTab] = React.useState<"about" | "transcript">("about")

	const handleTabChange = (value: string) => {
		if (value === "about" || value === "transcript") {
			setActiveTab(value)
		}
	}

	return (
		<div className="flex flex-col h-full">
			{/* Video Player Container */}
			<div className="bg-gray-100 p-6 flex-shrink-0">
				<div className="max-w-5xl mx-auto">
					<div className="aspect-video bg-black rounded-lg overflow-hidden">
						<iframe
							src={`https://www.youtube.com/embed/${video.youtubeId}`}
							title={video.title}
							className="w-full h-full"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowFullScreen
						/>
					</div>
				</div>
			</div>

			{/* Video Info and Tabs */}
			<div className="flex-1 bg-white">
				<div className="max-w-5xl mx-auto p-6">
					{/* Video Title and Share Buttons */}
					<div className="mb-6">
						<h1 className="text-2xl font-bold text-gray-900 mb-4">{video.title}</h1>
						<div className="flex justify-between items-center">
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

					{/* Tabs */}
					<Tabs value={activeTab} onValueChange={handleTabChange}>
						<TabsList className="mb-4">
							<TabsTrigger value="about">About</TabsTrigger>
							<TabsTrigger value="transcript">Transcript</TabsTrigger>
						</TabsList>

						<TabsContent value="about">
							<Card className="p-6">
								<h2 className="text-lg font-semibold mb-4">About this video</h2>
								{video.description ? (
									<p className="text-gray-700">{video.description}</p>
								) : (
									<p className="text-gray-500 italic">No description available for this video.</p>
								)}
							</Card>
						</TabsContent>

						<TabsContent value="transcript">
							<Card className="p-6">
								<h2 className="text-lg font-semibold mb-4">Transcript</h2>
								<p className="text-gray-500 italic">Transcript not available for this video.</p>
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	)
}
