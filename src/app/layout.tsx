import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
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
		<html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
			<head />
			<body suppressHydrationWarning>{children}</body>
		</html>
	)
}
