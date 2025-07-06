"use client"

import { useClerk } from "@clerk/nextjs"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

interface UserDropdownProps {
	displayName: string
	displayInitial: string
	dark: boolean
}

export function UserDropdown({ displayName, displayInitial, dark }: UserDropdownProps) {
	const router = useRouter()
	const { signOut } = useClerk()

	const handleLogout = async () => {
		// Sign out from Clerk and redirect to login
		await signOut()
		router.push("/login")
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className={`flex items-center space-x-1 p-2 ${dark ? "text-white" : "text-blue-600"}`}>
					<span className="text-sm font-medium hidden sm:inline">{displayName}</span>
					<span className="text-sm font-medium sm:hidden">{displayInitial}</span>
					<ChevronDown className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64 p-0">
				{/* Notifications */}
				<DropdownMenuItem className="px-4 py-3 cursor-pointer">
					<span className="text-base">Notifications</span>
					<ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
				</DropdownMenuItem>

				<DropdownMenuSeparator className="my-0" />

				{/* Menu Items */}
				<DropdownMenuItem className="px-4 py-3 cursor-pointer" onClick={() => router.push("/profile/me/courses")}>
					<span className="text-base text-blue-600">Learner home</span>
				</DropdownMenuItem>

				<DropdownMenuItem className="px-4 py-3 cursor-pointer">
					<span className="text-base text-blue-600">Settings</span>
				</DropdownMenuItem>

				<DropdownMenuItem className="px-4 py-3 cursor-pointer">
					<span className="text-base text-blue-600">Help</span>
				</DropdownMenuItem>

				<DropdownMenuItem className="px-4 py-3 cursor-pointer" onClick={handleLogout}>
					<span className="text-base text-blue-600">Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
