import * as React from "react"
import { getQuestionsWithXml } from "./actions"
import { Content } from "./content"

export default async function DebugQuestionsPage() {
	const questions = await getQuestionsWithXml()

	return (
		<React.Suspense fallback={<div>loading questions...</div>}>
			<Content questions={questions} />
		</React.Suspense>
	)
}
