import { BookOpen, Lock } from "lucide-react"
import Link from "next/link"

export function CourseChallenge({ path, isLocked = false }: { path: string; isLocked?: boolean }) {
	if (isLocked) {
		return (
			<div className="bg-white text-black p-3 rounded-xs border border-gray-200 shadow-sm opacity-70">
				<div className="flex items-center space-x-2 mb-2">
					<BookOpen className="w-4 h-4 text-gray-400" />
					<h3 className="font-bold text-xs text-gray-400">COURSE CHALLENGE</h3>
				</div>
				<p className="text-sm text-gray-400 mb-2">Test your knowledge of the skills in this course.</p>
				<div className="flex items-center text-gray-400">
					<Lock className="w-4 h-4 mr-2" />
					<span className="text-sm font-medium">Locked</span>
				</div>
			</div>
		)
	}

	return (
		<div className="bg-white text-black p-3 rounded-xs border border-gray-200 shadow-sm">
			<div className="flex items-center space-x-2 mb-2">
				<BookOpen className="w-4 h-4 text-gray-600" />
				<h3 className="font-bold text-xs text-gray-600">COURSE CHALLENGE</h3>
			</div>
			<p className="text-sm text-gray-600 mb-2">Test your knowledge of the skills in this course.</p>
			<div className="flex items-center">
				<Link href={path} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
					Start Course challenge
				</Link>
			</div>
		</div>
	)
}
