import * as React from "react"
import { Content } from "@/app/(user)/profile/me/enrollments/components/content"

export default function EnrollmentsPage() {
	return (
		<React.Suspense fallback={<div className="text-gray-500">Loading enrollments...</div>}>
			<Content />
		</React.Suspense>
	)
}


