import * as logger from "@superbuilders/slog"
import { Button } from "@/components/ui/button"
import type { Exercise } from "./page"

export function ExerciseContent({ exercise }: { exercise: Exercise }) {
	logger.info("exercise content", { id: exercise.id, title: exercise.title })

	return (
		<div className="flex flex-col h-screen">
			{/* Exercise Header */}
			<div className="bg-white p-6 border-b border-gray-200 flex-shrink-0">
				<h1 className="text-2xl font-bold text-gray-900">{exercise.title}</h1>
				{exercise.description && <p className="text-gray-600 mt-2">{exercise.description}</p>}
			</div>

			{/* Ready to Practice Section - fills remaining space with bottom padding */}
			<div className="bg-blue-900 text-white flex-1 flex flex-col items-center justify-center p-12 pb-32">
				<div className="text-center max-w-md">
					<h2 className="text-3xl font-bold mb-4">Ready to practice?</h2>
					<p className="text-lg text-blue-100 mb-8">Okay, show us what you can do!</p>
					<p className="text-lg font-medium mb-8">0 questions</p>
					<Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-medium rounded-lg">
						Let's go
					</Button>
				</div>
			</div>
		</div>
	)
}
