import * as React from "react"
import { getQuestionsWithXml } from "@/app/debug/questions/actions"
import { Content } from "@/app/debug/questions/content"

export default function DebugQuestionsPage() {
	const questionsPromise = getQuestionsWithXml()

	return (
		<React.Suspense fallback={<div>loading questions...</div>}>
			<Content questionsPromise={questionsPromise} />
		</React.Suspense>
	)
}
