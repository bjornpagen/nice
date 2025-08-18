import { Skeleton } from "@/components/ui/skeleton"

export function AssessmentLoadingSkeleton() {
	return (
		<div className="flex flex-col h-full">
			{/* Header skeleton */}
			<div className="flex items-center justify-between p-4 border-b">
				<div className="flex items-center gap-4">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-6 w-20" />
				</div>
				<Skeleton className="h-8 w-8 rounded-full" />
			</div>

			{/* Main content area */}
			<div className="flex-1 p-8">
				<div className="max-w-2xl mx-auto space-y-6">
					{/* Question skeleton */}
					<Skeleton className="h-8 w-3/4" />
					<Skeleton className="h-24 w-full" />

					{/* Answer options skeleton */}
					<div className="space-y-3">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
					</div>
				</div>
			</div>

			{/* Bottom navigation skeleton */}
			<div className="border-t p-4">
				<div className="flex items-center justify-between">
					<Skeleton className="h-10 w-24" />
					<div className="flex items-center gap-2">
						<Skeleton className="h-2 w-2 rounded-full" />
						<Skeleton className="h-2 w-2 rounded-full" />
						<Skeleton className="h-2 w-2 rounded-full" />
						<Skeleton className="h-2 w-2 rounded-full" />
						<Skeleton className="h-2 w-2 rounded-full" />
					</div>
					<Skeleton className="h-10 w-32" />
				</div>
			</div>
		</div>
	)
}
