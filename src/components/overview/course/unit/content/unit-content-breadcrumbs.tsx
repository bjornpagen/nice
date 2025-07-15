import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { Home } from "lucide-react"
import Link from "next/link"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from "@/components/ui/breadcrumb"
import type { UnitContentData } from "./unit-content"

export function UnitContentBreadcrumbs({
	unit,
	className
}: {
	unit: Pick<UnitContentData, "path">
	className?: string
}) {
	logger.debug("initializing unit breadcrumbs", { unit: _.omit(unit, "lessons") })

	const parts = unit.path.split("/")
	if (parts.length < 3) {
		throw errors.new(`invalid unit path: invalid parts length: ${unit.path}`)
	}
	logger.debug("unit path parts", { parts })

	const subjectSlug = parts[parts.length - 3]
	if (subjectSlug === "") {
		throw errors.new(`invalid unit path: invalid subject slug: ${unit.path}`)
	}
	logger.debug("subject for unit breadcrumbs", { subjectSlug })

	const courseSlug = parts[parts.length - 2]
	if (courseSlug === "") {
		throw errors.new(`invalid unit path: invalid course slug: ${unit.path}`)
	}
	logger.debug("course for unit breadcrumbs", { courseSlug })

	return (
		<div id="unit-content-breadcrumbs" className={className}>
			<Breadcrumb>
				<BreadcrumbList className="flex items-center gap-2 text-xs text-blue-600">
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href="/">
								<Home className="w-3 h-3" />
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<span className="text-black">•</span>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href={`/v2/${subjectSlug}`} className="capitalize hover:underline">
								{subjectSlug}
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<span className="text-black">•</span>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href={`/v2/${subjectSlug}/${courseSlug}`} className="capitalize hover:underline">
								{courseSlug}
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	)
}
