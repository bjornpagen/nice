import { SignedIn, SignedOut } from "@clerk/nextjs"
import { Menu, Search, Smile } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ExploreDropdown } from "./explore-dropdown"
import { UserDropdown } from "./user-dropdown"

export function Header({
	dark = false,
	nickname,
	className
}: {
	dark?: boolean
	nickname?: string
	className?: string
}) {
	// If nickname is not provided, we should not render the user dropdown at all
	// This indicates a critical issue with user data
	const displayName = nickname
	const displayInitial = nickname ? nickname.charAt(0).toUpperCase() : undefined

	return (
		<header
			className={cn(
				"border-b px-2 sm:px-4 py-3",
				dark ? "bg-blue-950 border-blue-800" : "bg-white border-gray-200",
				className
			)}
		>
			<div className="mx-auto max-w-5xl relative flex items-center">
				{/* Left Section */}
				<div className="flex items-center space-x-2 sm:space-x-4 flex-1">
					{/* Mobile menu button (visible on small screens) */}
					<Button variant="link" className={`p-2 sm:hidden ${dark ? "text-white" : "text-blue-600"}`}>
						<Menu className="h-5 w-5" />
					</Button>

					{/* Explore button (hidden on mobile) */}
					<ExploreDropdown dark={dark} />

					{/* Search - strictly constrained width */}
					<div className="relative w-24 sm:w-32 md:w-40">
						<Search
							className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
								dark ? "text-white" : "text-blue-600"
							}`}
						/>
						<Input
							type="search"
							placeholder="Search"
							className={`pl-10 pr-4 py-2 w-full text-sm ${
								dark
									? "border-white text-white placeholder:text-white focus:border-white focus:ring-white"
									: "border-blue-200 placeholder:text-blue-600 focus:border-blue-600 focus:ring-blue-600"
							}`}
						/>
					</div>
				</div>

				{/* Centered Logo */}
				<Link href="/" className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
					<Smile className={`h-6 w-6 ${dark ? "text-white" : "text-blue-600"}`} />
					<span className={`text-lg font-bold ${dark ? "text-white" : "text-gray-800"}`}>Nice Academy</span>
				</Link>

				{/* Right Section */}
				<div className="flex items-center space-x-2 sm:space-x-4 flex-1 justify-end">
					{/* User Dropdown for signed in users */}
					<SignedIn>
						{displayName && displayInitial ? (
							<UserDropdown displayName={displayName} displayInitial={displayInitial} dark={dark} />
						) : (
							<span className="text-red-500">Error: Missing user data</span>
						)}
					</SignedIn>

					{/* Login/Signup buttons for signed out users */}
					<SignedOut>
						<Button asChild variant="link" className={`px-4 ${dark ? "text-white" : "text-blue-600"}`}>
							<Link href="/login">Log in</Link>
						</Button>
						<Button asChild className="bg-blue-600 hover:bg-blue-700 font-medium px-6">
							<Link href="/login">Sign up</Link>
						</Button>
					</SignedOut>
				</div>
			</div>
		</header>
	)
}
