import * as React from "react"
import { fetchUnitPageData } from "@/lib/data/unit"
import type { UnitPageData } from "@/lib/types/page"
import { Content } from "./components/content"

export default function UnitPage({ params }: { params: Promise<{ subject: string; course: string; unit: string }> }) {
	const unitDataPromise: Promise<UnitPageData> = params.then(fetchUnitPageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading unit...</div>}>
			<Content dataPromise={unitDataPromise} />
		</React.Suspense>
	)
}
