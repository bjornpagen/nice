"use client"

import * as errors from "@superbuilders/errors"
import _ from "lodash"
import Image from "next/image"
import Link from "next/link"
import { notFound, usePathname } from "next/navigation"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { type Course, type CourseMaterial, getCourseMaterials } from "@/lib/v2/types"
import googleClassroomIcon from "./images/google-classroom-icon.png"
import microsoftTeamsIcon from "./images/microsoft-teams-icon.svg"

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
			<div className="flex flex-row items-center gap-2 mt-2">
				<Button variant="link" asChild className="text-blue-500 hover:underline hover:cursor-not-allowed">
					<Link href="#" className="flex items-center gap-2">
						<Image src={googleClassroomIcon} alt="Google Classroom" width={20} height={20} />
						<span>Google Classroom</span>
					</Link>
				</Button>
				<Button variant="link" asChild className="text-blue-500 hover:underline hover:cursor-not-allowed">
					<Link href="#" className="flex items-center gap-2">
						<Image src={microsoftTeamsIcon} alt="Microsoft Teams" width={20} height={20} />
						<span>Microsoft Teams</span>
					</Link>
				</Button>
			</div>
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
