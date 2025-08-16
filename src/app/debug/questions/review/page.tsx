import * as React from "react"
import { getQuestionRenderReviews } from "@/app/debug/questions/review/actions"
import { Content } from "@/app/debug/questions/review/content"
import { connection } from 'next/server'

export default async function DebugQuestionRenderReviewsPage() {
	await connection()
	const reviewsPromise = getQuestionRenderReviews()

	return (
		<React.Suspense fallback={<div>loading reviews...</div>}>
			<Content reviewsPromise={reviewsPromise} />
		</React.Suspense>
	)
}
