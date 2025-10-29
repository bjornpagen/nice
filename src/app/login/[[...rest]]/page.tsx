"use client"

import { SignIn, useSignIn } from "@clerk/nextjs"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import * as React from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { dialogKeys, useDialogManager } from "@/hooks/use-dialog-manager"

export default function Home() {
	const { signIn } = useSignIn()
	const { shouldShow, openDialog } = useDialogManager()
	const searchParams = useSearchParams()

	const hasClerkTicket = React.useMemo(() => searchParams.has("__clerk_ticket"), [searchParams])

	const resolveRedirectDestination = React.useCallback(() => {
		const requested = searchParams.get("redirect_url")
		if (!requested) {
			return "/profile/me/courses"
		}
		if (!requested.startsWith("/") || requested.startsWith("//")) {
			return "/profile/me/courses"
		}
		return requested
	}, [searchParams])

	React.useEffect(() => {
		// On component mount, check if the cookie dialog should be shown.
		if (shouldShow(dialogKeys.COOKIE_CONSENT)) {
			openDialog(dialogKeys.COOKIE_CONSENT)
		}
	}, [shouldShow, openDialog])

	const handleTimeBackSignIn = React.useCallback(() => {
		signIn?.authenticateWithRedirect({
			strategy: "oauth_custom_timeback",
			redirectUrl: "/sso-callback",
			redirectUrlComplete: resolveRedirectDestination()
		})
	}, [resolveRedirectDestination, signIn])

	React.useEffect(() => {
		if (searchParams.get("auto") === "timeback") {
			handleTimeBackSignIn()
		}
	}, [handleTimeBackSignIn, searchParams])

	if (hasClerkTicket) {
		// When arriving with a Clerk sign-in/actor ticket, render the SignIn component so Clerk can consume it
		return (
			<div className="flex min-h-screen items-center justify-center py-16">
				<SignIn afterSignInUrl={resolveRedirectDestination()} />
			</div>
		)
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
								Regardless of who you are, mastering even just one more skill on Nice Academy results in learning gains.
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
									className="w-full h-12 text-base font-medium border-gray-300 hover:bg-gray-50 hover:cursor-pointer"
									onClick={handleTimeBackSignIn}
								>
									<span className="mr-2">Continue with</span>
									<Image src="/timeback.png" alt="TimeBack" width={100} height={100} className="h-5 w-auto" />
								</Button>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>

			{/* Cookie Consent Modal is now rendered globally by DialogManagerProvider */}
		</div>
	)
}
