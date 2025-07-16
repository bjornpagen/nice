"use client"

import { notFound } from "next/navigation"
import * as React from "react"
import { PracticeProgressionFooter } from "@/components/practice/course/progression/practice-progression-footer"
import { cn } from "@/lib/utils"
import type { CourseMaterial } from "@/lib/v2/types"

export function LessonVideoContent({
	videoPromise,
	className
}: {
	videoPromise: Promise<Extract<CourseMaterial, { type: "Video" }> | undefined>
	className?: string
}) {
	const video = React.use(videoPromise)
	if (video == null) {
		notFound()
	}

	const [index, setIndex] = React.useState<number>(-1)

	return (
		<div id="lesson-video-content" className="flex flex-col h-full">
			<div id="lesson-video-content-body" className={cn("flex flex-col items-center flex-1 relative", className)}>
				<span className="text-3xl font-medium text-muted-foreground">Video goes here...</span>
			</div>

			<PracticeProgressionFooter next={video.meta.next} index={index} setIndex={setIndex} className={"flex-none p-4"} />
		</div>
	)
}
