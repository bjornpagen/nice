"use client"

import * as errors from "@superbuilders/errors"
import _ from "lodash"
import { notFound, usePathname } from "next/navigation"
import * as React from "react"
import { cn } from "@/lib/utils"
import { type Course, type CourseMaterial, getCourseMaterials } from "@/lib/v2/types"

export function CourseContentHeader({
	coursePromise,
	className
}: {
	coursePromise: Promise<Course | undefined>
	className?: string
}) {
	const pathname = usePathname()

	const course = React.use(coursePromise)
	if (course == null) {
		notFound()
	}

	const materials = getCourseMaterials(course)
	if (materials.length === 0) {
		throw errors.new(`course sidebar: no content found for course: ${course.title}`)
	}

	const title = getCourseMaterialTitle(materials, pathname)
	if (title == null) {
		throw errors.new(`course content header: title not found for path: ${pathname}`)
	}

	return (
		<div id="course-content-header" className={cn("flex flex-col items-center justify-center", className)}>
			<h1 className="text-2xl font-medium">{title}</h1>
		</div>
	)
}

function getCourseMaterialTitle(materials: CourseMaterial[], pathname: string): string | undefined {
	for (const material of materials) {
		const matches = material.path === pathname
		if (matches) {
			return material.title
		}

		const resource = _.find(_.get(material, "resources", []), (resource) => resource.path === pathname)
		if (resource != null) {
			return resource.title
		}
	}

	return undefined
}
