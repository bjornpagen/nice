import _ from "lodash"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { UnitTest } from "../[unit]/page"
import { Section } from "./section"

export function UnitTestSection({ unitTest }: { unitTest: UnitTest }) {
	return (
		<Section>
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
				<div className="flex flex-col">
					<Link href={unitTest.path} className="font-bold text-gray-900 mb-2 text-md hover:underline">
						{_.startCase(unitTest.title)}
					</Link>

					<p className="text-gray-600 text-xs">
						Level up on all the skills in this unit and collect up to 0 Mastery points!
					</p>
				</div>
				<Button variant="outline" className="text-blue-600 hover:border-blue-600" asChild>
					<Link href={unitTest.path}>Start Unit Test</Link>
				</Button>
			</div>
		</Section>
	)
}
