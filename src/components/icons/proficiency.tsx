import { Crown, Play, Star, Zap } from "lucide-react"
import type * as React from "react"
import { cn } from "@/lib/utils"

export const proficiencyIconVariants = {
	mastered: {
		color: "bg-[#594094]",
		getIcon: (size: string) => <Crown className={`${size} text-white fill-current`} />,
		border: null,
		fill: 100
	},
	proficient: {
		color: "bg-[#948ebe]",
		getIcon: () => null,
		border: "border-2 border-[#948ebe]",
		fill: 100
	},
	familiar: {
		color: "bg-[#d77d0f]",
		getIcon: () => null,
		border: "border-2 border-[#d77d0f]",
		fill: 50
	},
	attempted: {
		color: "bg-[#c66024]",
		getIcon: () => null,
		border: "border-2 border-[#c66024]",
		fill: 15
	},
	notStarted: {
		color: "bg-white",
		getIcon: () => null,
		border: "border-2 border-gray-500",
		fill: 0
	},
	quiz: {
		color: "bg-gray-200",
		getIcon: (size: string) => <Zap className={`${size} text-gray-800 fill-current`} />,
		border: null,
		fill: 100
	},
	unitTest: {
		color: "bg-gray-200",
		getIcon: (size: string) => <Star className={`${size} text-gray-800 fill-current`} />,
		border: null,
		fill: 100
	},
	video: {
		color: "bg-white",
		getIcon: (size: string) => <Play className={`${size} text-gray-800 fill-current`} />,
		border: "border-1 border-gray-500",
		fill: 100
	}
}

export function ProficiencyIcon({
	variant,
	className
}: {
	variant: keyof typeof proficiencyIconVariants
	className?: string
}): React.ReactNode {
	const config = proficiencyIconVariants[variant]

	// Determine icon size based on container size - matches ActivityIcon logic
	const getIconSize = () => {
		if (className?.includes("w-8") || className?.includes("h-8")) {
			return "w-4 h-4"
		}
		if (className?.includes("w-6") || className?.includes("h-6")) {
			return "w-3 h-3"
		}
		return "w-2.5 h-2.5" // default
	}

	// Default size is w-5 h-5, but respect className if provided
	const baseSize = className?.match(/w-\d+|h-\d+/) ? "" : "w-5 h-5"

	return (
		<div
			className={cn(
				"inline-flex items-center justify-center rounded-xs relative overflow-hidden flex-shrink-0",
				baseSize,
				config.color,
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
