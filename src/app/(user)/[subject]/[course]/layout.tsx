import { Banner } from "@/components/banner"
import { Header } from "@/components/header"

export default function CourseLayout({ children }: { children: React.ReactNode }) {
	// Note: We can't use auth() or currentUser() in non-async components with dynamicIO
	// The Header component will need to handle user info client-side if needed

	return (
		<div className="flex flex-col h-screen bg-white">
			<div className="flex-shrink-0 z-50">
				<Header dark />
				<Banner />
			</div>
			<div className="flex-1 overflow-hidden">{children}</div>
		</div>
	)
}
