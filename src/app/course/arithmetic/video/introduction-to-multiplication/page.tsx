"use client"

import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function IntroductionToMultiplicationVideo() {
	const [activeTab, setActiveTab] = useState<"about" | "transcript">("about")
	const [activeSection, setActiveSection] = useState<"questions" | "tips">("tips")

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
								<h1 className="text-lg font-bold text-gray-800">AP®/College Chemistry</h1>
							</div>
						</div>
						{/* Course Breadcrumb */}
						<div className="mb-4">
							<p className="text-xs text-blue-600 font-medium mb-2">COURSE: AP®/COLLEGE CHEMISTRY &gt; UNIT 1</p>
							<div className="flex items-center space-x-2 text-gray-800">
								<span className="text-sm font-medium">Lesson 1: Moles and molar mass</span>
								<ChevronRight className="w-4 h-4" />
							</div>
						</div>
						{/* Navigation Buttons */}
						<div className="flex items-center justify-between mb-4">
							<Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
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
								<span className="text-gray-800 text-sm">Average atomic mass</span>
							</div>
							<div className="bg-blue-50 border-l-4 border-blue-600 px-3 py-3 rounded-r">
								<div className="flex items-center space-x-3">
									<div className="w-6 h-6 bg-blue-600 rounded border flex items-center justify-center">
										<span className="text-white text-sm">▶</span>
									</div>
									<div>
										<p className="text-blue-800 font-medium text-sm">The mole and Avogadro's number</p>
										<p className="text-xs text-blue-600">Not started</p>
									</div>
								</div>
							</div>
							<div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded">
								<div className="w-6 h-6 bg-gray-200 rounded border flex items-center justify-center">
									<span className="text-blue-600 text-sm">▶</span>
								</div>
								<span className="text-gray-800 text-sm">Worked example: Calculating molar...</span>
							</div>
							<div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded">
								<div className="w-6 h-6 bg-gray-200 rounded border flex items-center justify-center">
									<span className="text-blue-600 text-sm">✏</span>
								</div>
								<span className="text-gray-800 text-sm">Moles and molar mass</span>
								<span className="text-xs text-gray-500">Not started</span>
							</div>
						</div>
						{/* Breadcrumb Navigation */}
						<div className="mt-8 pt-6 border-t border-gray-200">
							<nav className="text-xs text-gray-500 mb-4">
								<span>
									<Link href="/science" className="text-blue-600 hover:underline">
										Science
									</Link>
									<span className="mx-1">&gt;</span>
									<Link href="/science/ap-college-chemistry" className="text-blue-600 hover:underline">
										AP®/College Chemistry
									</Link>
									<span className="mx-1">&gt;</span>
									<Link
										href="/science/ap-college-chemistry/atomic-structure-and-properties"
										className="text-blue-600 hover:underline"
									>
										Atomic structure and properties
									</Link>
									<span className="mx-1">&gt;</span>
									<span>Moles and molar mass</span>
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
							<h1 className="text-2xl font-bold text-gray-800 mb-4">The mole and Avogadro's number</h1>
							<div className="flex justify-center space-x-4">
								<Button variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 text-sm">
									<Image
										src="https://cdn.kastatic.org/images/google_classroom_color.png"
										alt=""
										width={16}
										height={16}
										className="w-4 h-4 mr-2"
									/>
									Google Classroom
								</Button>
								<Button variant="outline" className="text-purple-600 border-purple-600 hover:bg-purple-50 text-sm">
									<span className="mr-2">📘</span>
									Microsoft Teams
								</Button>
							</div>
						</div>
					</div>

					{/* Video Player Container */}
					<div className="bg-black relative">
						<div className="aspect-video relative">
							<iframe
								src="https://www.youtube-nocookie.com/embed/cvi4IJMZ13Q/?controls=1&enablejsapi=1&modestbranding=1&showinfo=0&origin=https%3A%2F%2Fwww.khanacademy.org&iv_load_policy=3&html5=1&fs=1&rel=0&hl=en&cc_lang_pref=en&cc_load_policy=1&start=0"
								title="The mole and Avogadro's number"
								className="w-full h-full"
								allowFullScreen
								allow="autoplay"
							/>
							{/* Energy Points Display */}
							<div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
								0 energy points
							</div>
						</div>
					</div>

					{/* Content Below Video */}
					<div className="flex-1 bg-white">
						{/* About/Transcript Tabs */}
						<div className="border-b border-gray-200">
							<div className="px-6">
								<div className="flex space-x-0" role="tablist">
									<button
										type="button"
										onClick={() => setActiveTab("about")}
										className={`px-0 py-4 text-sm font-medium border-b-2 mr-8 ${
											activeTab === "about"
												? "border-blue-500 text-blue-600"
												: "border-transparent text-gray-500 hover:text-gray-700"
										}`}
										role="tab"
										aria-selected={activeTab === "about"}
									>
										About
									</button>
									<button
										type="button"
										onClick={() => setActiveTab("transcript")}
										className={`px-0 py-4 text-sm font-medium border-b-2 ${
											activeTab === "transcript"
												? "border-blue-500 text-blue-600"
												: "border-transparent text-gray-500 hover:text-gray-700"
										}`}
										role="tab"
										aria-selected={activeTab === "transcript"}
									>
										Transcript
									</button>
								</div>
							</div>
						</div>

						{/* Tab Content */}
						<div className="px-6 py-6" role="tabpanel">
							{activeTab === "about" && (
								<div>
									<p className="text-gray-700 leading-relaxed">
										One mole of a substance is equal to 6.022 × 10²³ units of that substance (such as atoms, molecules,
										or ions). The number 6.022 × 10²³ is known as Avogadro's number or Avogadro's constant. The concept
										of the mole can be used to convert between mass and number of particles. Created by Sal Khan.
									</p>
								</div>
							)}

							{activeTab === "transcript" && (
								<div className="space-y-3">
									<div className="flex items-start space-x-4">
										<div className="w-12 h-3 bg-red-600 rounded-sm flex items-center justify-center mt-1">
											<span className="text-white text-xs font-bold">•</span>
										</div>
										<div className="flex-1">
											<div className="flex items-start space-x-2">
												<span className="text-red-600 font-medium text-sm min-w-[3rem]">0:00</span>
												<span className="text-gray-600 text-sm">- [Instructor] In a previous video,</span>
											</div>
										</div>
									</div>
									<div className="flex items-start space-x-4">
										<div className="w-12" />
										<div className="flex-1">
											<div className="flex items-start space-x-2">
												<span className="text-gray-800 font-medium text-sm min-w-[3rem]">0:01</span>
												<span className="text-gray-600 text-sm">
													we introduced ourselves to the idea of average atomic mass,
												</span>
											</div>
										</div>
									</div>
									<div className="flex items-start space-x-4">
										<div className="w-12" />
										<div className="flex-1">
											<div className="flex items-start space-x-2">
												<span className="text-gray-800 font-medium text-sm min-w-[3rem]">0:06</span>
												<span className="text-gray-600 text-sm">
													which we began to realize could be a very useful way
												</span>
											</div>
										</div>
									</div>
									<div className="flex items-start space-x-4">
										<div className="w-12" />
										<div className="flex-1">
											<div className="flex items-start space-x-2">
												<span className="text-gray-800 font-medium text-sm min-w-[3rem]">0:09</span>
												<span className="text-gray-600 text-sm">of thinking about a mass at an atomic level,</span>
											</div>
										</div>
									</div>
									<div className="flex items-start space-x-4">
										<div className="w-12" />
										<div className="flex-1">
											<div className="flex items-start space-x-2">
												<span className="text-gray-800 font-medium text-sm min-w-[3rem]">0:13</span>
												<span className="text-gray-600 text-sm">or at a molecular level.</span>
											</div>
										</div>
									</div>
									<div className="flex items-start space-x-4">
										<div className="w-12" />
										<div className="flex-1">
											<div className="flex items-start space-x-2">
												<span className="text-gray-800 font-medium text-sm min-w-[3rem]">0:15</span>
												<span className="text-gray-600 text-sm">But, what we're gonna do in this video</span>
											</div>
										</div>
									</div>
									<div className="flex items-start space-x-4">
										<div className="w-12" />
										<div className="flex-1">
											<div className="flex items-start space-x-2">
												<span className="text-gray-800 font-medium text-sm min-w-[3rem]">0:16</span>
												<span className="text-gray-600 text-sm">
													is connect it to the masses that we might actually see
												</span>
											</div>
										</div>
									</div>
									<div className="flex items-start space-x-4">
										<div className="w-12" />
										<div className="flex-1">
											<div className="flex items-start space-x-2">
												<span className="text-gray-800 font-medium text-sm min-w-[3rem]">0:19</span>
												<span className="text-gray-600 text-sm">in a chemistry lab.</span>
											</div>
										</div>
									</div>
									<div className="flex items-start space-x-4">
										<div className="w-12" />
										<div className="flex-1">
											<div className="flex items-start space-x-2">
												<span className="text-gray-800 font-medium text-sm min-w-[3rem]">0:20</span>
												<span className="text-gray-600 text-sm">
													You're very unlikely to just be dealing with one atom,
												</span>
											</div>
										</div>
									</div>
								</div>
							)}
						</div>

						{/* Discussion Section */}
						<div className="border-t border-gray-200">
							<div className="px-6">
								<div className="flex space-x-0" role="tablist">
									<button
										type="button"
										onClick={() => setActiveSection("questions")}
										className={`px-0 py-4 text-sm font-medium border-b-2 mr-8 ${
											activeSection === "questions"
												? "border-blue-500 text-blue-600"
												: "border-transparent text-gray-500 hover:text-gray-700"
										}`}
									>
										Questions
									</button>
									<button
										type="button"
										onClick={() => setActiveSection("tips")}
										className={`px-0 py-4 text-sm font-medium border-b-2 ${
											activeSection === "tips"
												? "border-blue-500 text-blue-600"
												: "border-transparent text-gray-500 hover:text-gray-700"
										}`}
									>
										Tips &amp; Thanks
									</button>
								</div>
							</div>
						</div>

						{/* Discussion Content */}
						<div className="px-6 py-6">
							<div className="mb-6">
								<h3 className="text-lg font-medium text-gray-800 mb-2">Want to join the conversation?</h3>
								<p className="text-gray-600 text-sm mb-4">
									To get started, your account must be at least 3 days old, have a verified email address, and have at
									least 5,000 energy points.
								</p>
							</div>

							<div className="flex items-center justify-between mb-6">
								<div />
								<div className="flex items-center space-x-2">
									<label htmlFor="sortBy" className="text-sm text-gray-600">
										Sort by:
									</label>
									<select id="sortBy" className="border border-gray-300 rounded px-3 py-1 text-sm">
										<option>Top Voted</option>
										<option>Most Recent</option>
										<option>Oldest First</option>
									</select>
								</div>
							</div>

							{/* Sample Comments */}
							<div className="space-y-6">
								<div className="flex items-start space-x-3">
									<div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
										<span className="text-white text-sm font-bold">B</span>
									</div>
									<div className="flex-1">
										<div className="flex items-center space-x-2 mb-1">
											<span className="font-medium text-gray-800">Berny</span>
											<span className="text-gray-500 text-sm">2 years ago</span>
										</div>
										<div className="text-gray-700 text-sm mb-2">
											<p>
												<strong>
													If you would like the best and most concrete understanding explanation that I know, READ THIS
													🤩
												</strong>
											</p>
											<p className="mt-2">
												You see, something that may clear up a lot of confusion in regards to the concept of moles and
												molar mass, is the fact that: <strong>1 mole of 1 AMU is going to be equal to 1 gram</strong>.
											</p>
										</div>
										<div className="flex items-center space-x-4 text-sm text-gray-500">
											<span>(112 votes)</span>
											<button type="button" className="hover:text-gray-700">
												↑ Upvote
											</button>
											<button type="button" className="hover:text-gray-700">
												↓ Downvote
											</button>
											<button type="button" className="hover:text-gray-700">
												4 comments
											</button>
										</div>
									</div>
								</div>

								<div className="flex items-start space-x-3">
									<div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
										<span className="text-white text-sm font-bold">A</span>
									</div>
									<div className="flex-1">
										<div className="flex items-center space-x-2 mb-1">
											<span className="font-medium text-gray-800">Alpha_IRIS</span>
											<span className="text-gray-500 text-sm">5 years ago</span>
										</div>
										<div className="text-gray-700 text-sm mb-2">
											<p>
												"A mole is NOT a mark on your cheek or a burrowing animal... well actually it is both of those
												things-"
											</p>
											<p>
												<strong>Brain.exe has stopped working</strong>
											</p>
										</div>
										<div className="flex items-center space-x-4 text-sm text-gray-500">
											<span>(11 votes)</span>
											<button type="button" className="hover:text-gray-700">
												↑ Upvote
											</button>
											<button type="button" className="hover:text-gray-700">
												↓ Downvote
											</button>
											<button type="button" className="hover:text-gray-700">
												Comment
											</button>
										</div>
									</div>
								</div>

								<div className="flex items-start space-x-3">
									<div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
										<span className="text-white text-sm font-bold">H</span>
									</div>
									<div className="flex-1">
										<div className="flex items-center space-x-2 mb-1">
											<span className="font-medium text-gray-800">Havik</span>
											<span className="text-gray-500 text-sm">9 years ago</span>
										</div>
										<div className="text-gray-700 text-sm mb-2">
											<p>Sal, you are awesome. Thank you so much. You make everything so clear!</p>
										</div>
										<div className="flex items-center space-x-4 text-sm text-gray-500">
											<span>(2 votes)</span>
											<button type="button" className="hover:text-gray-700">
												↑ Upvote
											</button>
											<button type="button" className="hover:text-gray-700">
												↓ Downvote
											</button>
											<button type="button" className="hover:text-gray-700">
												Comment
											</button>
										</div>
									</div>
								</div>
							</div>

							<div className="mt-8 text-center">
								<Button variant="outline" className="px-6">
									Show more comments
								</Button>
							</div>
						</div>

						{/* Video Transcript Section */}
						<div className="border-t border-gray-200 px-6 py-8">
							<h2 className="text-lg font-medium text-gray-800 mb-4">Video transcript</h2>
							<div className="text-gray-700 leading-relaxed text-sm">
								<p>
									- [Instructor] In a previous video, we introduced ourselves to the idea of average atomic mass, which
									we began to realize could be a very useful way of thinking about a mass at an atomic level, or at a
									molecular level. But, what we're gonna do in this video is connect it to the masses that we might
									actually see in a chemistry lab. You're very unlikely to just be dealing with one atom, or just a few
									atoms, or just a few molecules. You're more likely to deal with several grams of an actual substance.
									So, how do we go from the masses at an atomic scale to the masses, masses of samples that you see in
									an actual chemistry lab, or in, I guess you could say, r-scale of the world. Well, the chemistry
									community has come up with a useful tool. They said, all right, let's think about a given element. So,
									say, lithium. We know its average atomic mass is 6.94, 6.94 unified atomic mass units per atom, atom
									of lithium. What if there were a certain number of atoms of lithium such that if I have that number,
									so that if I have that number of lithium atoms such that the total mass comes out to be 6.94 grams.
								</p>
							</div>
							<div className="mt-6 flex justify-between items-center text-sm">
								<Link href="#" className="text-blue-600 hover:underline flex items-center">
									Creative Commons Attribution/Non-Commercial/Share-Alike
									<ExternalLink className="ml-1 h-3 w-3" />
								</Link>
								<Link
									href="https://www.youtube.com/watch?v=cvi4IJMZ13Q"
									className="text-blue-600 hover:underline flex items-center"
								>
									Video on YouTube
									<ExternalLink className="ml-1 h-3 w-3" />
								</Link>
							</div>
						</div>

						{/* Footer Navigation */}
						<div className="border-t border-gray-200 px-6 py-4">
							<div className="flex justify-end">
								<Link href="/science/ap-chemistry-beta/x2eef969c74e0d802:atomic-structure-and-properties/x2eef969c74e0d802:moles-and-molar-mass/v/worked-example-calculating-molar-mass-and-number-of-moles">
									<Button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-sm font-medium">
										Up next: Video
									</Button>
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
