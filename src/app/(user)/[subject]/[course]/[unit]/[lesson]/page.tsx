import * as logger from "@superbuilders/slog"

// Main lesson page - just renders the overview content
export default function LessonPage() {
	logger.info("lesson page: received request, rendering overview content")

	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold mb-4">Lesson Overview</h1>
			<p className="text-gray-600 mb-6">Select an article, exercise, or video from the navigation to begin learning.</p>
			<div className="bg-gray-100 p-6 rounded-lg">
				<h2 className="text-lg font-semibold mb-3">What you'll learn in this lesson:</h2>
				<ul className="space-y-2 text-gray-700">
					<li>• Core concepts and fundamentals</li>
					<li>• Practical exercises to reinforce learning</li>
					<li>• Video explanations and demonstrations</li>
				</ul>
			</div>
		</div>
	)
}
