import { Pencil, Play, ScrollText } from "lucide-react"
import { cn } from "@/lib/utils"

const variants = {
	article: {
		fg: {
			icon: ScrollText,
			color: "text-gray-800"
		},
		bg: {
			color: "bg-white",
			border: "border-1 border-gray-500",
			fill: 100
		}
	},
	video: {
		fg: {
			icon: Play,
			color: "text-gray-800"
		},
		bg: {
			color: "bg-white",
			border: "border-1 border-gray-500",
			fill: 100
		}
	},
	exercise: {
		fg: {
			icon: Pencil,
			color: "text-gray-800"
		},
		bg: {
			color: "bg-white",
			border: "border-1 border-gray-500",
			fill: 100
		}
	}
} as const
export type LearningContentIconVariant = keyof typeof variants

export function LearningContentIcon({ variant, size = 5 }: { variant: LearningContentIconVariant; size?: number }) {
	const config = variants[variant]

	return (
		<div className="inline-flex items-center">
			<div
				className={cn(
					"inline-flex items-center justify-center rounded-xs relative overflow-hidden",
					config.bg.color,
					config.bg.border,
					`w-${size} h-${size}`
				)}
			>
				{config.bg.fill < 100 && (
					<div className="absolute top-0 left-0 w-full bg-white" style={{ height: `${100 - config.bg.fill}%` }} />
				)}

				{config.fg.icon && (
					<div className="relative z-10">
						<config.fg.icon
							className={cn(config.fg.color, `w-${Math.round(size * 0.6)} h-${Math.round(size * 0.6)}`)}
						/>
					</div>
				)}
			</div>
		</div>
	)
}
