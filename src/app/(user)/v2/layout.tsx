import { SignedIn } from "@clerk/nextjs"
import { Banner } from "@/components/banner"

export default function MainLayout({ children }: { children: React.ReactNode }) {
	return (
		<div id="main-layout">
			{/* <Header dark className="fixed w-full z-50" /> */}

			<div id="main-layout-content" className="pt-16">
				<SignedIn>
					<Banner />
				</SignedIn>

				{children}
			</div>
		</div>
	)
}
