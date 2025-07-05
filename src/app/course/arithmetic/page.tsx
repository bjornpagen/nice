"use client"

import { ChevronDown, ExternalLink, Info, Search } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ArithmeticCourse() {
	return (
		<div className="min-h-screen bg-white font-lato">
			{/* Header */}
			<header className="border-b border-gray-200 px-4 py-3 bg-white">
				<div className="mx-auto flex max-w-7xl items-center justify-between">
					{/* Left Navigation */}
					<div className="flex items-center space-x-6">
						<Button variant="ghost" className="text-blue-600 hover:text-blue-700 font-medium">
							Explore <ChevronDown className="ml-1 h-4 w-4" />
						</Button>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
							<Input placeholder="Search" className="w-64 pl-10 focus:ring-blue-500 border-gray-300" />
						</div>
					</div>

					{/* Center Logo */}
					<Link href="/dashboard" className="flex items-center space-x-2">
						<div className="flex h-8 w-8 items-center justify-center rounded bg-teal-500">
							<span className="text-lg font-bold text-white">K</span>
						</div>
						<span className="text-xl font-medium text-gray-800">Khan Academy</span>
					</Link>

					{/* Right Actions */}
					<div className="flex items-center space-x-4">
						<Button variant="ghost" className="text-blue-600 hover:text-blue-700 font-medium">
							AI for Teachers <span className="ml-1 bg-blue-600 text-white text-xs px-2 py-1 rounded">Free</span>{" "}
							<ExternalLink className="ml-1 h-4 w-4" />
						</Button>
						<Button variant="ghost" className="text-blue-600 hover:text-blue-700 font-medium">
							Donate <ExternalLink className="ml-1 h-4 w-4" />
						</Button>
						<div className="flex items-center space-x-2">
							<Button variant="ghost" className="text-gray-700 hover:text-gray-800 font-medium">
								aiden.zepp <ChevronDown className="ml-1 h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			</header>

			{/* Progress Banner */}
			<section className="bg-blue-600 text-white py-3 px-4">
				<div className="mx-auto max-w-7xl flex items-center justify-between">
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
							<Button size="sm" className="bg-blue-500 hover:bg-blue-400 text-white font-medium ml-4">
								Level up
							</Button>
						</div>
					</div>
				</div>
			</section>

			{/* Main Content */}
			<div className="flex min-h-screen">
				{/* Sidebar */}
				<div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
					<div className="p-4">
						{/* Course Header */}
						<div className="flex items-center space-x-3 mb-6">
							<div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
								<span className="text-cyan-600 text-xl font-bold">×</span>
							</div>
							<div>
								<h1 className="text-lg font-bold text-gray-800">Arithmetic</h1>
								<p className="text-sm text-gray-500">17 UNITS • 203 SKILLS</p>
							</div>
						</div>

						{/* Course Units */}
						<div className="space-y-1">
							<div className="bg-blue-50 border-l-4 border-blue-600 px-3 py-2 rounded-r">
								<h3 className="font-medium text-blue-600">UNIT 1</h3>
								<p className="text-sm text-blue-800">Intro to multiplication</p>
							</div>

							{[
								{ unit: 2, title: "1-digit multiplication" },
								{ unit: 3, title: "Intro to division" },
								{ unit: 4, title: "Understand fractions" },
								{ unit: 5, title: "Place value through 1,000,000" },
								{ unit: 6, title: "Add and subtract through 1,000,000" },
								{ unit: 7, title: "Multiply 1- and 2-digit numbers" },
								{ unit: 8, title: "Divide with remainders" },
								{ unit: 9, title: "Add and subtract fraction (like denominators)" },
								{ unit: 10, title: "Multiply fractions" },
								{ unit: 11, title: "Decimals and place value" },
								{ unit: 12, title: "Add and subtract decimals" },
								{ unit: 13, title: "Add and subtract fractions (different denominators)" },
								{ unit: 14, title: "Multiply and divide multi-digit numbers" },
								{ unit: 15, title: "Divide fractions" },
								{ unit: 16, title: "Multiply and divide decimals" },
								{ unit: 17, title: "Exponents and powers of ten" }
							].map((item) => (
								<div key={item.unit} className="px-3 py-2 hover:bg-gray-50 rounded">
									<h3 className="font-medium text-gray-600 text-sm">UNIT {item.unit}</h3>
									<p className="text-sm text-gray-800">{item.title}</p>
								</div>
							))}
						</div>

						{/* Course Challenge */}
						<div className="mt-8 pt-6 border-t border-gray-200">
							<div className="bg-gray-900 text-white p-4 rounded-lg">
								<div className="flex items-center space-x-2 mb-2">
									<span className="text-yellow-400 text-lg">🏆</span>
									<h3 className="font-bold text-sm">COURSE CHALLENGE</h3>
								</div>
								<p className="text-sm text-gray-300 mb-3">Test your knowledge of the skills in this course.</p>
								<Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium" size="sm">
									Start Course challenge
								</Button>
							</div>
						</div>
					</div>
				</div>

				{/* Main Content Area */}
				<div className="flex-1 p-6 overflow-y-auto">
					{/* Breadcrumb */}
					<div className="flex items-center space-x-2 text-sm text-blue-600 mb-6">
						<button type="button" className="hover:underline">
							🏠
						</button>
						<span className="text-gray-400">•</span>
						<button type="button" className="hover:underline">
							Math
						</button>
						<span className="text-gray-400">•</span>
						<button type="button" className="hover:underline">
							Arithmetic
						</button>
					</div>

					{/* Unit Header */}
					<div className="mb-6">
						<h1 className="text-3xl font-bold text-gray-800 mb-2">Unit 1: Intro to multiplication</h1>
						<div className="flex items-center space-x-2 text-gray-600">
							<span className="text-sm">700 possible mastery points</span>
							<Info className="w-4 h-4" />
						</div>
					</div>

					{/* Legend */}
					<div className="mb-6">
						<div className="flex items-center space-x-6 text-sm">
							<div className="flex items-center space-x-2">
								<div className="w-4 h-4 bg-purple-600 rounded" />
								<span>Mastered</span>
							</div>
							<div className="flex items-center space-x-2">
								<div className="w-4 h-4 bg-purple-400 rounded" />
								<span>Proficient</span>
							</div>
							<div className="flex items-center space-x-2">
								<div className="w-4 h-4 bg-orange-400 rounded" />
								<span>Familiar</span>
							</div>
							<div className="flex items-center space-x-2">
								<div className="w-4 h-4 bg-yellow-300 rounded" />
								<span>Attempted</span>
							</div>
							<div className="flex items-center space-x-2">
								<div className="w-4 h-4 bg-gray-200 rounded border border-gray-300" />
								<span>Not started</span>
							</div>
							<div className="flex items-center space-x-2">
								<span className="text-blue-600">⚡</span>
								<span>Quiz</span>
							</div>
							<div className="flex items-center space-x-2">
								<span className="text-yellow-500">⭐</span>
								<span>Unit test</span>
							</div>
						</div>
					</div>

					{/* Progress Indicators */}
					<div className="flex items-center space-x-2 mb-8">
						<div className="w-6 h-6 bg-gray-200 border border-gray-300 rounded" />
						<div className="w-6 h-6 bg-gray-200 border border-gray-300 rounded" />
						<div className="w-6 h-6 bg-gray-200 border border-gray-300 rounded" />
						<span className="text-blue-600 text-lg">⚡</span>
						<div className="w-6 h-6 bg-gray-200 border border-gray-300 rounded" />
						<div className="w-6 h-6 bg-gray-200 border border-gray-300 rounded" />
						<div className="w-6 h-6 bg-gray-200 border border-gray-300 rounded" />
						<div className="w-6 h-6 bg-gray-200 border border-gray-300 rounded" />
						<span className="text-blue-600 text-lg">⚡</span>
						<span className="text-yellow-500 text-lg">⭐</span>
					</div>

					{/* About This Unit */}
					<div className="mb-8">
						<h2 className="text-xl font-bold text-gray-800 mb-3">About this unit</h2>
						<p className="text-gray-700 leading-relaxed">
							Multiplication is like a shortcut for repeated addition. Instead of adding 2+2+2, you can multiply 2×3 and
							get the same answer! Whether you're using a number line, drawing groups of objects, or just crunching the
							numbers in your head, multiplication is a great way to take your math skills up a notch.
						</p>
					</div>

					{/* Practice Sections */}
					<div className="space-y-8">
						{/* Multiplication as Equal Groups */}
						<div className="border border-gray-200 rounded-lg p-6">
							<h3 className="text-lg font-bold text-gray-800 mb-4">Multiplication as equal groups</h3>

							<div className="grid grid-cols-2 gap-6">
								{/* Learn Section */}
								<div>
									<h4 className="font-medium text-gray-700 mb-3">Learn</h4>
									<div className="space-y-3">
										<div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded">
											<button
												type="button"
												className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white"
											>
												▶
											</button>
											<span className="text-gray-800">Introduction to multiplication</span>
										</div>
										<div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded">
											<button
												type="button"
												className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white"
											>
												▶
											</button>
											<span className="text-gray-800">Multiplication as repeated addition</span>
										</div>
									</div>
								</div>

								{/* Practice Section */}
								<div>
									<h4 className="font-medium text-gray-700 mb-3">Practice</h4>
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
										<div className="flex items-center justify-between mb-2">
											<div>
												<p className="text-blue-600 text-sm font-medium">Up next for you:</p>
												<h5 className="font-medium text-gray-800">Understand equal groups as multiplication</h5>
												<p className="text-sm text-gray-600">Get 5 of 7 questions to level up!</p>
											</div>
											<div className="text-right">
												<p className="text-sm text-gray-500 mb-1">Not started</p>
											</div>
										</div>
										<Link href="/course/arithmetic/exercise/equal-groups">
											<Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Start</Button>
										</Link>
									</div>
								</div>
							</div>
						</div>

						{/* Multiplication on the Number Line */}
						<div className="border border-gray-200 rounded-lg p-6">
							<h3 className="text-lg font-bold text-gray-800 mb-4">Multiplication on the number line</h3>

							<div className="grid grid-cols-2 gap-6">
								{/* Learn Section */}
								<div>
									<h4 className="font-medium text-gray-700 mb-3">Learn</h4>
									<div className="space-y-3">
										<div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded">
											<button
												type="button"
												className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white"
											>
												▶
											</button>
											<span className="text-gray-800">Multiplication on the number line</span>
										</div>
									</div>
								</div>

								{/* Practice Section */}
								<div>
									<h4 className="font-medium text-gray-700 mb-3">Practice</h4>
									<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
										<div className="flex items-center justify-between mb-2">
											<div>
												<h5 className="font-medium text-gray-800">Represent multiplication on the number line</h5>
												<p className="text-sm text-gray-600">Get 3 of 4 questions to level up!</p>
											</div>
											<div className="text-right">
												<p className="text-sm text-gray-500 mb-1">Not started</p>
											</div>
										</div>
										<Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
											Practice
										</Button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
