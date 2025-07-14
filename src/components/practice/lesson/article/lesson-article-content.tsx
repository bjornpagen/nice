"use client"

import { notFound } from "next/navigation"
import * as React from "react"
import { cn } from "@/lib/utils"
import type { LessonResource } from "@/lib/v2/types"

export function LessonArticleContent({
	articlePromise,
	className
}: {
	articlePromise: Promise<Extract<LessonResource, { type: "Article" }> | undefined>
	className?: string
}) {
	const article = React.use(articlePromise)
	if (article == null) {
		notFound()
	}

	return (
		<div id="lesson-article-content" className={cn("p-4 bg-white flex items-center justify-center", className)}>
			<span className="text-3xl font-medium text-muted-foreground">QTI Renderer goes here...</span>
		</div>
	)
}
