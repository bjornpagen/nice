import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import _ from "lodash"
import Link from "next/link"
import * as React from "react"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import type { Course, CourseLessonMaterial, CourseMaterial } from "@/lib/v2/types"

export function CourseSidebarCourseBreadcrumbs({
	course,
	material,
	pathname
}: {
	course: Pick<Course, "path" | "title">
	material: CourseMaterial
	pathname: string
}) {
	const subject = course.path.split("/")[2]
	if (subject == null) {
		logger.error("course sidebar breadcrumbs: subject not found", {
			course,
			material: _.pick(material, ["type", "path"])
		})
		throw errors.new("course sidebar breadcrumbs: subject not found")
	}

	const unit = _.get(material, "meta.unit")
	logger.debug("course sidebar breadcrumbs: unit", { course, unit })

	const lesson: CourseLessonMaterial | undefined = material.type === "Lesson" ? material : undefined
	logger.debug("course sidebar breadcrumbs: lesson", { course, lesson })

	const resource = lesson != null ? _.find(lesson.resources, (resource) => resource.path === pathname) : material
	if (resource == null) {
		logger.error("course sidebar breadcrumbs: resource not found", {
			course,
			material: _.pick(material, ["type", "path"])
		})
		throw errors.new("course sidebar breadcrumbs: resource not found")
	}
	logger.debug("course sidebar breadcrumbs: resource", { course, resource })

	return (
		<div id="course-sidebar-course-breadcrumbs" className="bg-gray-100 rounded-sm p-4">
			<Breadcrumb>
				<BreadcrumbList className="items-center justify-center text-sm text-gray-500">
					{/* Course Subject */}
					<BreadcrumbItem className="max-w-[100px]">
						<BreadcrumbLink asChild>
							<Link href={`/v2/${subject}`} className="capitalize hover:text-gray-800 hover:underline truncate block">
								{subject}
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>

					{/* Course */}
					<BreadcrumbSeparator />
					<BreadcrumbItem className="max-w-[120px]">
						<BreadcrumbLink asChild>
							<Link href={course.path} className="capitalize hover:text-gray-800 hover:underline truncate block">
								{course.title}
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>

					{/* Course Unit */}
					{unit != null && (
						<React.Fragment>
							<BreadcrumbSeparator />
							<BreadcrumbItem className="max-w-[120px]">
								<BreadcrumbLink asChild>
									<Link href={unit.path} className="capitalize hover:text-gray-800 hover:underline truncate block">
										{unit.title}
									</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
						</React.Fragment>
					)}

					{/* Course Lesson */}
					{lesson != null && (
						<React.Fragment>
							<BreadcrumbSeparator />
							<BreadcrumbItem className="max-w-[150px]">
								<BreadcrumbLink asChild>
									<Link href={lesson.path} className="capitalize hover:text-gray-800 hover:underline truncate block">
										{lesson.title}
									</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
						</React.Fragment>
					)}

					{/* Course Resource */}
					<BreadcrumbSeparator />
					<BreadcrumbItem className="max-w-[150px]">
						<BreadcrumbLink asChild>
							<Link href={resource.path} className="capitalize hover:underline truncate block">
								{resource.title}
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	)
}
