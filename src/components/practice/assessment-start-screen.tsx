"use client"

import type * as React from "react"
import { XPExplainerDialog } from "@/components/dialogs/xp-explainer-dialog"
import { AssessmentBottomNav, type AssessmentType } from "@/components/practice/assessment-bottom-nav"

interface Props {
	headerTitle: string
	headerDescription?: string
	title: string
	subtitle: string
	subtitleColorClass: string
	questionsCount: number
	expectedXp?: number // Total XP for the assessment
	onStart: () => void
	bgClass: string
	contentType: AssessmentType
	children?: React.ReactNode // For character images
	textPositioning?: string // Custom text positioning classes
}

export function AssessmentStartScreen({
	headerTitle,
	headerDescription,
	title,
	subtitle,
	subtitleColorClass,
	questionsCount,
	expectedXp,
	onStart,
	bgClass,
	contentType,
	children,
	textPositioning
}: Props) {
	const defaultPositioning = children ? "justify-start pt-16" : "justify-center"
	const positioning = textPositioning || defaultPositioning

	return (
		<div className="flex flex-col h-full">
			<div className="bg-white p-6 border-b border-gray-200 flex-shrink-0 text-center">
				<h1 className="text-2xl font-bold text-gray-900">{headerTitle}</h1>
				{headerDescription && <p className="text-gray-600 mt-2">{headerDescription}</p>}
			</div>

			<div className={`${bgClass} text-white flex-1 flex flex-col items-center ${positioning} p-12 pb-32 relative`}>
				<div className="text-center max-w-md z-10">
					<h2 className="text-3xl font-bold mb-4">{title}</h2>
					<p className={`text-lg mb-8 ${subtitleColorClass}`}>{subtitle}</p>
					<div className="text-lg font-medium mb-8 text-center">
						<div className="flex items-center justify-center gap-3">
							<span>{questionsCount} questions</span>
							{typeof expectedXp === "number" && expectedXp > 0 && (
								<>
									<span>•</span>
									<span className="flex items-center gap-1">
										{expectedXp} XP
										<XPExplainerDialog triggerVariant="icon" triggerClassName="inline-flex" />
									</span>
								</>
							)}
						</div>
						{typeof expectedXp === "number" && expectedXp > 0 && (
							<div className="text-sm text-gray-500 mt-1">Perfect score: up to {Math.round(expectedXp * 1.25)} XP</div>
						)}
					</div>
				</div>
				{children}
			</div>

			<AssessmentBottomNav contentType={contentType} onContinue={onStart} isEnabled={true} isStartScreen={true} />
		</div>
	)
}
