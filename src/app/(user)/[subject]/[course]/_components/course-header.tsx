import _ from "lodash"
import { House } from "lucide-react"
import Link from "next/link"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator
} from "@/components/ui/breadcrumb"

export function CourseHeader({ subject, course }: { subject: string; course: string }) {
	return (
		<div className="flex items-center space-x-2 text-sm text-blue-600 mb-6">
			<Breadcrumb>
				<BreadcrumbList className="flex items-center gap-2 text-sm">
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href="/profile/me/courses" className="text-blue-600 hover:text-blue-800">
								<House className="w-4 h-4" />
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator className="text-gray-400">•</BreadcrumbSeparator>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href={`/${subject}`} className="text-blue-600 hover:text-blue-800">
								{_.capitalize(subject)}
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator className="text-gray-400">•</BreadcrumbSeparator>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href={`/${subject}/${course}`} className="text-blue-600 hover:text-blue-800">
								{_.capitalize(course)}
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	)
}
