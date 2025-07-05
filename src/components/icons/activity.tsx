import { FileText, Pencil, Play } from "lucide-react"
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
	className
}: {
	variant: keyof typeof activityIconVariants
	color?: string
	className?: string
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

	return (
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

			{/* Icon content */}
			<div className="relative z-10">{config.getIcon(getIconSize())}</div>
		</div>
	)
}
