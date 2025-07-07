import { cn } from "@/lib/utils"

export function Section({ children, className }: { children: React.ReactNode; className?: string }) {
	return <div className={cn("bg-white border border-gray-200 rounded-xs p-6 mb-2", className)}>{children}</div>
}
