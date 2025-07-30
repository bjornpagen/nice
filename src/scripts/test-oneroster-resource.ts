import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
import { Client } from "@/lib/oneroster"

// The problematic resource that's not getting created
const PROBLEM_RESOURCE = {
	sourcedId: "nice_x2832fbb7463fe65a",
	status: "active",
	title: "Course Challenge",
	vendorResourceId: "nice-academy-x2832fbb7463fe65a",
	vendorId: "superbuilders",
	applicationId: "nice",
	roles: ["primary"],
	importance: "primary" as const,
	metadata: {
		type: "qti",
		subType: "qti-test",
		version: "3.0",
		questionType: "custom",
		language: "en-US",
		url: "https://qti-staging.alpha-1edtech.com/api/assessment-tests/nice_x2832fbb7463fe65a",
		khanId: "x2832fbb7463fe65a",
		khanSlug: "x2832fbb7463fe65a:course-challenge",
		khanTitle: "Course Challenge",
		khanDescription: "",
		path: "/economics-finance-domain/ap-microeconomics/test/x2832fbb7463fe65a:course-challenge",
		khanLessonType: "coursechallenge"
	}
}

async function testResourceCreation() {
	logger.info("=== Testing OneRoster Resource Creation ===")
	logger.info("testing resource", { sourcedId: PROBLEM_RESOURCE.sourcedId })

	// Initialize OneRoster client
	const client = new Client({
		serverUrl: env.TIMEBACK_ONEROSTER_SERVER_URL,
		tokenUrl: env.TIMEBACK_TOKEN_URL,
		clientId: env.TIMEBACK_CLIENT_ID,
		clientSecret: env.TIMEBACK_CLIENT_SECRET
	})

	// Step 1: Check if resource already exists
	logger.info("step 1: checking if resource already exists")
	const existingResult = await errors.try(client.getResource(PROBLEM_RESOURCE.sourcedId))
	if (existingResult.error) {
		logger.error("error checking existing resource", { error: existingResult.error })
		throw existingResult.error
	}

	if (existingResult.data) {
		logger.info("resource already exists", {
			sourcedId: existingResult.data.sourcedId,
			title: existingResult.data.title,
			status: existingResult.data.status
		})
	} else {
		logger.info("resource does not exist yet")
	}

	// Step 2: Try to create the resource
	logger.info("step 2: attempting to create resource")
	const createResult = await errors.try(client.createResource(PROBLEM_RESOURCE))
	if (createResult.error) {
		logger.error("failed to create resource", {
			error: createResult.error,
			resourceId: PROBLEM_RESOURCE.sourcedId
		})
		// Don't throw, let's see if we can fetch it anyway
	} else {
		logger.info("create resource call succeeded", {
			response: createResult.data
		})
	}

	// Step 3: Try to fetch the resource to verify it was created
	logger.info("step 3: fetching resource to verify creation")
	const fetchResult = await errors.try(client.getResource(PROBLEM_RESOURCE.sourcedId))
	if (fetchResult.error) {
		logger.error("failed to fetch resource after creation", {
			error: fetchResult.error
		})
		throw fetchResult.error
	}

	if (fetchResult.data) {
		logger.info("✅ SUCCESS: resource was created and fetched", {
			sourcedId: fetchResult.data.sourcedId,
			title: fetchResult.data.title,
			status: fetchResult.data.status,
			vendorResourceId: fetchResult.data.vendorResourceId
		})
	} else {
		logger.error("❌ FAILURE: resource not found after creation attempt")
	}

	// Step 4: Try updating the resource to see if PUT works
	logger.info("step 4: attempting to update resource via PUT")
	const updateResult = await errors.try(
		client.updateResource(PROBLEM_RESOURCE.sourcedId, {
			...PROBLEM_RESOURCE,
			title: "Course Challenge (Updated)"
		})
	)
	if (updateResult.error) {
		logger.error("failed to update resource", {
			error: updateResult.error
		})
	} else {
		logger.info("update resource call succeeded", {
			response: updateResult.data
		})
	}

	// Step 5: Final fetch to see current state
	logger.info("step 5: final fetch to check current state")
	const finalResult = await errors.try(client.getResource(PROBLEM_RESOURCE.sourcedId))
	if (finalResult.error) {
		logger.error("failed to fetch resource in final check", {
			error: finalResult.error
		})
	} else if (finalResult.data) {
		logger.info("final resource state", {
			sourcedId: finalResult.data.sourcedId,
			title: finalResult.data.title,
			status: finalResult.data.status,
			vendorResourceId: finalResult.data.vendorResourceId,
			hasMetadata: Boolean(finalResult.data.metadata)
		})
	} else {
		logger.error("resource not found in final check")
	}

	logger.info("=== Test Complete ===")
}

// Run the test
const result = await errors.try(testResourceCreation())
if (result.error) {
	logger.error("test failed", { error: result.error })
	process.exit(1)
}

logger.info("test completed successfully")
