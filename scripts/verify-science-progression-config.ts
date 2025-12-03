import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import { SCIENCE_COURSE_SEQUENCE } from "@/lib/powerpath-progress"
import { getResource } from "@/lib/oneroster/redis/api"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"

/**
 * Verification script for the SCIENCE_COURSE_SEQUENCE configuration.
 * 
 * This script validates that all hardcoded Course Challenge IDs in the sequence:
 * 1. Exist as valid OneRoster resources
 * 2. Have valid metadata
 * 3. Are of type "CourseChallenge"
 * 
 * Run with: bun run scripts/verify-science-progression-config.ts
 */

async function main() {
	logger.info("starting science course sequence verification", {
		courseCount: SCIENCE_COURSE_SEQUENCE.length
	})

	let failureCount = 0

	for (const config of SCIENCE_COURSE_SEQUENCE) {
		logger.info("verifying course config", {
			title: config.title,
			courseId: config.courseId,
			challengeId: config.challengeId
		})

		// Skip terminal courses without a challengeId
		if (!config.challengeId) {
			logger.info("skipping terminal course (no challengeId)", { title: config.title })
			continue
		}

		const resourceResult = await errors.try(getResource(config.challengeId))
		if (resourceResult.error) {
			logger.error("resource fetch failed", {
				title: config.title,
				challengeId: config.challengeId,
				error: resourceResult.error
			})
			failureCount++
			continue
		}

		const resource = resourceResult.data
		if (!resource) {
			logger.error("resource not found in oneroster", {
				title: config.title,
				challengeId: config.challengeId
			})
			failureCount++
			continue
		}

		// Validate metadata structure
		const metaResult = ResourceMetadataSchema.safeParse(resource.metadata)
		if (!metaResult.success) {
			logger.error("invalid resource metadata", {
				title: config.title,
				challengeId: config.challengeId,
				error: metaResult.error
			})
			failureCount++
			continue
		}

		// Verify activity type is CourseChallenge
		if (metaResult.data.khanActivityType !== "CourseChallenge") {
			logger.error("incorrect activity type", {
				title: config.title,
				challengeId: config.challengeId,
				expected: "CourseChallenge",
				actual: metaResult.data.khanActivityType
			})
			failureCount++
			continue
		}

		logger.info("config verified successfully", {
			title: config.title,
			resourceTitle: resource.title,
			activityType: metaResult.data.khanActivityType
		})
	}

	if (failureCount > 0) {
		logger.error("verification failed", { failureCount, totalCourses: SCIENCE_COURSE_SEQUENCE.length })
		return false
	}

	logger.info("all configurations verified successfully", { totalCourses: SCIENCE_COURSE_SEQUENCE.length })
	return true
}

const result = await errors.try(main())
if (result.error) {
	logger.error("verification script failed", { error: result.error })
	process.exit(1)
}

if (!result.data) {
	process.exit(1)
}

process.exit(0)

