import { Crown, Play, Star, Zap } from "lucide-react"
import type * as React from "react"
import { cn } from "@/lib/utils"

export const proficiencyIconVariants = {
	mastered: {
		color: "bg-[#594094]",
		icon: <Crown className="w-3 h-3 text-white fill-current" />,
		border: null,
		fill: 100
	},
	proficient: {
		color: "bg-[#948ebe]",
		icon: null,
		border: "border-2 border-[#948ebe]",
		fill: 100
	},
	familiar: {
		color: "bg-[#d77d0f]",
		icon: null,
		border: "border-2 border-[#d77d0f]",
		fill: 50
	},
	attempted: {
		color: "bg-[#c66024]",
		icon: null,
		border: "border-2 border-[#c66024]",
		fill: 15
	},
	notStarted: {
		color: "bg-white",
		icon: null,
		border: "border-2 border-gray-500",
		fill: 0
	},
	quiz: {
		color: "bg-gray-200",
		icon: <Zap className="w-3 h-3 text-gray-800 fill-current" />,
		border: null,
		fill: 100
	},
	unitTest: {
		color: "bg-gray-200",
		icon: <Star className="w-3 h-3 text-gray-800 fill-current" />,
		border: null,
		fill: 100
	},
	video: {
		color: "bg-white",
		icon: <Play className="w-2.5 h-2.5 text-gray-800 fill-current" />,
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

	return (
		<div
			className={cn(
				"inline-flex items-center justify-center rounded-xs w-5 h-5 relative overflow-hidden",
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
			<div className="relative z-10">{config.icon}</div>
		</div>
	)
}
