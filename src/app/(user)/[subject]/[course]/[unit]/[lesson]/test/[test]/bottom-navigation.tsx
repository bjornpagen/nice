"use client"

import { ChevronRight, FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BottomNavigationProps {
	onContinue: () => void
	isEnabled: boolean
	isStartScreen?: boolean
	currentQuestion?: number
	totalQuestions?: number
}

export function BottomNavigation({
	onContinue,
	isEnabled,
	isStartScreen = false,
	currentQuestion,
	totalQuestions
}: BottomNavigationProps) {
	return (
		<div className="bg-white border-t border-gray-200 shadow-lg">
			<div className="max-w-7xl mx-auto px-4 py-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<div className="text-sm text-gray-600 font-medium">{isStartScreen ? "Ready to start:" : "Progress:"}</div>
						<div className="flex items-center space-x-2">
							<FileCheck className="w-4 h-4" />
							<div className="flex flex-col">
								<div className="text-xs text-gray-500 uppercase tracking-wide">Test</div>
								<div className="text-sm font-medium text-gray-900">
									{isStartScreen ? "Get started" : `Question ${currentQuestion} of ${totalQuestions}`}
								</div>
							</div>
						</div>
					</div>

					<Button
						onClick={onContinue}
						disabled={!isEnabled}
						className={`${
							isEnabled ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"
						}`}
					>
						Continue
						<ChevronRight className="w-4 h-4 ml-1" />
					</Button>
				</div>
			</div>
		</div>
	)
}
