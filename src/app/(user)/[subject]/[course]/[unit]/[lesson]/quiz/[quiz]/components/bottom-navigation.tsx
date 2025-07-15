"use client"

import { CheckCircle, ChevronRight, ClipboardCheck, X } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"

interface BottomNavigationProps {
	onContinue: () => void
	isEnabled: boolean
	buttonText?: "Check" | "Continue"
	isStartScreen?: boolean
	currentQuestion?: number
	totalQuestions?: number
	showFeedback?: boolean
	isCorrect?: boolean
	onCloseFeedback?: () => void
}

export const BottomNavigation = React.forwardRef<HTMLButtonElement, BottomNavigationProps>(
	(
		{
			onContinue,
			isEnabled,
			buttonText,
			isStartScreen = false,
			currentQuestion,
			totalQuestions,
			showFeedback = false,
			isCorrect = false,
			onCloseFeedback
		},
		ref
	) => {
		return (
			<div className="bg-white border-t border-gray-200 shadow-lg">
				<div className="max-w-7xl mx-auto px-4 py-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-3">
							<div className="text-sm text-gray-600 font-medium">{isStartScreen ? "Ready to start:" : "Progress:"}</div>
							<div className="flex items-center space-x-2">
								<ClipboardCheck className="w-4 h-4" />
								<div className="flex flex-col">
									<div className="text-xs text-gray-500 uppercase tracking-wide">Quiz</div>
									<div className="text-sm font-medium text-gray-900">
										{isStartScreen ? "Get started" : `Question ${currentQuestion} of ${totalQuestions}`}
									</div>
								</div>
							</div>
						</div>

						<div className="relative">
							{/* Feedback tooltip above the button */}
							{showFeedback && (
								<div className="absolute bottom-full mb-6 right-0 z-50">
									<div className="relative bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[280px]">
										{/* Arrow pointing down */}
										<div className="absolute -bottom-2 right-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white" />
										<div className="absolute -bottom-[9px] right-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-gray-200" />

										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												{isCorrect ? (
													<>
														<div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
															<CheckCircle className="w-6 h-6 text-white" />
														</div>
														<div>
															<div className="font-bold text-green-900">Great work!</div>
															<div className="text-sm text-green-700">You got it. Onward!</div>
														</div>
													</>
												) : (
													<div>
														<div className="font-bold text-red-900">Not quite!</div>
														<div className="text-sm text-red-700">Give it another try!</div>
													</div>
												)}
											</div>
											{!isCorrect && (
												<button
													type="button"
													onClick={onCloseFeedback}
													className="text-gray-400 hover:text-gray-600 transition-colors ml-3"
													aria-label="Close feedback"
												>
													<X className="w-4 h-4" />
												</button>
											)}
										</div>
									</div>
								</div>
							)}

							<Button
								ref={ref}
								onClick={onContinue}
								disabled={!isEnabled}
								className={`${
									isEnabled
										? "bg-blue-600 hover:bg-blue-700 text-white"
										: "bg-gray-300 text-gray-500 cursor-not-allowed"
								}`}
							>
								{isStartScreen ? "Continue" : buttonText || "Continue"}
								<ChevronRight className="w-4 h-4 ml-1" />
							</Button>
						</div>
					</div>
				</div>
			</div>
		)
	}
)

BottomNavigation.displayName = "BottomNavigation"
