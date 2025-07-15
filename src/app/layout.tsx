import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { AppProvider } from "@/components/providers/app-provider"
import "@/styles/globals.css"

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
		<ClerkProvider>
			<html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
				<head>{/* <script crossOrigin="anonymous" src="//unpkg.com/react-scan/dist/auto.global.js" /> */}</head>
				<body suppressHydrationWarning>
					<AppProvider>{children}</AppProvider>
				</body>
			</html>
		</ClerkProvider>
	)
}
