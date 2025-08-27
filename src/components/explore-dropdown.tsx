"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import { ChevronDown } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getOneRosterCoursesForExplore, type SubjectWithCoursesForExplore } from "@/lib/actions/courses"

interface ExploreDropdownProps {
	dark?: boolean
}

export function ExploreDropdown({ dark = false }: ExploreDropdownProps) {
	const [subjectsWithCourses, setSubjectsWithCourses] = React.useState<SubjectWithCoursesForExplore[] | null>(null)
	const [isLoading, setIsLoading] = React.useState(true)
	const [showAllCourses, setShowAllCourses] = React.useState<Record<string, boolean>>({})
	const { isSignedIn } = useUser()

	React.useEffect(() => {
		const fetchData = async () => {
			const result = await errors.try(getOneRosterCoursesForExplore())
			if (!result.error) {
				setSubjectsWithCourses(result.data)
			}
			setIsLoading(false)
		}

		if (!isSignedIn) {
			setIsLoading(false)
			return
		}

		void fetchData()
	}, [isSignedIn])

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

	if (!subjectsWithCourses || subjectsWithCourses.length === 0) {
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

	const INITIAL_COURSES_SHOWN = 12

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
				className="w-screen h-[calc(100vh-3rem)] p-0 overflow-y-auto border-none rounded-none shadow-lg"
				align="start"
				sideOffset={16}
				alignOffset={-200}
				style={{
					minWidth: "100vw",
					zIndex: 50
				}}
			>
				<div className="p-8 bg-white min-h-full">
					<div className="max-w-7xl mx-auto">
						<div className="columns-4 gap-4 space-y-0">
							{subjectsWithCourses?.map((subject) => {
								const showAll = showAllCourses[subject.slug] || false
								const coursesToShow = showAll ? subject.courses : subject.courses.slice(0, INITIAL_COURSES_SHOWN)
								const hasMoreCourses = subject.courses.length > INITIAL_COURSES_SHOWN

								return (
									<div key={subject.slug} className="break-inside-avoid mb-4">
										<div className="mb-2">
											<h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer">
												{subject.title}
											</h3>
										</div>
										<div className="space-y-2">
											{coursesToShow.map((course) =>
												course.isEnrolled ? (
													<Link
														key={course.id}
														href={course.path}
														className="block text-sm text-blue-600 hover:text-blue-700 hover:underline"
														onClick={() => {
															// Close dropdown when clicking a link
															document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
														}}
													>
														{course.title}
													</Link>
												) : (
													<span
														key={course.id}
														className="block text-sm text-gray-400 cursor-not-allowed select-none"
														aria-disabled="true"
													>
														{course.title}
													</span>
												)
											)}
											{hasMoreCourses && !showAll && (
												<button
													type="button"
													onClick={() => setShowAllCourses((prev) => ({ ...prev, [subject.slug]: true }))}
													className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
												>
													+{subject.courses.length - INITIAL_COURSES_SHOWN} more courses
												</button>
											)}
											{hasMoreCourses && showAll && (
												<button
													type="button"
													onClick={() => setShowAllCourses((prev) => ({ ...prev, [subject.slug]: false }))}
													className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
												>
													Show less
												</button>
											)}
										</div>
									</div>
								)
							})}
						</div>
					</div>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
