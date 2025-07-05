"use client"
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function EqualGroupsExercise() {
	// State management
	const [hasStarted, setHasStarted] = useState(false)
	const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])
	const [currentQuestion, setCurrentQuestion] = useState(1)
	const [totalQuestions] = useState(7)
	const [correctAnswers, setCorrectAnswers] = useState(0)
	const [showSummary, setShowSummary] = useState(false)

	const question = {
		text: "Which expressions are equal to 7 sixes?",
		instruction: "Choose 2 answers:",
		correctAnswers: ["B", "D"],
		options: [
			{ id: "A", text: "6 × 6" },
			{ id: "B", text: "7 × 6" },
			{ id: "C", text: "7 + 6" },
			{ id: "D", text: "6 + 6 + 6 + 6 + 6 + 6 + 6" }
		]
	}

	const handleAnswerSelect = (optionId: string) => {
		if (selectedAnswers.includes(optionId)) {
			setSelectedAnswers(selectedAnswers.filter((id) => id !== optionId))
		} else if (selectedAnswers.length < 2) {
			setSelectedAnswers([...selectedAnswers, optionId])
		}
	}

	const handleStartQuiz = () => {
		setHasStarted(true)
	}

	const handleCheckAnswer = () => {
		// Check if selected answers match correct answers
		const isCorrect =
			selectedAnswers.length === question.correctAnswers.length &&
			selectedAnswers.every((answer) => question.correctAnswers.includes(answer))

		if (isCorrect) {
			setCorrectAnswers((prev) => prev + 1)
		}

		// If on last question, show summary
		if (currentQuestion === totalQuestions) {
			setShowSummary(true)
		} else {
			// Move to next question and reset selected answers
			setCurrentQuestion((prev) => prev + 1)
			setSelectedAnswers([])
		}
	}

	const handleTryAgain = () => {
		setHasStarted(false)
		setSelectedAnswers([])
		setCurrentQuestion(1)
		setCorrectAnswers(0)
		setShowSummary(false)
	}

	const getMasteryLevel = () => {
		const percentage = (correctAnswers / totalQuestions) * 100
		if (percentage >= 80) return "Mastered"
		if (percentage >= 60) return "Familiar"
		if (percentage >= 40) return "Attempted"
		return "Not started"
	}

	const getMasteryColor = () => {
		const percentage = (correctAnswers / totalQuestions) * 100
		if (percentage >= 80) return "text-green-600"
		if (percentage >= 60) return "text-blue-600"
		if (percentage >= 40) return "text-orange-600"
		return "text-gray-600"
	}

	const getPercentage = () => {
		return Math.round((correctAnswers / totalQuestions) * 100)
	}

	return (
		<div className="min-h-screen bg-white">
			{/* Header */}
			<header className="bg-blue-900 text-white px-4 py-3">
				<div className="mx-auto flex max-w-7xl items-center justify-between">
					{/* Left Navigation */}
					<div className="flex items-center space-x-6">
						<Button variant="ghost" className="text-white hover:text-blue-200 font-medium">
							Explore <ChevronDown className="ml-1 h-4 w-4" />
						</Button>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300" />
							<Input
								placeholder="Search"
								className="w-64 pl-10 bg-blue-800 border-blue-700 text-white placeholder:text-blue-300 focus:ring-blue-500"
							/>
						</div>
					</div>
					{/* Center Logo */}
					<Link href="/dashboard" className="flex items-center space-x-2">
						<div className="flex h-8 w-8 items-center justify-center rounded bg-teal-500">
							<span className="text-lg font-bold text-white">K</span>
						</div>
						<span className="text-xl font-medium text-white">Khan Academy</span>
					</Link>
					{/* Right Actions */}
					<div className="flex items-center space-x-4">
						<Button variant="ghost" className="text-blue-200 hover:text-white font-medium">
							AI for Teachers <span className="ml-1 bg-blue-600 text-white text-xs px-2 py-1 rounded">Free</span>{" "}
							<ExternalLink className="ml-1 h-4 w-4" />
						</Button>
						<Button variant="ghost" className="text-blue-200 hover:text-white font-medium">
							Donate <ExternalLink className="ml-1 h-4 w-4" />
						</Button>
						<div className="flex items-center space-x-2">
							<Button variant="ghost" className="text-white hover:text-blue-200 font-medium">
								aiden.zepp <ChevronDown className="ml-1 h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			</header>

			{/* Progress Banner */}
			<section className="bg-blue-600 text-white py-3 px-4">
				<div className="mx-auto max-w-7xl flex items-center justify-center">
					<div className="flex items-center space-x-6">
						<h2 className="text-lg font-medium">Start leveling up and building your weekly streak!</h2>
						<div className="flex items-center space-x-3">
							<div className="flex items-center space-x-2">
								<div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
									<span className="text-xs">🔥</span>
								</div>
								<span className="text-sm">
									<span className="font-bold text-xl">0</span> week streak
								</span>
							</div>
							<div className="w-px h-6 bg-blue-400" />
							<div className="text-sm">
								<span className="font-medium">Level 1</span>
								<div className="flex items-center space-x-2 mt-1">
									<span className="text-xs text-blue-200">0 / 1 skill</span>
									<div className="w-16 h-2 bg-blue-500 rounded-full">
										<div className="w-0 h-2 bg-white rounded-full" />
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Main Content */}
			<div className="flex min-h-screen">
				{/* Sidebar */}
				<div className="w-80 bg-white border-r border-gray-200 flex flex-col">
					{/* Course Header */}
					<div className="p-4 border-b border-gray-200">
						<div className="flex items-center space-x-3 mb-4">
							<div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
								<span className="text-white text-xl font-bold">×</span>
							</div>
							<div>
								<h1 className="text-lg font-bold text-gray-800">Arithmetic</h1>
							</div>
						</div>
						{/* Course Breadcrumb */}
						<div className="mb-4">
							<p className="text-xs text-blue-600 font-medium mb-2">COURSE: ARITHMETIC &gt; UNIT 1</p>
							<div className="flex items-center space-x-2 text-gray-800">
								<span className="text-sm font-medium">Lesson 1: Multiplication as equal groups</span>
								<ChevronRight className="w-4 h-4" />
							</div>
						</div>
						{/* Navigation Buttons */}
						<div className="flex items-center justify-between mb-4">
							<Button variant="ghost" size="sm" disabled className="text-gray-400">
								<ChevronLeft className="w-4 h-4 mr-1" />
								Previous in course
							</Button>
							<Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
								Next in course
								<ChevronRight className="w-4 h-4 ml-1" />
							</Button>
						</div>
					</div>
					{/* Lesson Navigation */}
					<div className="flex-1 p-4">
						<div className="space-y-2">
							<div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded">
								<div className="w-6 h-6 bg-gray-200 rounded border flex items-center justify-center">
									<span className="text-blue-600 text-sm">▶</span>
								</div>
								<span className="text-gray-800 text-sm">Introduction to multiplication</span>
							</div>
							<div className="bg-blue-50 border-l-4 border-blue-600 px-3 py-3 rounded-r">
								<div className="flex items-center space-x-3">
									<div className="w-6 h-6 bg-gray-200 rounded border flex items-center justify-center">
										<span className="text-blue-600 text-sm">✏</span>
									</div>
									<div>
										<p className="text-blue-800 font-medium text-sm">Understand equal groups as multiplication</p>
										<p className={`text-xs ${getMasteryColor()}`}>
											{showSummary ? `Attempted • ${getPercentage()}%` : "Not started"}
										</p>
									</div>
								</div>
							</div>
							<div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded">
								<div className="w-6 h-6 bg-gray-200 rounded border flex items-center justify-center">
									<span className="text-blue-600 text-sm">▶</span>
								</div>
								<span className="text-gray-800 text-sm">Multiplication as repeated addition</span>
							</div>
						</div>
						{/* Breadcrumb Navigation */}
						<div className="mt-8 pt-6 border-t border-gray-200">
							<nav className="text-xs text-gray-500 mb-4">
								<span>
									<Link href="/math" className="text-blue-600 hover:underline">
										Math
									</Link>
									<span className="mx-1">&gt;</span>
									<Link href="/math/arithmetic" className="text-blue-600 hover:underline">
										Arithmetic
									</Link>
									<span className="mx-1">&gt;</span>
									<Link href="/course/arithmetic" className="text-blue-600 hover:underline">
										Intro to multiplication
									</Link>
									<span className="mx-1">&gt;</span>
									<span>Multiplication as equal groups</span>
								</span>
							</nav>
						</div>
					</div>
					{/* Footer */}
					<div className="p-4 border-t border-gray-200 text-xs text-gray-500">
						<p className="mb-2">© 2025 Khan Academy</p>
						<div className="flex flex-wrap gap-x-2 gap-y-1">
							<Link href="#" className="hover:text-gray-700">
								Terms of use
							</Link>
							<Link href="#" className="hover:text-gray-700">
								Privacy Policy
							</Link>
							<Link href="#" className="hover:text-gray-700">
								Cookie Notice
							</Link>
							<Link href="#" className="hover:text-gray-700">
								Accessibility Statement
							</Link>
						</div>
					</div>
				</div>

				{/* Main Content Area */}
				<div className="flex-1 flex flex-col">
					{/* Content Header */}
					<div className="bg-white p-6 border-b border-gray-200">
						<div className="text-center">
							<h1 className="text-2xl font-bold text-gray-800 mb-4">Understand equal groups as multiplication</h1>
							<div className="flex justify-center space-x-4">
								<Button variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 text-sm">
									<span className="mr-2">📗</span>
									Google Classroom
								</Button>
								<Button variant="outline" className="text-purple-600 border-purple-600 hover:bg-purple-50 text-sm">
									<span className="mr-2">📘</span>
									Microsoft Teams
								</Button>
							</div>
						</div>
					</div>

					{/* Exercise Content */}
					<div className="flex-1 bg-white flex flex-col">
						{(() => {
							if (!hasStarted) {
								return (
									// Ready to Practice Interface
									<div className="flex-1 bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center relative">
										<div className="text-center text-white max-w-md">
											<h2 className="text-4xl font-bold mb-4">Ready to practice?</h2>
											<p className="text-xl mb-8 text-blue-100">Okay, show us what you can do!</p>
											<p className="text-lg text-blue-200">{totalQuestions} questions</p>
										</div>
										<div className="absolute bottom-8 right-8">
											<Button
												onClick={handleStartQuiz}
												className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-lg font-medium rounded-lg"
											>
												Let's go
											</Button>
										</div>
									</div>
								)
							}
							if (showSummary) {
								return (
									// Completion Screen
									<div className="flex-1 bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center">
										<div className="text-center text-white max-w-md">
											<h2 className="text-4xl font-bold mb-6">Keep on practicing!</h2>
											<div className="mb-8">
												<p className="text-xl mb-2">
													{correctAnswers}/{totalQuestions} correct • {correctAnswers * 100} energy pts
												</p>
												<div className="bg-blue-800 rounded-lg p-4 mb-4">
													<div className="text-left space-y-2">
														<div className="flex justify-between items-center">
															<span className="text-blue-200">Course mastery</span>
															<span className={`text-sm ${getMasteryColor()}`}>{getMasteryLevel()}</span>
														</div>
														<div className="w-full bg-blue-700 rounded-full h-2">
															<div
																className="bg-blue-400 h-2 rounded-full transition-all duration-500"
																style={{ width: `${getPercentage()}%` }}
															/>
														</div>
														<p className="text-blue-200 text-sm">{getPercentage()}% complete</p>
													</div>
												</div>
											</div>
											<div className="space-y-4">
												<Button
													onClick={handleTryAgain}
													variant="outline"
													className="w-full bg-transparent border-white text-white hover:bg-white hover:text-blue-900 py-3"
												>
													Try again
												</Button>
												<Link href="/course/arithmetic/video/introduction-to-multiplication">
													<Button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3">
														Up next: Video
													</Button>
												</Link>
											</div>
										</div>
									</div>
								)
							}
							return (
								// Quiz Question Interface
								<div className="flex-1 flex flex-col">
									{/* Question Content */}
									<div className="flex-1 p-8 max-w-4xl mx-auto w-full">
										<div className="text-center mb-8">
											<h2 className="text-xl font-medium text-gray-800 mb-4">{question.text}</h2>
											<p className="text-gray-600 mb-6">{question.instruction}</p>
										</div>
										{/* Answer Options */}
										<div className="space-y-4 mb-8">
											{question.options.map((option) => (
												<button
													type="button"
													key={option.id}
													onClick={() => handleAnswerSelect(option.id)}
													className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
														selectedAnswers.includes(option.id)
															? "border-blue-500 bg-blue-50"
															: "border-gray-300 hover:border-gray-400"
													}`}
												>
													<div className="flex items-center space-x-3">
														<div
															className={`w-8 h-8 rounded border-2 flex items-center justify-center text-sm font-medium ${
																selectedAnswers.includes(option.id)
																	? "border-blue-500 bg-blue-500 text-white"
																	: "border-gray-400 text-gray-600"
															}`}
														>
															{option.id}
														</div>
														<span className="text-gray-800">{option.text}</span>
													</div>
												</button>
											))}
										</div>
										{/* Related Content */}
										<div className="border-t border-gray-200 pt-6">
											<h3 className="text-sm font-medium text-gray-700 mb-3">Related content</h3>
											<div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
												<div className="w-16 h-12 bg-blue-900 rounded flex items-center justify-center">
													<span className="text-white text-xs">▶ 3:13</span>
												</div>
												<span className="text-blue-600 hover:underline cursor-pointer">
													Introduction to multiplication
												</span>
											</div>
										</div>
									</div>
									{/* Bottom Controls */}
									<div className="border-t border-gray-200 p-6">
										<div className="flex items-center justify-between max-w-4xl mx-auto w-full">
											{/* Left side - Problem indicator */}
											<div className="flex items-center space-x-3">
												<div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
													<span className="text-white text-sm">↻</span>
												</div>
												<span className="text-gray-700 font-medium">Do {totalQuestions} problems</span>
												<div className="flex space-x-1 ml-4">
													{Array.from({ length: totalQuestions }, (_, index) => (
														<div
															key={`question-${index + 1}`}
															className={`w-2 h-2 rounded-full ${
																index < currentQuestion ? "bg-blue-600" : "bg-gray-300"
															}`}
														/>
													))}
												</div>
											</div>
											{/* Right side - Action buttons */}
											<div className="flex items-center space-x-4">
												<Button variant="ghost" className="text-gray-600 hover:text-gray-800">
													Skip
												</Button>
												<Button
													onClick={handleCheckAnswer}
													className={`px-6 py-2 ${
														selectedAnswers.length === 2
															? "bg-blue-600 hover:bg-blue-500 text-white"
															: "bg-gray-400 text-white cursor-not-allowed"
													}`}
													disabled={selectedAnswers.length !== 2}
												>
													{currentQuestion === totalQuestions ? "Show summary" : "Check"}
												</Button>
											</div>
										</div>
										{/* Report problem link */}
										<div className="text-center mt-4">
											<button type="button" className="text-gray-500 hover:text-gray-700 text-sm">
												Report a problem
											</button>
										</div>
									</div>
								</div>
							)
						})()}
					</div>
				</div>
			</div>
		</div>
	)
}
