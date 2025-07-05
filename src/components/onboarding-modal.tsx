"use client"

import { X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface OnboardingStep {
	title: string
	content: React.ReactNode
	image?: string
}

const onboardingSteps: OnboardingStep[] = [
	{
		title: "Reach new levels!",
		image: "https://cdn.kastatic.org/images/mastery/skills-to-proficient/onboarding-level-once.gif",
		content: (
			<span>
				"Boost your learning by reaching " <b>Proficient or higher</b>
				{" in as many skills as possible. Our new banner tracks your progress for all skills on our site!"}
			</span>
		)
	},
	{
		title: "Build weekly streaks!",
		image: "https://cdn.kastatic.org/images/mastery/skills-to-proficient/onboarding-streak-once.gif",
		content: (
			<span>
				"Maintain your streak by achieving <b>Proficient or higher</b>
				{" in at least one skill each week to keep your streak going!"}
			</span>
		)
	},
	{
		title: "Jump back in faster than ever!",
		image: "https://cdn.kastatic.org/images/mastery/skills-to-proficient/onboarding-cta-twice.gif",
		content: (
			<span>
				Click the button to go directly to your <b>next suggested skill</b>
				{" on your personalized Khan Academy journey."}
			</span>
		)
	},
	{
		title: "Review progress in recent courses!",
		image: "https://cdn.kastatic.org/images/mastery/skills-to-proficient/onboarding-recent-progress-once.gif",
		content: (
			<>
				<span>
					"Click the " <b>triangle icon</b>
					{" to see your progress in recent courses and navigate between them."}
				</span>
				<div className="mt-4">
					<Link
						href="https://support.khanacademy.org/hc/en-us/articles/360054115071"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-600 hover:underline"
					>
						"Learn more about streaks and leveling up"
						<span className="ml-1">↗</span>
					</Link>
				</div>
			</>
		)
	}
]

export function OnboardingModal() {
	const [open, setOpen] = React.useState(true)
	const [currentStep, setCurrentStep] = React.useState(0)

	const handleNext = () => {
		if (currentStep < onboardingSteps.length - 1) {
			setCurrentStep(currentStep + 1)
		}
	}

	const handlePrevious = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1)
		}
	}

	const handleClose = () => {
		setOpen(false)
	}

	const step = onboardingSteps[currentStep]
	const isLastStep = currentStep === onboardingSteps.length - 1

	if (!step) return null

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="max-w-2xl p-0 overflow-hidden">
				<div className="relative">
					{/* Close button */}
					<button
						type="button"
						onClick={handleClose}
						className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
					>
						<X className="h-4 w-4" />
						<span className="sr-only">Close modal</span>
					</button>

					{/* Content */}
					<div className="p-8 pt-12">
						<div className="text-center">
							{/* Image */}
							{step.image && (
								<div className="mb-6 flex justify-center">
									<Image src={step.image} alt={step.title} width={400} height={250} className="rounded-lg" />
								</div>
							)}

							{/* Title */}
							<DialogTitle className="mb-4 text-2xl font-semibold text-gray-900">{step.title}</DialogTitle>

							{/* Content */}
							<div className="mb-8 text-base text-gray-700 max-w-lg mx-auto">{step.content}</div>
						</div>

						{/* Navigation */}
						<div className="flex items-center justify-between border-t pt-4">
							<span className="text-sm text-gray-600">
								Step {currentStep + 1} of {onboardingSteps.length}
							</span>

							<div className="flex gap-3">
								{currentStep > 0 && (
									<Button variant="outline" onClick={handlePrevious} className="min-w-[100px]">
										Previous
									</Button>
								)}

								{!isLastStep ? (
									<Button onClick={handleNext} className="min-w-[100px] bg-blue-600 hover:bg-blue-700">
										Next
									</Button>
								) : (
									<Button onClick={handleClose} className="min-w-[100px] bg-blue-600 hover:bg-blue-700">
										Close
									</Button>
								)}
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
