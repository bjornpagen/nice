import { SignedIn } from "@clerk/nextjs"
import React from "react"
import { Banner } from "@/components/banner"

export default function MainLayout({ children }: { children: React.ReactNode }) {
	return (
		<div id="main-layout" className="min-h-screen flex flex-col">
			{/* <Header dark className="fixed w-full z-50" /> */}

			<div id="main-layout-content" className="pt-16 flex-1 flex flex-col">
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
