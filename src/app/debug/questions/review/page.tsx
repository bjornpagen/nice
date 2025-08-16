import { connection } from "next/server"
import { getQuestionRenderReviews } from "@/app/debug/questions/review/actions"
import { Content } from "@/app/debug/questions/review/content"

export default async function DebugQuestionRenderReviewsPage() {
	await connection()
	const reviewsPromise = getQuestionRenderReviews()

	return <Content reviewsPromise={reviewsPromise} />
}
