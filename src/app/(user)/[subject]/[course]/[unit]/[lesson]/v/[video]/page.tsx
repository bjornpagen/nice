"use client"

import { ExternalLink } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function IntroductionToMultiplicationVideo() {
	const [activeTab, setActiveTab] = useState<"about" | "transcript">("about")
	const [activeSection, setActiveSection] = useState<"questions" | "tips">("tips")

	return (
		<div className="min-h-screen bg-white">
			{/* Main Content */}
			<div className="flex min-h-screen">
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
										className="w-4 h-4 mr-2"
										width={16}
										height={16}
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
