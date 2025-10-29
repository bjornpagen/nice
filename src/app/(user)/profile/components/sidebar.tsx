"use client"

import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { assertNoEncodedColons, cn, normalizeString } from "@/lib/utils"

type SidebarItem = {
	name: string
	href: string
	disabled: boolean
	external: boolean
}

const baseStuff: SidebarItem[] = [
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
	const { user, isLoaded } = useUser()
	const rawPathname = usePathname()
	const pathname = normalizeString(rawPathname)
	assertNoEncodedColons(pathname, "profile-sidebar pathname")

	// Determine if user belongs to superbuilders domain
	let primaryEmail: string | undefined
	if (isLoaded && user) {
		const emailEntry = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
		if (emailEntry && typeof emailEntry.emailAddress === "string") {
			primaryEmail = emailEntry.emailAddress
		}
	}
	const isSuperbuilders = Boolean(primaryEmail?.endsWith("@superbuilders.school"))


	// Determine roles from Clerk publicMetadata
	let rolesNormalized: string[] = []
	if (isLoaded && user) {
		const pm: any = user.publicMetadata || {}
		if (Array.isArray(pm.roles)) {
			rolesNormalized = pm.roles
				.map((r: any) => (typeof r === "string" ? r : (r?.role ?? r?.roleType ?? "")))
				.map((r: string) => r.toLowerCase())
				.filter((r: string) => r.length > 0)
		} else if (typeof pm.role === "string") {
			rolesNormalized = [pm.role.toLowerCase()]
		}
	}
	const hasNonStudentRole = rolesNormalized.some((r) => r !== "student")

	// Admin section (visible only for non-student roles)
	const admin: SidebarItem[] = hasNonStudentRole
		? [
			{ name: "Course Builder", href: "course-builder", disabled: false, external: false },
			{ name: "Metrics", href: "profile/me/metrics", disabled: false, external: false },
			{ name: "Students", href: "profile/me/students", disabled: false, external: false }
		]
		: []

	// Development section removed (no entries)
	const development: SidebarItem[] = []

	return (
		<div className="bg-white rounded-lg border border-gray-200 p-4">
			<div className="space-y-6">
				<div>
					<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">MY STUFF</h3>
					<ul className="space-y-1">
						{baseStuff.map((item) => (
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
				{admin.length > 0 && (
					<div>
						<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">ADMIN</h3>
						<ul className="space-y-1">
							{admin.map((item) => (
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
												<Link href={`/${item.href}`}>{item.name}</Link>
											)}
										</Button>
									)}
								</li>
							))}
						</ul>
					</div>
				)}
				{development.length > 0 && (
					<div>
						<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">DEVELOPMENT</h3>
						<ul className="space-y-1">
							{development.map((item) => (
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
				)}
			</div>
		</div>
	)
}
