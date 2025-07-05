import { Banner } from "@/components/banner"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { ProfileBanner } from "./profile-banner"
import { Sidebar } from "./sidebar"

// FIXME: remove this in favor of Clerk auth
const uid = "aiden.zepp"

export default async function UserLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-white font-lato">
			<Header />
			<Banner />

			{/* User Profile Banner */}
			<ProfileBanner uid={uid} />

			{/* Main Content */}
			<div className="mx-auto max-w-7xl px-4 py-6 h-screen">
				<div className="grid grid-cols-12 gap-6 h-full">
					<div className="col-span-3">
						<Sidebar />
					</div>

					{/* Main Content Area */}
					<div className="col-span-9">{children}</div>
				</div>
			</div>

			<Footer />
		</div>
	)
}
