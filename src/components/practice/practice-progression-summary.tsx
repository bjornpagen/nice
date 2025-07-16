"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { CourseMaterial } from "@/lib/v2/types"

export function PracticeProgressionSummary({
	exercise,
	index,
	className
}: {
	exercise: Extract<CourseMaterial, { type: "Exercise" }>
	index: number
	className?: string
}) {
	const [isOpen, setIsOpen] = React.useState(false)

	if (index < exercise.data.questions.length) {
		return null
	}

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("flex w-[350px] flex-col gap-2", className)}>
			<div className="flex items-center justify-between gap-4 px-4">
				<h4 className="text-sm font-semibold">@peduarte starred 3 repositories</h4>
				<CollapsibleTrigger asChild>
					<Button variant="ghost" size="icon" className="size-8">
						{isOpen ? (
							<React.Fragment>
								<ChevronUp className="size-4" />
								<span>Hide</span>
							</React.Fragment>
						) : (
							<React.Fragment>
								<ChevronDown className="size-4" />
								<span>Show</span>
							</React.Fragment>
						)}
						<span className="sr-only">Toggle</span>
					</Button>
				</CollapsibleTrigger>
			</div>
			<div className="rounded-md border px-4 py-2 font-mono text-sm">@radix-ui/primitives</div>
			<CollapsibleContent className="flex flex-col gap-2">
				<div className="rounded-md border px-4 py-2 font-mono text-sm">@radix-ui/colors</div>
				<div className="rounded-md border px-4 py-2 font-mono text-sm">@stitches/react</div>
			</CollapsibleContent>
		</Collapsible>
	)
}
