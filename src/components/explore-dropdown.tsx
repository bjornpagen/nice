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
			<DropdownMenuContent
				className="w-screen h-[calc(100vh-5rem)] p-0 overflow-y-auto border-none rounded-none shadow-lg"
				align="start"
				sideOffset={0}
				alignOffset={-200}
				style={{
					minWidth: "100vw",
					zIndex: 50
				}}
			>
				<div className="p-12 bg-white min-h-full">
					<div className="max-w-7xl mx-auto">
						<div className="grid grid-cols-4 gap-12">
							{subjectsWithCourses?.map((subject) => (
								<div key={subject.slug} className="mb-8">
									<div className="mb-6">
										<h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
											{subject.title}
										</h3>
									</div>
									<div className="space-y-3">
										{subject.courses.slice(0, 12).map((course) => (
											<Link
												key={course.id}
												href={course.path}
												className="block text-sm text-gray-600 hover:text-blue-600"
											>
												{course.title}
											</Link>
										))}
										{subject.courses.length > 12 && (
											<div className="pt-2">
												<span className="text-xs text-gray-500">+{subject.courses.length - 12} more courses</span>
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
