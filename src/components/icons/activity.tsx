import { Check, FileText, Lock, Pencil, Play } from "lucide-react"
import type * as React from "react"
import { cn } from "@/lib/utils"

export const activityIconVariants = {
	video: {
		color: "bg-white",
		getIcon: (size: string) => <Play className={`${size} text-gray-800`} strokeWidth={5} />,
		border: "border-1 border-gray-500",
		fill: 100
	},
	article: {
		color: "bg-white",
		getIcon: (size: string) => <FileText className={`${size} text-gray-800`} strokeWidth={5} />,
		border: "border-1 border-gray-500",
		fill: 100
	},
	exercise: {
		color: "bg-white",
		getIcon: (size: string) => <Pencil className={`${size} text-gray-800`} strokeWidth={4} />,
		border: "border-1 border-gray-500",
		fill: 100
	}
}

export function ActivityIcon({
	variant,
	color,
	className,
	completed = false,
	progress,
	isLocked = false // Add isLocked prop
}: {
	variant: keyof typeof activityIconVariants
	color?: string
	className?: string
	completed?: boolean
	progress?: number // Progress percentage from 0 to 100
	isLocked?: boolean // Add isLocked prop
}): React.ReactNode {
	const config = activityIconVariants[variant]

	// Determine icon size based on container size
	const getIconSize = () => {
		if (className?.includes("w-8") || className?.includes("h-8")) {
			return "w-4 h-4"
		}
		if (className?.includes("w-6") || className?.includes("h-6")) {
			return "w-3 h-3"
		}
		return "w-2.5 h-2.5" // default
	}

	// Determine check size based on container size
	const getCheckSize = () => {
		if (className?.includes("w-8") || className?.includes("h-8")) {
			return "w-3 h-3"
		}
		if (className?.includes("w-6") || className?.includes("h-6")) {
			return "w-2.5 h-2.5"
		}
		return "w-2 h-2" // default
	}

	// If locked, render a lock icon and return early.
	if (isLocked) {
		return (
			<div
				className={cn(
					"inline-flex items-center justify-center rounded-xs w-5 h-5 bg-gray-200 border-1 border-gray-300",
					className
				)}
			>
				<Lock className={cn(getIconSize(), "text-gray-500")} />
			</div>
		)
	}

	// Calculate if we should show partial progress
	const hasProgress = progress !== undefined && progress > 0
	const isFullyComplete = completed && (!hasProgress || progress >= 100)
	const progressPercentage = hasProgress ? Math.min(Math.max(progress, 0), 100) : 0

	return (
		<div className="relative inline-block">
			{/* Main icon container */}
			<div
				className={cn(
					"inline-flex items-center justify-center rounded-xs w-5 h-5 relative overflow-hidden",
					color ?? config.color,
					config.border,
					className
				)}
			>
				{/* White overlay mask */}
				{config.fill < 100 && (
					<div className="absolute top-0 left-0 w-full bg-white" style={{ height: `${100 - config.fill}%` }} />
				)}

				{/* Icon content - always use the same gray color */}
				<div className="relative z-10">{config.getIcon(getIconSize())}</div>

				{/* Blue progress bar at bottom - shows for partial progress or full completion */}
				{(hasProgress || completed) && (
					<div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-200">
						<div
							className="h-full bg-blue-600 transition-all duration-300"
							style={{ width: completed ? "100%" : `${progressPercentage}%` }}
						/>
					</div>
				)}
			</div>

			{/* Blue check mark in top right corner - only show when fully complete */}
			{isFullyComplete && (
				<div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
					<Check className={cn(getCheckSize(), "text-white")} strokeWidth={3} />
				</div>
			)}
		</div>
	)
}
