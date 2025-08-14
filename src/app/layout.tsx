import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import * as React from "react"
import { DialogManagerProvider } from "@/components/providers/dialog-manager-provider"
import { UserSyncProvider } from "@/components/UserSyncProvider"
import { Toaster } from "@/components/ui/sonner"
import "@/styles/globals.css"
import "@/styles/variables.css"

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"]
})

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"]
})

export const metadata: Metadata = {
	title: "Nice Academy",
	description: "Nice Academy is a platform for learning and teaching"
}

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
			<head>{/* <script crossOrigin="anonymous" src="//unpkg.com/react-scan/dist/auto.global.js" /> */}</head>
			<body suppressHydrationWarning>
				<React.Suspense>
					<ClerkProvider>
						<UserSyncProvider>
							<DialogManagerProvider>{children}</DialogManagerProvider>
						</UserSyncProvider>
					</ClerkProvider>
				</React.Suspense>
				<footer className="mt-8 border-t bg-white">
					<div className="max-w-7xl mx-auto px-4 py-4">
						<p className="text-xs text-gray-600">
							This site includes content from Khan Academy licensed under{" "}
							<a
								href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
								target="_blank"
								rel="noopener noreferrer"
								className="text-blue-600 hover:underline"
							>
								CC BY-NC-SA 4.0
							</a>
							. See{" "}
							<a href="/attributions" className="text-blue-600 hover:underline">
								Attributions
							</a>{" "}
							for details. Not affiliated with or endorsed by Khan Academy.
						</p>
					</div>
				</footer>
				<Toaster position="top-right" />
			</body>
		</html>
	)
}
