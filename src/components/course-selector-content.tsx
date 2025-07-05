"use client"

import { X } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface Course {
	id: string
	slug: string
	title: string
	path: string
}

interface Subject {
	slug: string
	title: string
	courses: Course[]
}

interface CourseSelectorProps {
	subjects: Subject[]
	onComplete?: (selectedCourseIds: string[]) => void
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function CourseSelector({ subjects, onComplete, open, onOpenChange }: CourseSelectorProps) {
	const [selectedCourses, setSelectedCourses] = React.useState<Set<string>>(new Set())
	const [showAllCourses, setShowAllCourses] = React.useState<Record<string, boolean>>({})

	// Toggle course selection
	const toggleCourse = (courseId: string) => {
		setSelectedCourses((prev) => {
			const next = new Set(prev)
			if (next.has(courseId)) {
				next.delete(courseId)
			} else {
				next.add(courseId)
			}
			return next
		})
	}

	// Handle continue button
	const handleContinue = () => {
		if (onComplete) {
			onComplete(Array.from(selectedCourses))
		}
		onOpenChange(false)
	}

	// Calculate how many courses to show initially (similar to Khan Academy)
	const INITIAL_COURSES_SHOWN = 8

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[840px] w-full p-0 overflow-hidden" showCloseButton={false}>
				<div className="relative">
					{/* X Button */}
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						className="absolute top-3 left-3 z-10 text-gray-500 hover:text-gray-700 transition-colors"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>

					{/* Title section with white background */}
					<div className="bg-white pt-8 pb-4 px-8 text-center">
						<DialogTitle className="text-2xl font-bold text-gray-900 mb-2">Personalize Nice Academy</DialogTitle>
					</div>

					{/* Blue header section */}
					<div className="bg-[#0b7594] pt-6 pb-6 px-8 text-center">
						<h2 className="text-xl font-semibold text-white mb-1">What courses can we help you learn?</h2>
						<p className="text-white text-sm">Choose 4-5 and we'll gather the right lessons for you.</p>
					</div>

					{/* Content */}
					<div className="p-6 max-h-[400px] overflow-y-auto bg-white">
						{subjects.map((subject, index) => {
							const showAll = showAllCourses[subject.slug] || false
							const coursesToShow = showAll ? subject.courses : subject.courses.slice(0, INITIAL_COURSES_SHOWN)
							const hasMoreCourses = subject.courses.length > INITIAL_COURSES_SHOWN

							return (
								<div key={subject.slug} className={index < subjects.length - 1 ? "mb-5" : ""}>
									{/* Subject Header */}
									<div className="flex items-center justify-between w-full mb-2">
										<h3 className="text-base font-semibold text-gray-900">{subject.title}</h3>
										<div className="flex items-center gap-2">
											{hasMoreCourses && !showAll && (
												<button
													type="button"
													onClick={() => setShowAllCourses((prev) => ({ ...prev, [subject.slug]: true }))}
													className="text-sm text-blue-600 hover:underline"
												>
													See all ({subject.courses.length})
												</button>
											)}
											{hasMoreCourses && showAll && (
												<button
													type="button"
													onClick={() => setShowAllCourses((prev) => ({ ...prev, [subject.slug]: false }))}
													className="text-sm text-blue-600 hover:underline"
												>
													See fewer
												</button>
											)}
										</div>
									</div>

									{/* Divider line */}
									<div className="border-b border-gray-200 mb-3" />

									{/* Course List - Always visible */}
									<div className="grid grid-cols-2 gap-x-4 gap-y-1">
										{coursesToShow.map((course) => (
											<div key={course.id} className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded px-1">
												<Checkbox
													checked={selectedCourses.has(course.id)}
													onCheckedChange={() => toggleCourse(course.id)}
													className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-4 w-4"
													id={`course-${course.id}`}
												/>
												<label htmlFor={`course-${course.id}`} className="text-sm cursor-pointer flex-1 py-0.5">
													{course.title}
												</label>
											</div>
										))}
									</div>
								</div>
							)
						})}
					</div>

					{/* Footer */}
					<div className="border-t border-gray-200 p-4 flex items-center justify-end bg-gray-50">
						<Button
							onClick={handleContinue}
							disabled={selectedCourses.size === 0}
							className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-6"
						>
							{selectedCourses.size === 0
								? "Choose 1 course to continue"
								: `Continue with ${selectedCourses.size} course${selectedCourses.size === 1 ? "" : "s"}`}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
