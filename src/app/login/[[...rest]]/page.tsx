"use client"

import { useSignIn } from "@clerk/nextjs"
import Image from "next/image"
import * as React from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { dialogKeys, useDialogManager } from "@/hooks/use-dialog-manager"

export default function Home() {
	const { signIn } = useSignIn()
	const { shouldShow, openDialog } = useDialogManager()

	React.useEffect(() => {
		// On component mount, check if the cookie dialog should be shown.
		if (shouldShow(dialogKeys.COOKIE_CONSENT)) {
			openDialog(dialogKeys.COOKIE_CONSENT)
		}
	}, [shouldShow, openDialog])

	const handleTimeBackSignIn = () => {
		signIn?.authenticateWithRedirect({
			strategy: "oauth_custom_timeback",
			redirectUrl: "/sso-callback",
			redirectUrlComplete: "/"
		})
	}

	return (
		<div className="flex flex-col min-h-screen bg-white">
			{/* Use the standardized Header component */}
			<Header />

			{/* Main Content */}
			<main className="flex-1 mx-auto max-w-7xl px-4 py-12">
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
								{/* Continue with TimeBack - The only SSO option */}
								<Button
									variant="outline"
									className="w-full h-12 text-base font-medium border-gray-300 hover:bg-gray-50"
									onClick={handleTimeBackSignIn}
								>
									<span className="mr-2">Continue with</span>
									<Image src="/timeback.png" alt="TimeBack" width={100} height={100} className="h-5 w-auto" />
								</Button>

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
							</CardContent>
						</Card>

						<div className="mt-8 text-center">
							<p className="text-gray-600">
								Don&apos;t have an account?{" "}
								<Button variant="link" className="text-blue-600 hover:text-blue-700 p-0 font-medium">
									Sign up for free!
								</Button>
							</p>
						</div>
					</div>
				</div>
			</main>

			{/* Cookie Consent Modal is now rendered globally by DialogManagerProvider */}
		</div>
	)
}
