"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import type { Article } from "./page"

export function ArticleContent({ article }: { article: Article }) {
	return (
		<div className="bg-white pb-20">
			{/* Article Header */}
			<div className="bg-white p-6 border-b border-gray-200">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-800 mb-4">{article.title}</h1>
					<div className="flex justify-center space-x-4">
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

			{/* Article Content */}
			<div className="p-6">
				<div className="max-w-4xl mx-auto">
					<div className="prose prose-lg max-w-none">
						{/* Article content will be rendered here */}
						<p className="text-gray-700 leading-relaxed">
							This is where the article content will be rendered. The Perseus content can be processed and displayed
							here.
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
