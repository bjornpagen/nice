"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const stuff = [
	{
		name: "Courses",
		href: "me/courses",
		disabled: false
	}
] as const

const account = [
	{
		name: "Progress",
		href: "me/progress",
		disabled: false
	},
	{
		name: "Profile",
		href: "me",
		disabled: true
	},
	{
		name: "Teachers",
		href: "me/teachers",
		disabled: true
	}
] as const

function highlight(pathname: string, href: string) {
	return pathname.endsWith(href)
		? "block w-full text-left px-3 py-2 text-blue-600 bg-blue-50 rounded font-medium border-l-4 border-blue-600"
		: "block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
}

export function Sidebar() {
	const pathname = usePathname()

	return (
		<div className="bg-white rounded-lg border border-gray-200 p-4">
			<div className="space-y-6">
				<div>
					<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">MY STUFF</h3>
					<ul className="space-y-1">
						{stuff.map((item) => (
							<li key={item.name}>
								{item.disabled ? (
									<Button
										variant="ghost"
										className={cn(highlight(pathname, item.href), "opacity-50 cursor-not-allowed")}
										disabled
									>
										{item.name}
									</Button>
								) : (
									<Button asChild variant="ghost" className={highlight(pathname, item.href)}>
										<Link href={`/profile/${item.href}`}>{item.name}</Link>
									</Button>
								)}
							</li>
						))}
					</ul>
				</div>
				<div>
					<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">MY ACCOUNT</h3>
					<ul className="space-y-1">
						{account.map((item) => (
							<li key={item.name}>
								{item.disabled ? (
									<Button
										variant="ghost"
										className={cn(highlight(pathname, item.href), "opacity-50 cursor-not-allowed")}
										disabled
									>
										{item.name}
									</Button>
								) : (
									<Button asChild variant="ghost" className={highlight(pathname, item.href)}>
										<Link href={`/profile/${item.href}`}>{item.name}</Link>
									</Button>
								)}
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	)
}
