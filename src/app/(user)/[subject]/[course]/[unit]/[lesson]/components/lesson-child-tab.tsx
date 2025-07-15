"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ActivityIcon } from "@/components/icons/activity"
import type { LessonChild } from "@/lib/types/structure"

function getVariant(child: Pick<LessonChild, "type">) {
	switch (child.type) {
		case "Exercise":
			return "exercise"
		case "Video":
			return "video"
		case "Article":
			return "article"
		default:
			return "exercise"
	}
}

export function LessonChildTab({ child }: { child: LessonChild }) {
	const variant = getVariant(child)

	const pathname = usePathname()
	if (pathname === child.path) {
		return (
			<div className="bg-blue-100 border border-blue-200 border-l-4 border-l-blue-600 px-4 py-6 shadow-sm">
				<Link href={child.path} className="w-full flex items-center gap-3">
					<ActivityIcon variant={variant} color="bg-blue-100" className="w-6 h-6" />
					<div className="flex flex-col">
						<p className="text-base text-blue-800">{child.title}</p>
						{variant === "exercise" && <p className="text-xs text-gray-500">Not started</p>}
					</div>
				</Link>
			</div>
		)
	}

	return (
		<div className="px-4 py-6 border-t border-b border-gray-200 hover:bg-white hover:shadow-sm transition-all">
			<Link href={child.path} className="w-full flex items-center gap-3">
				<ActivityIcon variant={variant} className="w-6 h-6" />
				<div className="flex flex-col">
					<p className="text-base text-gray-800">{child.title}</p>
					{variant === "exercise" && <p className="text-xs text-gray-500">Not started</p>}
				</div>
			</Link>
		</div>
	)
}
