"use client"

import * as React from "react"
import * as errors from "@superbuilders/errors"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>>(
	({ className, value, ...props }, ref) => {
		// Validate critical progress data - NO FALLBACKS!
		if (typeof value !== "number") {
			throw errors.new("progress: value must be a number")
		}
		if (value < 0) {
			throw errors.new("progress: value cannot be negative") 
		}
		if (value > 100) {
			throw errors.new("progress: value cannot exceed 100")
		}

		return (
			<ProgressPrimitive.Root
				ref={ref}
				data-slot="progress"
				className={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className)}
				{...props}
			>
				<ProgressPrimitive.Indicator
					data-slot="progress-indicator"
					className="bg-primary h-full w-full flex-1 transition-all"
					style={{ transform: `translateX(-${100 - value}%)` }}
				/>
			</ProgressPrimitive.Root>
		)
	}
)

export { Progress }
