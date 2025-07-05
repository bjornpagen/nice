import _ from "lodash"
import Link from "next/link"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import type { CourseInfo, LessonInfo, UnitInfo } from "@/lib/khan-academy-api"

export function LessonBreadcrumbs({
	subject,
	course,
	unit,
	lesson
}: {
	subject: string
	course: Pick<CourseInfo, "title" | "path">
	unit: Pick<UnitInfo, "title" | "path">
	lesson: Pick<LessonInfo, "title" | "path">
}) {
	return (
		<Breadcrumb className="text-center">
			<BreadcrumbList className="p-4 !gap-0.5 sm:!gap-0.5 text-md text-gray-500 break-words justify-center">
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link href={`/${subject}`} className="underline">
							{_.startCase(subject)}
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
