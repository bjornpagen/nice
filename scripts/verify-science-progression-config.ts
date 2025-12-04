/**
 * Verification script for SCIENCE_COURSE_SEQUENCE configuration.
 *
 * This script validates that all hardcoded challengeIds in the course progression
 * configuration actually exist in OneRoster and have the correct metadata.
 *
 * Run with: bun run scripts/verify-science-progression-config.ts
 */

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { SCIENCE_COURSE_SEQUENCE } from "@/lib/constants/course-mapping"
import { getResource } from "@/lib/oneroster/redis/api"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"

async function main() {
	logger.info("starting science progression config verification", {
		courseCount: SCIENCE_COURSE_SEQUENCE.length
	})

	let hasErrors = false

	for (const config of SCIENCE_COURSE_SEQUENCE) {
		// Skip verification for terminal courses (no challengeId)
		if (!config.challengeId) {
			logger.info("skipping terminal course", { title: config.title, courseId: config.courseId })
			continue
		}

		logger.info("verifying course challenge", {
			title: config.title,
			courseId: config.courseId,
			challengeId: config.challengeId
		})

		// Fetch the resource from OneRoster
		const resourceResult = await errors.try(getResource(config.challengeId))
		if (resourceResult.error) {
			logger.error("challenge resource not found", {
				error: resourceResult.error,
				title: config.title,
				challengeId: config.challengeId
			})
			hasErrors = true
			continue
		}

		const resource = resourceResult.data
		if (!resource) {
			logger.error("challenge resource is null", {
				title: config.title,
				challengeId: config.challengeId
			})
			hasErrors = true
			continue
		}

		// Validate metadata schema
		const metadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
		if (!metadataResult.success) {
			logger.error("invalid resource metadata", {
				error: metadataResult.error,
				title: config.title,
				challengeId: config.challengeId,
				metadata: resource.metadata
			})
			hasErrors = true
			continue
		}

		const metadata = metadataResult.data

		// Verify it's the correct activity type (should be a CourseChallenge)
		if (metadata.khanActivityType !== "CourseChallenge") {
			logger.warn("unexpected activity type", {
				title: config.title,
				challengeId: config.challengeId,
				expectedType: "CourseChallenge",
				actualType: metadata.khanActivityType
			})
		}

		logger.info("verified challenge resource", {
			title: config.title,
			challengeId: config.challengeId,
			resourceTitle: resource.title,
			activityType: metadata.khanActivityType
		})
	}

	if (hasErrors) {
		logger.error("verification failed - some challenges are missing or invalid")
		process.exit(1)
	}

	logger.info("verification complete - all challenges valid", {
		verifiedCount: SCIENCE_COURSE_SEQUENCE.filter((c) => c.challengeId !== null).length,
		terminalCount: SCIENCE_COURSE_SEQUENCE.filter((c) => c.challengeId === null).length
	})
}

const result = await errors.try(main())
if (result.error) {
	logger.error("verification script failed", { error: result.error })
	process.exit(1)
}
