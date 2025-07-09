import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { Home } from "lucide-react"
import Link from "next/link"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from "@/components/ui/breadcrumb"
import type { Course } from "./course-content"

export function CourseContentBreadcrumbs({ course, className }: { course: Course; className?: string }) {
	logger.debug("initializing course breadcrumbs", { course: _.omit(course, "units"), units: course.units.length })

	const parts = course.path.split("/")
	if (parts.length < 2) {
		throw errors.new(`invalid course path: invalid parts length: ${course.path}`)
	}
	logger.debug("course path parts", { parts })

	const subjectSlug = parts[parts.length - 2]
	if (subjectSlug === "") {
		throw errors.new(`invalid course path: invalid subject slug: ${course.path}`)
	}
	logger.debug("subject for course breadcrumbs", { subjectSlug })

	return (
		<div id="course-content-breadcrumbs" className={className}>
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
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	)
}
