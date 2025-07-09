import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { getCourseBlob, type Unit } from "@/components/overview/types"
import { UnitContent } from "@/components/overview/unit/content/unit-content"

export default async function UnitPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string }>
}) {
	const { subject, course, unit } = await params
	logger.debug("initializing unit page", { subject, course, unit })

	const unitPromise = getUnitData(subject, course, unit)
	logger.debug("unit data retrieved", { subject, course, unit })

	return (
		<div id="unit-page">
			<React.Suspense>
				<UnitContent unitPromise={unitPromise} />
			</React.Suspense>
		</div>
	)
}

async function getUnitData(subject: string, course: string, unit: string): Promise<Unit> {
	logger.debug("retrieving unit data", { subject, course, unit })

	const unitData = getCourseBlob(subject, course).units.find((u) => u.slug === unit)
	if (!unitData) {
		throw errors.new(`unit not found: ${unit}`)
	}

	return unitData
}
