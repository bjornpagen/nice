import { SignedIn } from "@clerk/nextjs"
import React from "react"
import { Banner } from "@/components/banner"

export default function MainLayout({ children }: { children: React.ReactNode }) {
	return (
		<div id="main-layout" className="flex flex-col">
			<div className="sticky top-0 w-full z-50 h-16" />

			<div id="main-layout-content" className="flex-1 flex flex-col">
				<React.Suspense>
					<SignedIn>
						<Banner />
					</SignedIn>
				</React.Suspense>

				<div className="flex-1">{children}</div>
			</div>
		</div>
	)
}
