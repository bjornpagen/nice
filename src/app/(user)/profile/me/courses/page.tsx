import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchProfileCoursesData } from "@/lib/data/profile"
import type { ProfileCoursesPageData } from "@/lib/types/page"
import { Content } from "./components/content"

function CourseCardSkeleton() {
	return (
		<div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-full space-y-4">
			<div className="flex items-start justify-between">
				<Skeleton className="h-6 w-3/4" />
			</div>
			<div className="space-y-2">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
			</div>
			<div className="flex-1 space-y-3 relative">
				<div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
				{[...Array(3)].map((_, i) => (
					<div key={i} className="flex items-center space-x-3">
						<Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
						<Skeleton className="h-4 w-2/3" />
					</div>
				))}
			</div>
			<div className="flex justify-end">
				<Skeleton className="h-9 w-24" />
			</div>
		</div>
	)
}

export default async function ProfileCoursesPage() {
	const coursesPromise: Promise<ProfileCoursesPageData> = fetchProfileCoursesData()

	return (
		<React.Suspense
			fallback={
				<>
					<div className="flex items-center justify-between mb-6">
						<h1 className="text-2xl font-bold text-gray-800">My courses</h1>
						<div className="h-9 w-24 bg-gray-200 rounded-md animate-pulse" />
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<CourseCardSkeleton />
						<CourseCardSkeleton />
					</div>
				</>
			}
		>
			<Content coursesPromise={coursesPromise} />
		</React.Suspense>
	)
}
