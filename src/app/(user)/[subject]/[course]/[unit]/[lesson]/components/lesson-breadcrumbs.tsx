"use client"

import Link from "next/link"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import type { Course, Lesson, Unit } from "@/lib/types/domain"
import { startCase } from "@/lib/utils"

export function LessonBreadcrumbs({
	subject,
	course,
	unit,
	lesson
}: {
	subject: string
	course: Pick<Course, "title" | "path">
	unit: Pick<Unit, "title" | "path">
	lesson: Pick<Lesson, "title" | "path">
}) {
	return (
		<Breadcrumb className="text-center">
			<BreadcrumbList className="p-4 !gap-0.5 sm:!gap-0.5 text-md text-gray-500 break-words justify-center">
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link href={`/${subject}`} className="underline">
							{startCase(subject)}
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link href={course.path} className="underline">
							{course.title}
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link href={unit.path} className="underline">
							{unit.title}
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link href={lesson.path} className="underline">
							{lesson.title}
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}
