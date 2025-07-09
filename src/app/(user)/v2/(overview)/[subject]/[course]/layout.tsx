import * as logger from "@superbuilders/slog"
import * as React from "react"
import { Footer } from "@/components/footer"
import { CourseSidebar, type CourseSidebarData } from "@/components/overview/course/sidebar/course-sidebar"
import { getCourseBlob } from "@/components/overview/types"

export default async function CourseLayout({
	children,
	params
}: {
	children: React.ReactNode
	params: Promise<{ subject: string; course: string }>
}) {
	const { subject, course } = await params
	logger.debug("initializing course layout", { subject, course })

	const coursePromise = getCourseSidebarData(subject, course)
	logger.debug("course data retrieved", { subject, course })

	return (
		<div id="course-layout">
			<div className="flex flex-row">
				<nav id="course-layout-sidebar" className="flex-none hidden md:block lg:block sticky top-14 h-screen">
					<React.Suspense>
						<CourseSidebar coursePromise={coursePromise} />
					</React.Suspense>
				</nav>

				<main id="course-layout-main" className="flex-1 bg-gray-50 px-8 py-4 w-screen">
					{children}
				</main>
			</div>

			<div id="course-layout-footer flex-none">
				<Footer />
			</div>
		</div>
	)
}

async function getCourseSidebarData(subject: string, course: string): Promise<CourseSidebarData> {
	logger.debug("retrieving course data", { subject, course })

	return getCourseBlob(subject, course)
}
