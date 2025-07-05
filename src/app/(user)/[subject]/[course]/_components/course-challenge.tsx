import { BookOpen } from "lucide-react"
import Link from "next/link"

export function CourseChallenge({ path }: { path: string }) {
	return (
		<div className="bg-white text-black p-5 rounded-xs border border-gray-200 shadow-sm">
			<div className="flex items-center space-x-2 mb-3">
				<BookOpen className="w-5 h-5 text-gray-600" />
				<h3 className="font-bold text-xs text-gray-600">COURSE CHALLENGE</h3>
			</div>
			<p className="text-sm text-gray-600 mb-4">Test your knowledge of the skills in this course.</p>
			<div className="flex items-center">
				<Link href={path} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
					Start Course challenge
				</Link>
			</div>
		</div>
	)
}
