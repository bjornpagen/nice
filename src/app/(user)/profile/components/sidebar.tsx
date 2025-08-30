"use client"

import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import { assertNoEncodedColons, cn, normalizeString } from "@/lib/utils"

type SidebarItem = {
	name: string
	href: string
	disabled: boolean
	external: boolean
}

const stuff: SidebarItem[] = [
	{
		name: "Courses",
		href: "me/courses",
		disabled: false,
		external: false
	}
]

const account: SidebarItem[] = [
	{
		name: "Progress",
		href: "https://timeback.timeback.com/app/learning-metrics",
		disabled: false,
		external: true
	},
	{
		name: "Profile",
		href: "me",
		disabled: true,
		external: false
	},
	{
		name: "Teachers",
		href: "me/teachers",
		disabled: true,
		external: false
	}
]

function highlight(pathname: string, href: string) {
	return pathname.endsWith(href)
		? "block w-full text-left px-3 py-2 text-blue-600 bg-blue-50 rounded font-medium border-l-4 border-blue-600"
		: "block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
}

export function Sidebar() {
	const rawPathname = usePathname()
	const pathname = normalizeString(rawPathname)
	assertNoEncodedColons(pathname, "profile-sidebar pathname")

	const { user, isLoaded } = useUser()

	let canShowEnrollTab = false
	if (isLoaded && user) {
		const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
		canShowEnrollTab = parsed.success && parsed.data.roles.some((r) => r.role !== "student")
	}

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
										{item.external ? (
											<a href={item.href} target="_blank" rel="noopener noreferrer">
												{item.name}
											</a>
										) : (
											<Link href={`/profile/${item.href}`}>{item.name}</Link>
										)}
									</Button>
								)}
							</li>
						))}
						{canShowEnrollTab && (
							<li>
								<Button asChild variant="ghost" className={highlight(pathname, "me/enrollments")}>
									<Link href="/profile/me/enrollments">Enroll Students</Link>
								</Button>
							</li>
						)}
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
										{item.external ? (
											<a href={item.href} target="_blank" rel="noopener noreferrer">
												{item.name}
											</a>
										) : (
											<Link href={`/profile/${item.href}`}>{item.name}</Link>
										)}
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
