import _ from "lodash"
import { Crown, Star, Zap } from "lucide-react"
import type * as React from "react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

const variants = {
	mastered: {
		fg: {
			icon: Crown,
			color: "text-white fill-current"
		},
		bg: {
			color: "bg-[#594094]",
			border: null,
			fill: 100
		}
	},
	proficient: {
		fg: {
			icon: null,
			color: null
		},
		bg: {
			color: "bg-[#948ebe]",
			border: "border-1 border-[#948ebe]",
			fill: 100
		}
	},
	familiar: {
		fg: {
			icon: null,
			color: null
		},
		bg: {
			color: "bg-[#d77d0f]",
			border: "border-1 border-[#d77d0f]",
			fill: 50
		}
	},
	attempted: {
		fg: {
			icon: null,
			color: null
		},
		bg: {
			color: "bg-[#c66024]",
			border: "border-1 border-[#c66024]",
			fill: 25
		}
	},
	"not-started": {
		fg: {
			icon: null,
			color: null
		},
		bg: {
			color: "bg-white",
			border: "border-1 border-gray-500",
			fill: 0
		}
	},
	quiz: {
		fg: {
			icon: Zap,
			color: "text-gray-800 fill-current"
		},
		bg: {
			color: "bg-gray-200",
			border: null,
			fill: 100
		}
	},
	"unit-test": {
		fg: {
			icon: Star,
			color: "text-gray-800 fill-current"
		},
		bg: {
			color: "bg-gray-200",
			border: null,
			fill: 100
		}
	}
} as const
export type ProficiencyIconVariant = keyof typeof variants

const labels = {
	mastered: "Mastered",
	proficient: "Proficient",
	familiar: "Familiar",
	attempted: "Attempted",
	"not-started": "Not Started",
	quiz: "Quiz",
	"unit-test": "Unit Test"
} as const

/**
 * A general proficiency icon that can display different mastery statuses.
 *
 * @param variant - The proficiency variant to display.
 * @param children - The content to display when the icon is hovered.
 * @param size - The size of the icon.
 * @param side - The side of the icon to display the hover card.
 * @param active - Whether the icon is active.
 * @param label - Whether to display the label.
 * @returns A proficiency icon that displays the specified mastery status.
 */
export function ProficiencyIcon({
	variant,
	children,
	size = 5,
	side = "top",
	active = false,
	label = false
}: {
	variant: ProficiencyIconVariant
	children?: React.ReactNode
	size?: number
	side?: "top" | "bottom" | "left" | "right"
	active?: boolean
	label?: boolean
}) {
	const config = variants[variant]
	const text = labels[variant]

	return (
		<HoverCard openDelay={0} closeDelay={0}>
			<HoverCardTrigger asChild>
				<div className="inline-flex items-center">
					<div
						className={cn(
							"inline-flex items-center justify-center rounded-xs relative overflow-hidden",
							config.bg.color,
							config.bg.border,
							`w-${size} h-${size}`,
							active && "ring-1 ring-blue-600 ring-offset-2"
						)}
					>
						{config.bg.fill < 100 && (
							<div className="absolute top-0 left-0 w-full bg-white" style={{ height: `${100 - config.bg.fill}%` }} />
						)}

						{config.fg.icon && (
							<div className="relative z-10">
								<config.fg.icon className={cn(config.fg.color, `w-${_.round(size * 0.6)} h-${_.round(size * 0.6)}`)} />
							</div>
						)}
					</div>
					{label && <span className="text-xs text-gray-800 ml-2">{text}</span>}
				</div>
			</HoverCardTrigger>
			{children && <HoverCardContent side={side}>{children}</HoverCardContent>}
		</HoverCard>
	)
}

export function ProficiencyIconLegend({
	className,
	size = 5,
	side = "top",
	label = false
}: {
	className?: string
	size?: number
	side?: "top" | "bottom" | "left" | "right"
	label?: boolean
}) {
	return (
		<div className={cn("flex items-center", className)}>
			<ProficiencyIcon variant="mastered" size={size} label={label} side={side}>
				<h2 className="text-sm font-medium">Mastered (100 points)</h2>
				<p className="text-xs text-gray-500">
					Get a <strong>Proficient</strong> skill correct on the unit test.
				</p>
			</ProficiencyIcon>

			<ProficiencyIcon variant="proficient" size={size} label={label} side={side}>
				<h2 className="text-sm font-medium">Proficient (80 points)</h2>
				<p className="text-xs text-gray-500">
					Answer 100% of the questions correct when practicing a skill or get a <strong>Familiar</strong> skill correct
					during a quiz or unit test.
				</p>
			</ProficiencyIcon>

			<ProficiencyIcon variant="familiar" size={size} label={label} side={side}>
				<h2 className="text-sm font-medium">Familiar (50 points)</h2>
				<p className="text-xs text-gray-500">
					Get 70% or more correct when practicing a skill. Or, correctly answer a question related to a skill on a quiz
					or unit test.
				</p>
			</ProficiencyIcon>

			<ProficiencyIcon variant="attempted" size={size} label={label} side={side}>
				<h2 className="text-sm font-medium">Attempted (0 points)</h2>
				<p className="text-xs text-gray-500">
					If you get less than 70% correct when practicing a skill or if you get questions related to this skill
					incorrect on a quiz or unit test you’ll be here.
				</p>
			</ProficiencyIcon>

			<ProficiencyIcon variant="not-started" size={size} label={label} side={side}>
				<h2 className="text-sm font-medium">Not Started (0 points)</h2>
				<p className="text-xs text-gray-500">
					This is where you’ll start. Watch videos and practice skills if you’re new to the material or jump to a quiz
					or unit test if you feel more confident.
				</p>
			</ProficiencyIcon>

			<ProficiencyIcon variant="quiz" size={size} label={label} side={side} />

			<ProficiencyIcon variant="unit-test" size={size} label={label} side={side} />
		</div>
	)
}
