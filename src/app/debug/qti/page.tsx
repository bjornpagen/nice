import * as React from "react"
import { Content } from "@/app/debug/qti/content"
import { getAssessmentItemRaw } from "@/lib/qti/raw/api"

export default function DebugQTIPage() {
	// Explicit list of QTI item identifiers to render in order
	const questionIds = [
		"nice_x7d981f05a42aee82_22070"
	]

	// Initiate fetches to derive expected response identifiers for each item.
	// Do not await here; pass promises to the client component and let it consume via React.use().
	const expectedIdentifiersPromises = questionIds.map((id) =>
		getAssessmentItemRaw(id).then((item) =>
			(item.responseDeclarations ?? []).map((declaration) => declaration.identifier)
		)
	)

	return (
		<main className="h-full w-full">
			<React.Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading item…</div>}>
				<Content questionIds={questionIds} expectedIdentifiersPromises={expectedIdentifiersPromises} />
			</React.Suspense>
		</main>
	)
}
