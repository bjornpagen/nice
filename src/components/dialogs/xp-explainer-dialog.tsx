"use client"

import { Info } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type XPExplainerDialogProps = {
	triggerVariant?: "link" | "icon"
	triggerClassName?: string
}

export function XPExplainerDialog({ triggerVariant = "link", triggerClassName }: XPExplainerDialogProps) {
	const [open, setOpen] = React.useState(false)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{triggerVariant === "icon" ? (
					<button
						type="button"
						aria-label="What is XP?"
						className={triggerClassName || "inline-flex items-center text-gray-500 hover:text-gray-700"}
						onClick={() => setOpen(true)}
					>
						<Info className="w-4 h-4" />
					</button>
				) : (
					<Button
						variant="link"
						className={triggerClassName || "p-0 h-auto text-blue-600"}
						onClick={() => setOpen(true)}
					>
						What is this?
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>How XP works</DialogTitle>
				</DialogHeader>
				<div className="space-y-3 text-sm text-gray-700">
					<p>
						XP measures progress across all content. 1 XP ≈ 1 minute of focused learning. We award XP when you
						demonstrate learning at the right rigor.
					</p>
					<ul className="list-disc pl-5 space-y-1">
						<li>
							<strong>Expected XP</strong>: The baseline minutes for this activity. Shown before you start.
						</li>
						<li>
							<strong>Awarded XP</strong>: The XP you actually earn based on accuracy and attempt.
						</li>
						<li>
							<strong>Mastery threshold</strong>: Earn XP at mastery accuracy (typically 80% for practice; 90% for unit
							tests). 100% earns a bonus.
						</li>
						<li>
							<strong>Perfect bonus</strong>: +25% XP for 100% accuracy on the first attempt.
						</li>
						<li>
							<strong>Passive content</strong> (articles/videos): Count toward XP when you master the follow-up quiz or
							test.
						</li>
					</ul>
					<p className="text-gray-600">
						We may reduce or remove XP for rushing or guessing. Do your best work for the fastest progress.
					</p>
				</div>
			</DialogContent>
		</Dialog>
	)
}
