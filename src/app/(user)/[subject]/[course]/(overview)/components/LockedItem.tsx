// src/app/(user)/[subject]/[course]/(overview)/components/LockedItem.tsx
import { Lock } from "lucide-react"

export function LockedItem({ title, reason }: { title: string; reason?: string }) {
	return (
		<div className="bg-gray-100 rounded-xs p-2 flex justify-between items-center pr-2 cursor-not-allowed">
			<div className="flex-1">
				<h2 className="text-sm font-semibold text-gray-400">{title}</h2>
				<p className="text-gray-400 text-xs">{reason ?? "Complete previous activities to unlock"}</p>
			</div>
			<Lock className="w-5 h-5 text-gray-400 flex-shrink-0 self-center" />
		</div>
	)
}
