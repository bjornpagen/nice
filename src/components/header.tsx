import { ChevronDown, Menu, Search, Smile } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Header({ dark = false }: { dark?: boolean }) {
	return (
		<header
			className={`border-b px-2 sm:px-4 py-3 ${dark ? "bg-blue-950 border-blue-800" : "bg-white border-gray-200"}`}
		>
			<div className="mx-auto max-w-5xl relative flex items-center">
				{/* Left Section */}
				<div className="flex items-center space-x-2 sm:space-x-4 flex-1">
					{/* Mobile menu button (visible on small screens) */}
					<Button variant="link" className={`p-2 sm:hidden ${dark ? "text-white" : "text-blue-600"}`}>
						<Menu className="h-5 w-5" />
					</Button>

					{/* Explore button (hidden on mobile) */}
					<Button
						variant="ghost"
						className={`hidden lg:flex items-center space-x-1 p-2 ${dark ? "text-white" : "text-blue-600"}`}
					>
						<span className="text-sm font-medium">Explore</span>
						<ChevronDown className="h-4 w-4" />
					</Button>

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
					{/* AI for Teachers (hidden on mobile and small screens) */}
					<Button
						variant="link"
						className={`hidden lg:flex items-center space-x-1 p-2 ${dark ? "text-white" : "text-blue-600"}`}
					>
						<span className="text-sm font-medium">AI for Teachers</span>
					</Button>

					{/* Donate button (hidden on mobile) */}
					<Button
						variant="link"
						className={`hidden md:flex items-center space-x-1 p-2 ${dark ? "text-white" : "text-blue-600"}`}
					>
						<span className="text-sm font-medium">Donate</span>
					</Button>

					{/* User Dropdown */}
					<Button
						variant="ghost"
						className={`flex items-center space-x-1 p-2 ${dark ? "text-white" : "text-blue-600"}`}
					>
						<span className="text-sm font-medium hidden sm:inline">User</span>
						<span className="text-sm font-medium sm:hidden">U</span>
						<ChevronDown className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</header>
	)
}
