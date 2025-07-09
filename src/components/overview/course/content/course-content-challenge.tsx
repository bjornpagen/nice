import { BookOpen } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Challenge } from "./course-content"

export function CourseContentChallenge({ challenge, className }: { challenge: Challenge; className?: string }) {
	return (
		<div
			id="course-content-challenge"
			className={cn("bg-white text-black p-3 rounded-xs border border-gray-200 shadow-sm", className)}
		>
			<div className="flex items-center space-x-2 mb-2">
				<BookOpen className="w-4 h-4 text-gray-600" />
				<h3 className="font-bold text-xs text-gray-600 uppercase">Course Challenge</h3>
			</div>
			<p className="text-sm text-gray-600 mb-2">Test your knowledge of the skills in this course.</p>
			<div className="flex items-center">
				<Link href={challenge.path} className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
					Start Course challenge
				</Link>
			</div>
		</div>
	)
}
