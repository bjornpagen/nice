import Link from "next/link"
import { Button } from "@/components/ui/button"
import { startCase } from "@/lib/utils"
import type { UnitPage_UnitTest } from "./[unit]/page"
import { Section } from "./section"

export function UnitTestSection({ test }: { test: UnitPage_UnitTest }) {
	return (
		<Section>
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
				<div className="flex flex-col">
					<Link href={test.path} className="font-bold text-gray-900 mb-2 text-md hover:underline">
						{startCase(test.title)}
					</Link>

					<p className="text-gray-600 text-xs">Test your understanding of the entire unit!</p>
				</div>
				<Button variant="outline" className="text-blue-600 hover:border-blue-600" asChild>
					<Link href={test.path}>Start Unit Test</Link>
				</Button>
			</div>
		</Section>
	)
}
