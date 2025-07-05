import { Banner } from "@/components/banner"
import { Header } from "@/components/header"

export default function CourseLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-white">
			<div className="sticky top-0 z-50">
				<Header dark />
			</div>
			<Banner />
			{children}
		</div>
	)
}
