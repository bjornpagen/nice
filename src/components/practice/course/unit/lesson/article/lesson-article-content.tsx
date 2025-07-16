"use client"

import { notFound } from "next/navigation"
import * as React from "react"
import { PracticeProgressionFooter } from "@/components/practice/practice-progression-footer"
import { cn } from "@/lib/utils"
import type { CourseMaterial } from "@/lib/v2/types"

export function LessonArticleContent({
	articlePromise,
	className
}: {
	articlePromise: Promise<Extract<CourseMaterial, { type: "Article" }> | undefined>
	className?: string
}) {
	const article = React.use(articlePromise)
	if (article == null) {
		notFound()
	}

	const [index, setIndex] = React.useState<number>(-1)

	return (
		<div id="lesson-article-content" className="flex flex-col h-full">
			<div id="lesson-article-content-body" className={cn("flex flex-col items-center flex-1 relative", className)}>
				<span className="text-3xl font-medium text-muted-foreground">QTI Renderer goes here...</span>
			</div>

			<PracticeProgressionFooter
				next={article.meta.next}
				index={index}
				setIndex={setIndex}
				className={"flex-none p-4"}
			/>
		</div>
	)
}
