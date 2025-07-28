import Image from "next/image"
import Link from "next/link"
import unitTestNotStartedImage from "@/app/(user)/[subject]/[course]/(overview)/components/images/unit-test-not-started.svg"
import { Section } from "@/app/(user)/[subject]/[course]/(overview)/components/section"
import { Button } from "@/components/ui/button"
import type { UnitTest } from "@/lib/types/domain"
import { startCase } from "@/lib/utils"

export function UnitTestSection({ test }: { test: UnitTest }) {
	return (
		<Section className="relative overflow-hidden">
			<div className="flex justify-between items-end gap-6">
				<div className="flex flex-col flex-1">
					<Link href={test.path} className="font-bold text-gray-900 mb-2 text-md hover:underline">
						{startCase(test.title)}
					</Link>
					<p className="text-gray-600 text-xs mb-4">Test your understanding of the entire unit!</p>
					<Button variant="outline" className="text-blue-600 hover:border-blue-600 w-fit" asChild>
						<Link href={test.path}>Start Unit test</Link>
					</Button>
				</div>
				<div className="flex-shrink-0 hidden sm:block relative" style={{ marginBottom: "-2rem" }}>
					<Image src={unitTestNotStartedImage} alt="Unit test mascot" width={280} height={280} />
				</div>
			</div>
		</Section>
	)
}
