import { ClerkProvider } from "@clerk/nextjs"
import { Analytics } from "@vercel/analytics/next"
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
				<Toaster position="top-right" />
				<Analytics />
			</body>
		</html>
	)
}
