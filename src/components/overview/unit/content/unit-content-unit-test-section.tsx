import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { UnitContentData } from "./unit-content"
import { UnitContentSection } from "./unit-content-section"

export function UnitContentUnitTestSection({
	index,
	unitTest
}: {
	index: number
	unitTest: UnitContentData["resources"][number]
}) {
	if (unitTest.type !== "UnitTest") {
		return undefined
	}

	void index
	return (
		<UnitContentSection>
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
				<div className="flex flex-col">
					<Link href={unitTest.path} className="font-medium text-gray-900 mb-2 text-md hover:underline capitalize">
						{unitTest.title}
					</Link>

					<p className="text-gray-600 text-xs">Test your understanding of the entire unit!</p>
				</div>
				<Button variant="outline" className="text-blue-600 hover:border-blue-600" asChild>
					<Link href={unitTest.path}>Start Unit Test</Link>
				</Button>
			</div>
		</UnitContentSection>
	)
}
