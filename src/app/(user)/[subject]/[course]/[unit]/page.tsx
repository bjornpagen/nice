import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchUnitPageData } from "@/lib/data-fetching"
import type { UnitPageData } from "@/lib/types"
import { Content } from "./content"

export default function UnitPage({ params }: { params: Promise<{ subject: string; course: string; unit: string }> }) {
	logger.info("unit page: received request, rendering layout immediately")

	const unitDataPromise: Promise<UnitPageData> = params.then(fetchUnitPageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading unit...</div>}>
			<Content dataPromise={unitDataPromise} />
		</React.Suspense>
	)
}
