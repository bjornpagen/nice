"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useCoursePolling } from "@/hooks/use-course-polling"
import { checkAndProgressCourses } from "@/lib/actions/course-progression"

export function CourseProgressionProvider({ children }: { children: React.ReactNode }) {
	const router = useRouter()

	useCoursePolling({
		interval: 5 * 60 * 1000, // 5 minutes
		enabled: true,
		pollFn: async () => {
			const result = await checkAndProgressCourses()
			return result
		},
		onUpdate: (statuses) => {
			const enrolled = statuses.filter((s) => s.shouldEnrollNext)
			if (enrolled.length > 0) {
				for (const status of enrolled) {
					toast.success("New course unlocked!")
				}
				router.refresh()
			}
		},
		onError: () => {
			// silently fail - don't disrupt user experience with progression errors
		}
	})

	return <>{children}</>
}

