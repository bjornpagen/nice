#!/usr/bin/env bun
import { inngest } from "@/inngest/client"
import { HARDCODED_MATH_COURSE_IDS } from "@/lib/constants/course-mapping"

async function main() {
	console.log("Sending qti/assembly.items.ready event for math courses:", HARDCODED_MATH_COURSE_IDS)

	const result = await inngest.send({
		name: "qti/assembly.items.ready",
		data: {
			courseSlugs: [...HARDCODED_MATH_COURSE_IDS]
		}
	})

	console.log("Event sent successfully:", result)
}

main().catch(console.error)
