"use client"

import { ChevronDown, ExternalLink, Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function Home() {
	const [showCookieModal, setShowCookieModal] = useState(true)

	return (
		<div className="min-h-screen bg-white">
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
					<div className="flex items-center space-x-2">
						<div className="flex h-8 w-8 items-center justify-center rounded bg-teal-500">
							<span className="text-lg font-bold text-white">K</span>
						</div>
						<span className="text-xl font-medium text-gray-800">Khan Academy</span>
					</div>

					{/* Right Actions */}
					<div className="flex items-center space-x-4">
						<Button variant="ghost" className="text-blue-600 hover:text-blue-700 font-medium">
							AI for Teachers <ExternalLink className="ml-1 h-4 w-4" />
						</Button>
						<Button variant="ghost" className="text-blue-600 hover:text-blue-700 font-medium">
							Donate <ExternalLink className="ml-1 h-4 w-4" />
						</Button>
						<Button variant="ghost" className="text-gray-700 hover:text-gray-800 font-medium">
							Log in
						</Button>
						<Button className="bg-blue-600 hover:bg-blue-700 font-medium px-6">Sign up</Button>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="mx-auto max-w-7xl px-4 py-12">
				<div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
					{/* Left Side - Illustration and Info */}
					<div className="flex flex-col justify-center space-y-8">
						<div className="relative">
							<Image
								src="https://ext.same-assets.com/3576345726/219755154.png"
								alt="Teacher and student illustration"
								width={500}
								height={400}
								className="w-full max-w-lg rounded-lg"
							/>
						</div>

						<div className="rounded-lg bg-blue-50 p-6 border border-blue-100">
							<h3 className="font-semibold text-gray-800 mb-2">Did you know?</h3>
							<p className="text-gray-600 leading-relaxed">
								Regardless of who you are, mastering even just one more skill on Khan Academy results in learning gains.
							</p>
						</div>
					</div>

					{/* Right Side - Login Form */}
					<div className="flex flex-col justify-center">
						<Card className="w-full max-w-md mx-auto border border-gray-200 shadow-lg">
							<CardHeader className="text-center pb-6">
								<CardTitle className="text-3xl font-semibold text-gray-800">Log in now!</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6 px-8 pb-8">
								{/* Continue with Google - Special styling */}
								<Button
									variant="outline"
									className="w-full h-12 text-base font-medium border-gray-300 hover:bg-gray-50"
								>
									<Image
										src="https://ext.same-assets.com/3576345726/3627415455.svg"
										alt="Google"
										width={20}
										height={20}
										className="mr-3 h-5 w-5"
									/>
									Continue with Google
								</Button>

								{/* Other OAuth Buttons */}
								<div className="grid grid-cols-2 gap-3">
									<Button variant="outline" className="w-full h-11 border-gray-300 hover:bg-gray-50">
										<Image
											src="https://ext.same-assets.com/3576345726/3854438810.svg"
											alt="Clever"
											width={16}
											height={16}
											className="mr-2 h-4 w-4"
										/>
										Clever
									</Button>
									<Button variant="outline" className="w-full h-11 border-gray-300 hover:bg-gray-50">
										<Image
											src="https://ext.same-assets.com/3576345726/74763886.svg"
											alt="Facebook"
											width={16}
											height={16}
											className="mr-2 h-4 w-4"
										/>
										Facebook
									</Button>
									<Button variant="outline" className="w-full h-11 border-gray-300 hover:bg-gray-50">
										<Image
											src="https://ext.same-assets.com/3576345726/3808120640.svg"
											alt="Apple"
											width={16}
											height={16}
											className="mr-2 h-4 w-4"
										/>
										Apple
									</Button>
									<Button variant="outline" className="w-full h-11 border-gray-300 hover:bg-gray-50">
										<Image
											src="https://ext.same-assets.com/3576345726/1521032922.svg"
											alt="Microsoft"
											width={16}
											height={16}
											className="mr-2 h-4 w-4"
										/>
										Microsoft
									</Button>
								</div>

								<div className="relative my-6">
									<div className="absolute inset-0 flex items-center">
										<span className="w-full border-t border-gray-300" />
									</div>
									<div className="relative flex justify-center text-sm uppercase">
										<span className="bg-white px-4 text-gray-500 font-medium">OR LOG IN WITH EMAIL:</span>
									</div>
								</div>

								{/* Email/Password Form */}
								<div className="space-y-5">
									<div>
										<Label htmlFor="email" className="text-sm text-gray-700 font-medium">
											Email or username <span className="text-red-500">*</span>
										</Label>
										<Input
											id="email"
											type="email"
											placeholder="email@example.com"
											className="mt-2 h-11 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>

									<div>
										<Label htmlFor="password" className="text-sm text-gray-700 font-medium">
											Password <span className="text-red-500">*</span>
										</Label>
										<Input
											id="password"
											type="password"
											className="mt-2 h-11 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>

									<div className="text-center pt-2">
										<Button variant="link" className="text-blue-600 hover:text-blue-700 p-0 font-medium">
											Forgot password?
										</Button>
									</div>

									<Link href="/profile/me/courses">
										<Button className="w-full h-12 bg-gray-400 hover:bg-gray-500 text-white font-medium text-base">
											Log in
										</Button>
									</Link>

									<p className="text-xs text-gray-500 text-center leading-relaxed">
										By logging in, you agree to the{" "}
										<button type="button" className="text-blue-600 hover:underline">
											Khan Academy Terms of Service
										</button>{" "}
										and{" "}
										<button type="button" className="text-blue-600 hover:underline">
											Privacy Policy
										</button>
										.
									</p>

									<p className="text-sm text-center text-gray-600 pt-2">
										Need a Khan Academy account?{" "}
										<button type="button" className="text-blue-600 hover:underline font-semibold">
											Sign up today
										</button>
									</p>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>

			{/* Cookie Consent Modal */}
			<Dialog open={showCookieModal} onOpenChange={setShowCookieModal}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="text-lg font-semibold">Use of cookies</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p className="text-sm text-gray-600 leading-relaxed">
							Cookies are small files placed on your device that collect information when you use Khan Academy. Strictly
							necessary cookies are used to make our site work and are required. Other types of cookies are used to
							improve your experience, to analyze how Khan Academy is used, and to market our service.
						</p>
						<div className="flex flex-col space-y-2">
							<Button onClick={() => setShowCookieModal(false)} className="bg-blue-600 hover:bg-blue-700 font-medium">
								Accept All Cookies
							</Button>
							<Button variant="outline" onClick={() => setShowCookieModal(false)} className="font-medium">
								Strictly Necessary Only
							</Button>
							<Button variant="ghost" onClick={() => setShowCookieModal(false)} className="font-medium">
								Cookies Settings
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
