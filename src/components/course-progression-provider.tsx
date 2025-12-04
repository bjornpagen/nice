"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import confetti from "canvas-confetti"
import { Trophy, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCoursePolling } from "@/hooks/use-course-polling"
import { checkAndProgressCourses } from "@/lib/actions/course-progression"

type CelebrationData = {
	current: string
	next: string
}

/**
 * Celebration overlay shown when a user masters a course.
 * Displays confetti animation and provides a smooth transition to the next course.
 */
function CourseCompletionOverlay({
	completedCourse,
	nextCourse,
	onDismiss
}: {
	completedCourse: string
	nextCourse: string
	onDismiss: () => void
}) {
	// Trigger confetti on mount
	React.useEffect(() => {
		const duration = 3000
		const end = Date.now() + duration

		const frame = () => {
			confetti({
				particleCount: 5,
				angle: 60,
				spread: 55,
				origin: { x: 0 },
				colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42"]
			})
			confetti({
				particleCount: 5,
				angle: 120,
				spread: 55,
				origin: { x: 1 },
				colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42"]
			})

			if (Date.now() < end) {
				requestAnimationFrame(frame)
			}
		}
		frame()
	}, [])

	return (
		<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm animate-in fade-in duration-300">
			<div className="max-w-md w-full p-8 text-center space-y-8">
				{/* Animated Icon */}
				<div className="relative mx-auto w-24 h-24 flex items-center justify-center">
					<div className="absolute inset-0 bg-yellow-100 rounded-full animate-pulse" />
					<Trophy className="w-12 h-12 text-yellow-600 relative z-10" />
					<Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-bounce" />
				</div>

				<div className="space-y-2">
					<h1 className="text-3xl font-bold text-gray-900">Course Mastered!</h1>
					<p className="text-lg text-gray-600">
						Congratulations! You have officially mastered <br />
						<span className="font-bold text-blue-600">{completedCourse}</span>.
					</p>
				</div>

				<div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-4 text-left">
					<div className="flex-1">
						<p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Up Next</p>
						<p className="font-medium text-gray-900">{nextCourse}</p>
					</div>
					<ArrowRight className="w-5 h-5 text-gray-400" />
				</div>

				<Button
					size="lg"
					className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg h-12 shadow-lg shadow-blue-600/20"
					onClick={onDismiss}
				>
					Start Next Course
				</Button>
			</div>
		</div>
	)
}

export function CourseProgressionProvider({ children }: { children: React.ReactNode }) {
	const router = useRouter()
	const [celebrationData, setCelebrationData] = React.useState<CelebrationData | undefined>(undefined)

	useCoursePolling({
		interval: 2 * 60 * 1000, // 2 minutes
		enabled: true,
		pollFn: async () => {
			return await checkAndProgressCourses()
		},
		onUpdate: (statuses) => {
			const progression = statuses.find((s) => s.shouldEnrollNext && s.nextCourseId)

			if (progression) {
				toast.success("New course unlocked!")

				// STRICT SAFETY: Ensure titles exist before showing overlay
				if (progression.currentCourseTitle && progression.nextCourseTitle) {
					setCelebrationData({
						current: progression.currentCourseTitle,
						next: progression.nextCourseTitle
					})
				}

				router.refresh()
			}
		},
		onError: () => {
			// silently fail - don't disrupt user experience with progression errors
		}
	})

	return (
		<>
			{children}
			{celebrationData && (
				<CourseCompletionOverlay
					completedCourse={celebrationData.current}
					nextCourse={celebrationData.next}
					onDismiss={() => {
						setCelebrationData(undefined)
						router.refresh()
					}}
				/>
			)}
		</>
	)
}
