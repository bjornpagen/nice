"use client"

import * as errors from "@superbuilders/errors"
import { ChevronDown } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getCoursesGroupedBySubject } from "@/lib/actions/courses"

interface ExploreDropdownProps {
	dark?: boolean
}

export function ExploreDropdown({ dark = false }: ExploreDropdownProps) {
	const [subjectsWithCourses, setSubjectsWithCourses] = React.useState<Awaited<
		ReturnType<typeof getCoursesGroupedBySubject>
	> | null>(null)
	const [isLoading, setIsLoading] = React.useState(true)

	React.useEffect(() => {
		const fetchData = async () => {
			const result = await errors.try(getCoursesGroupedBySubject())
			if (result.error) {
				// Failed to fetch courses, will show empty state
			} else {
				setSubjectsWithCourses(result.data)
			}
			setIsLoading(false)
		}

		fetchData()
	}, [])

	if (isLoading) {
		return (
			<Button
				variant="ghost"
				className={`hidden lg:flex items-center space-x-1 p-2 ${dark ? "text-white" : "text-blue-600"}`}
				disabled
			>
				<span className="text-sm font-medium">Explore</span>
				<ChevronDown className="h-4 w-4" />
			</Button>
		)
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className={`hidden lg:flex items-center space-x-1 p-2 ${dark ? "text-white" : "text-blue-600"}`}
				>
					<span className="text-sm font-medium">Explore</span>
					<ChevronDown className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-[800px] p-0 max-h-[500px] overflow-y-auto">
				<div className="p-6 bg-white">
					<div className="grid grid-cols-3 gap-8">
						{subjectsWithCourses?.map((subject) => (
							<div key={subject.slug} className="mb-6">
								<div className="mb-4">
									<h3 className="text-base font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
										{subject.title}
									</h3>
								</div>
								<div className="space-y-2">
									{subject.courses.slice(0, 8).map((course) => (
										<Link
											key={course.id}
											href={course.path}
											className="block text-sm text-gray-600 hover:text-blue-600"
										>
											{course.title}
										</Link>
									))}
									{subject.courses.length > 8 && (
										<div className="pt-1">
											<span className="text-xs text-gray-500">+{subject.courses.length - 8} more courses</span>
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
